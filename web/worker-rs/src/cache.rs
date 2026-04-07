use worker::{Env, kv::KvStore};

use crate::{
    market::{MarketClient, OceanFeeEstimate, OceanTiming, fetch_ocean_fee_estimate},
    types::{CacheMode, CalculatorWarning, MarketSnapshot, WarningCode},
};

const CACHE_BINDING: &str = "HASHPOWER_CACHE";
const CACHE_KEY: &str = "hashpower-calculator:v1";
const FEE_CACHE_KEY: &str = "hashpower-calculator:ocean-fees:v1";
const FRESH_SECONDS: u32 = 120;
const EXPIRATION_SECONDS: u64 = 300;
const OCEAN_TIMING_FRESH_SECONDS: u32 = 900;
const FEE_FRESH_SECONDS: u32 = 3_600;
const FEE_EXPIRATION_SECONDS: u64 = 21_600;

pub struct MarketCache {
    kv: Option<KvStore>,
    now: u32,
}

pub struct MarketCacheResult {
    pub market: MarketSnapshot,
    pub stale: bool,
    pub cache_mode: CacheMode,
    pub warnings: Vec<CalculatorWarning>,
}

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
struct CachedMarketSnapshot {
    market: MarketSnapshot,
    ocean_timing_fetched_at: Option<u32>,
}

#[derive(serde::Deserialize)]
#[serde(untagged)]
enum CachedMarketSnapshotValue {
    Current(CachedMarketSnapshot),
    Legacy(MarketSnapshot),
}

struct CachedOceanTiming {
    timing: OceanTiming,
    fetched_at: u32,
}

impl MarketCache {
    pub fn from_env(env: &Env, now: u32) -> Self {
        Self {
            kv: env.kv(CACHE_BINDING).ok(),
            now,
        }
    }

    pub async fn market(&self) -> Result<MarketCacheResult, String> {
        let cached = self.read().await;

        if let Some(cached) = cached.as_ref()
            && self.is_fresh(cached)
        {
            return Ok(MarketCacheResult {
                market: cached.market.clone(),
                stale: false,
                cache_mode: CacheMode::KvFresh,
                warnings: Vec::new(),
            });
        }

        let ocean_fee_estimate = self.ocean_fee_estimate().await;
        let cached_ocean_timing = cached
            .as_ref()
            .and_then(|cached| self.fresh_ocean_timing(cached));
        let cached_ocean_timing_fetched_at =
            cached_ocean_timing.as_ref().map(|timing| timing.fetched_at);

        match MarketClient::new(self.now)
            .fetch(
                ocean_fee_estimate,
                cached_ocean_timing.map(|timing| timing.timing),
            )
            .await
        {
            Ok(market) => {
                self.return_refreshed(market, cached_ocean_timing_fetched_at)
                    .await
            }
            Err(error) => self.return_stale(cached, error),
        }
    }

    async fn return_refreshed(
        &self,
        market: MarketSnapshot,
        cached_ocean_timing_fetched_at: Option<u32>,
    ) -> Result<MarketCacheResult, String> {
        let cached_market = CachedMarketSnapshot {
            ocean_timing_fetched_at: cached_ocean_timing_fetched_at
                .or_else(|| market_has_ocean_timing(&market).then_some(self.now)),
            market: market.clone(),
        };

        if let Some(kv) = self.kv.as_ref() {
            let write_result = match kv.put(CACHE_KEY, &cached_market) {
                Ok(builder) => builder
                    .expiration_ttl(EXPIRATION_SECONDS)
                    .execute()
                    .await
                    .map_err(|error| error.to_string()),
                Err(error) => Err(error.to_string()),
            };

            if let Err(error) = write_result {
                return Ok(MarketCacheResult {
                    market,
                    stale: false,
                    cache_mode: CacheMode::KvWriteFailed,
                    warnings: vec![CalculatorWarning {
                        code: WarningCode::CacheWriteFailed,
                        message: format!(
                            "Live market data was refreshed, but writing it to KV cache failed: {error}"
                        ),
                    }],
                });
            }

            return Ok(MarketCacheResult {
                market,
                stale: false,
                cache_mode: CacheMode::KvRefreshed,
                warnings: Vec::new(),
            });
        }

        Ok(MarketCacheResult {
            market,
            stale: false,
            cache_mode: CacheMode::Memoryless,
            warnings: vec![CalculatorWarning {
                code: WarningCode::MemorylessCache,
                message: "KV cache binding is unavailable, so live market data was fetched without persistent caching.".to_string(),
            }],
        })
    }

