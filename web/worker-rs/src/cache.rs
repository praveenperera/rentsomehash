use worker::{Env, kv::KvStore};

use crate::{
    market::MarketClient,
    types::{CacheMode, CalculatorWarning, MarketSnapshot, WarningCode},
};

const CACHE_BINDING: &str = "HASHPOWER_CACHE";
const CACHE_KEY: &str = "hashpower-calculator:v1";
const FRESH_SECONDS: u32 = 60;
const EXPIRATION_SECONDS: u64 = 300;

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

impl MarketCache {
    pub fn from_env(env: &Env, now: u32) -> Self {
        Self {
            kv: env.kv(CACHE_BINDING).ok(),
            now,
        }
    }

    pub async fn market(&self) -> Result<MarketCacheResult, String> {
        let cached = self.read().await;

        if let Some(market) = cached.as_ref()
            && self.is_fresh(market)
        {
            return Ok(MarketCacheResult {
                market: market.clone(),
                stale: false,
                cache_mode: CacheMode::KvFresh,
                warnings: Vec::new(),
            });
        }

        match MarketClient::new(self.now).fetch().await {
            Ok(market) => self.return_refreshed(market).await,
            Err(error) => self.return_stale(cached, error),
        }
    }

    async fn return_refreshed(&self, market: MarketSnapshot) -> Result<MarketCacheResult, String> {
        if let Some(kv) = self.kv.as_ref() {
            let _ = kv
                .put(CACHE_KEY, &market)
                .map_err(|error| error.to_string())?
                .expiration_ttl(EXPIRATION_SECONDS)
                .execute()
                .await;

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
        cached: Option<MarketSnapshot>,
        error: String,
    ) -> Result<MarketCacheResult, String> {
        let Some(market) = cached else {
            return Err(error);
        };

        Ok(MarketCacheResult {
            market,
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

    async fn read(&self) -> Option<MarketSnapshot> {
        let kv = self.kv.as_ref()?;
        kv.get(CACHE_KEY)
            .json::<MarketSnapshot>()
            .await
            .ok()
            .flatten()
    }

    fn is_fresh(&self, market: &MarketSnapshot) -> bool {
        self.now.saturating_sub(market.fetched_at) < FRESH_SECONDS
    }
}
