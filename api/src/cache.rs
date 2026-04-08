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
            return Ok(MarketCacheResult::fresh(cached.market.clone()));
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

        let Some(write_result) = self.write_market(&cached_market).await else {
            return Ok(MarketCacheResult::memoryless(market));
        };

        match write_result {
            Ok(()) => Ok(MarketCacheResult::refreshed(market)),
            Err(error) => Ok(MarketCacheResult::write_failed(market, error)),
        }
    }

    fn return_stale(
        &self,
        cached: Option<CachedMarketSnapshot>,
        error: String,
    ) -> Result<MarketCacheResult, String> {
        let Some(cached) = cached else {
            return Err(error);
        };

        Ok(MarketCacheResult::stale(cached.market))
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

    async fn write_market(
        &self,
        cached_market: &CachedMarketSnapshot,
    ) -> Option<Result<(), String>> {
        let kv = self.kv.as_ref()?;

        Some(match kv.put(CACHE_KEY, cached_market) {
            Ok(builder) => builder
                .expiration_ttl(EXPIRATION_SECONDS)
                .execute()
                .await
                .map_err(|error| error.to_string()),
            Err(error) => Err(error.to_string()),
        })
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

impl MarketCacheResult {
    fn fresh(market: MarketSnapshot) -> Self {
        Self {
            market,
            stale: false,
            cache_mode: CacheMode::KvFresh,
            warnings: Vec::new(),
        }
    }

    fn refreshed(market: MarketSnapshot) -> Self {
        Self {
            market,
            stale: false,
            cache_mode: CacheMode::KvRefreshed,
            warnings: Vec::new(),
        }
    }

    fn write_failed(market: MarketSnapshot, error: String) -> Self {
        Self {
            market,
            stale: false,
            cache_mode: CacheMode::KvWriteFailed,
            warnings: vec![CalculatorWarning {
                code: WarningCode::CacheWriteFailed,
                message: format!(
                    "Live market data was refreshed, but writing it to KV cache failed: {error}"
                ),
            }],
        }
    }

    fn memoryless(market: MarketSnapshot) -> Self {
        Self {
            market,
            stale: false,
            cache_mode: CacheMode::Memoryless,
            warnings: vec![CalculatorWarning {
                code: WarningCode::MemorylessCache,
                message: "KV cache binding is unavailable, so live market data was fetched without persistent caching.".to_string(),
            }],
        }
    }

    fn stale(market: MarketSnapshot) -> Self {
        Self {
            market,
            stale: true,
            cache_mode: CacheMode::KvStale,
            warnings: vec![CalculatorWarning {
                code: WarningCode::StaleMarketData,
                message:
                    "Live market fetch failed, so this estimate is using stale cached market data."
                        .to_string(),
            }],
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    fn market_snapshot() -> MarketSnapshot {
        MarketSnapshot {
            best_ask_sats_per_eh_day: 44_981_000.0,
            last_avg_sats_per_eh_day: 47_995_796.0,
            available_hashrate_ph: 1_000.0,
            top_ask_hashrate_ph: Some(10.0),
            top_ask_sats_per_eh_day: Some(44_981_000.0),
            default_price_sats_per_eh_day: 44_981_000.0,
            default_ask_hashrate_ph: Some(10.0),
            difficulty: 138_966_872_071_213.0,
            btc_usd: 68_724.0,
            market_status: "SPOT_INSTRUMENT_STATUS_ACTIVE".to_string(),
            ocean_hashrate_eh: Some(12.94),
            ocean_average_time_to_block_hours: Some(11.0),
            ocean_average_block_tx_fees_btc: Some(0.05),
            ocean_block_fee_sample_size: 12,
            fetched_at: 1_776_724_200,
            sources: Vec::new(),
        }
    }

    #[test]
    fn cache_mode_helpers_preserve_result_flags() {
        let market = market_snapshot();

        let fresh = MarketCacheResult::fresh(market.clone());
        let stale = MarketCacheResult::stale(market);

        assert_eq!(fresh.cache_mode, CacheMode::KvFresh);
        assert!(!fresh.stale);
        assert!(fresh.warnings.is_empty());
        assert_eq!(stale.cache_mode, CacheMode::KvStale);
        assert!(stale.stale);
        assert_eq!(stale.warnings[0].code, WarningCode::StaleMarketData);
    }

    #[test]
    fn write_failure_helper_preserves_warning_message() {
        let result = MarketCacheResult::write_failed(market_snapshot(), "boom".to_string());

        assert_eq!(result.cache_mode, CacheMode::KvWriteFailed);
        assert!(!result.stale);
        assert_eq!(result.warnings[0].code, WarningCode::CacheWriteFailed);
        assert!(result.warnings[0].message.contains("boom"));
    }
}