    fn return_stale(
        &self,
        cached: Option<CachedMarketSnapshot>,
        error: String,
    ) -> Result<MarketCacheResult, String> {
        let Some(cached) = cached else {
            return Err(error);
        };

        Ok(MarketCacheResult {
            market: cached.market,
            stale: true,
            cache_mode: CacheMode::KvStale,
            warnings: vec![CalculatorWarning {
                code: WarningCode::StaleMarketData,
                message:
                    "Live market fetch failed, so this estimate is using stale cached market data."
                        .to_string(),
            }],
        })
    }

    async fn read(&self) -> Option<CachedMarketSnapshot> {
        let kv = self.kv.as_ref()?;
        kv.get(CACHE_KEY)
            .json::<CachedMarketSnapshotValue>()
            .await
            .ok()
            .flatten()
            .map(CachedMarketSnapshot::from)
    }

    async fn ocean_fee_estimate(&self) -> Option<OceanFeeEstimate> {
        let cached = self.read_ocean_fee_estimate().await;

        if let Some(estimate) = cached.as_ref()
            && self.is_fee_estimate_fresh(estimate)
        {
            return cached;
        }

        match fetch_ocean_fee_estimate(self.now).await {
            Ok(estimate) => {
                self.write_ocean_fee_estimate(&estimate).await;
                Some(estimate)
            }
            Err(_) => cached,
        }
    }

    async fn read_ocean_fee_estimate(&self) -> Option<OceanFeeEstimate> {
        let kv = self.kv.as_ref()?;
        kv.get(FEE_CACHE_KEY)
            .json::<OceanFeeEstimate>()
            .await
            .ok()
            .flatten()
    }

    async fn write_ocean_fee_estimate(&self, estimate: &OceanFeeEstimate) {
        let Some(kv) = self.kv.as_ref() else {
            return;
        };

        let Ok(builder) = kv.put(FEE_CACHE_KEY, estimate) else {
            return;
        };
        let builder = builder.expiration_ttl(FEE_EXPIRATION_SECONDS);

        let _ = builder.execute().await;
    }

    fn is_fresh(&self, cached: &CachedMarketSnapshot) -> bool {
        self.now.saturating_sub(cached.market.fetched_at) < FRESH_SECONDS
    }

    fn fresh_ocean_timing(&self, cached: &CachedMarketSnapshot) -> Option<CachedOceanTiming> {
        if !self.is_ocean_timing_fresh(cached) {
            return None;
        }

        Some(CachedOceanTiming {
            timing: OceanTiming {
                hashrate_eh: cached.market.ocean_hashrate_eh?,
                average_time_to_block_hours: cached.market.ocean_average_time_to_block_hours?,
            },
            fetched_at: cached.ocean_timing_fetched_at?,
        })
    }

    fn is_ocean_timing_fresh(&self, cached: &CachedMarketSnapshot) -> bool {
        let Some(fetched_at) = cached.ocean_timing_fetched_at else {
            return false;
        };

        self.now.saturating_sub(fetched_at) < OCEAN_TIMING_FRESH_SECONDS
    }

    fn is_fee_estimate_fresh(&self, estimate: &OceanFeeEstimate) -> bool {
        self.now.saturating_sub(estimate.fetched_at) < FEE_FRESH_SECONDS
    }
}

impl From<CachedMarketSnapshotValue> for CachedMarketSnapshot {
    fn from(value: CachedMarketSnapshotValue) -> Self {
        match value {
            CachedMarketSnapshotValue::Current(cached) => cached,
            CachedMarketSnapshotValue::Legacy(market) => {
                let ocean_timing_fetched_at =
                    market_has_ocean_timing(&market).then_some(market.fetched_at);

                Self {
                    market,
                    ocean_timing_fetched_at,
                }
            }
        }
    }
}

fn market_has_ocean_timing(market: &MarketSnapshot) -> bool {
    market.ocean_hashrate_eh.is_some() && market.ocean_average_time_to_block_hours.is_some()
}
