mod braiins;
mod ocean;
mod validation;

use futures::join;
use serde::Deserialize;
use url::Url;
use worker::Fetch;

use crate::types::{MarketSnapshot, MarketSource};

pub use ocean::{OceanFeeEstimate, OceanTiming, fetch_ocean_fee_estimate};

pub struct MarketClient {
    now: u32,
}

impl MarketClient {
    pub fn new(now: u32) -> Self {
        Self { now }
    }

    pub async fn fetch(
        &self,
        ocean_fee_estimate: Option<OceanFeeEstimate>,
        cached_ocean_timing: Option<OceanTiming>,
    ) -> Result<MarketSnapshot, String> {
        let spot = braiins::fetch_spot_stats();
        let orderbook = braiins::fetch_orderbook();
        let difficulty = braiins::fetch_difficulty_stats();
        let btc_price = braiins::fetch_btc_price();
        let ocean_timing = ocean::fetch_or_reuse_timing(cached_ocean_timing);

        let (spot, orderbook, difficulty, btc_price, ocean_timing) =
            join!(spot, orderbook, difficulty, btc_price, ocean_timing);

        let spot = spot?;
        let orderbook = orderbook
            .inspect_err(|e| worker::console_log!("Orderbook fetch failed: {e}"))
            .ok();
        let difficulty = difficulty?;
        let btc_price = btc_price?;
        let ocean_timing = ocean_timing
            .inspect_err(|e| worker::console_log!("OCEAN timing fetch failed: {e}"))
            .ok();
        let (default_price_sats_per_eh_day, default_ask_hashrate_ph) =
            default_orderbook_price(orderbook.as_ref(), spot.last_avg_sats_per_eh_day);

        MarketSnapshot {
            best_ask_sats_per_eh_day: spot.best_ask_sats_per_eh_day,
            last_avg_sats_per_eh_day: spot.last_avg_sats_per_eh_day,
            available_hashrate_ph: spot.available_hashrate_ph,
            top_ask_hashrate_ph: orderbook
                .as_ref()
                .and_then(braiins::Orderbook::top_ask_hashrate_ph),
            top_ask_sats_per_eh_day: orderbook
                .as_ref()
                .and_then(braiins::Orderbook::top_ask_sats_per_eh_day),
            default_price_sats_per_eh_day,
            default_ask_hashrate_ph,
            difficulty: difficulty.difficulty,
            btc_usd: btc_price.price,
            market_status: spot.status,
            ocean_hashrate_eh: ocean_timing.as_ref().map(|timing| timing.hashrate_eh),
            ocean_average_time_to_block_hours: ocean_timing
                .as_ref()
                .map(|timing| timing.average_time_to_block_hours),
            ocean_average_block_tx_fees_btc: ocean_fee_estimate
                .as_ref()
                .map(|estimate| estimate.average_block_tx_fees_btc),
            ocean_block_fee_sample_size: ocean_fee_estimate
                .as_ref()
                .map_or(0, |estimate| estimate.sample_size),
            fetched_at: self.now,
            sources: market_sources(),
        }
        .validate()
    }
}

fn default_orderbook_price(
    orderbook: Option<&braiins::Orderbook>,
    last_avg_sats_per_eh_day: f64,
) -> (f64, Option<f64>) {
    let default_ask_sats_per_eh_day =
        orderbook.and_then(braiins::Orderbook::default_ask_sats_per_eh_day);
    let default_ask_hashrate_ph = orderbook.and_then(braiins::Orderbook::default_ask_hashrate_ph);

    // when every ask is fully used, fall back to the last traded average price
    (
        default_ask_sats_per_eh_day.unwrap_or(last_avg_sats_per_eh_day),
        default_ask_hashrate_ph,
    )
}

async fn fetch_json<T>(url: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    let url = Url::parse(url).map_err(|error| format!("invalid upstream URL: {error}"))?;
    let mut response = Fetch::Url(url)
        .send()
        .await
        .map_err(|error| format!("upstream fetch failed: {error}"))?;

    if response.status_code() != 200 {
        return Err(format!("upstream returned HTTP {}", response.status_code()));
    }

    response
        .json::<T>()
        .await
        .map_err(|error| format!("upstream JSON parse failed: {error}"))
}

fn market_sources() -> Vec<MarketSource> {
    vec![
        braiins::spot_stats_source(),
        braiins::orderbook_source(),
        braiins::difficulty_stats_source(),
        braiins::btc_price_source(),
        ocean::dashboard_source(),
        ocean::blocks_found_source(),
        ocean::mempool_block_summary_source(),
    ]
}

#[cfg(test)]
mod tests {
    use super::{braiins::Orderbook, default_orderbook_price};

    #[test]
    fn falls_back_to_last_average_price_when_no_ask_has_available_hash() {
        let orderbook: Orderbook = serde_json::from_value(serde_json::json!({
            "asks": [
                {
                    "price_sat": 44_000_000.0,
                    "hashRateAvailable": 70.99,
                    "hashRateMatched": 70.99
                },
                {
                    "price_sat": 45_000_000.0,
                    "hashRateAvailable": 111.58,
                    "hashRateMatched": 111.58
                }
            ]
        }))
        .expect("expected orderbook JSON to parse");

        let (default_price_sats_per_eh_day, default_ask_hashrate_ph) =
            default_orderbook_price(Some(&orderbook), 49_000_000.0);

        assert_eq!(default_price_sats_per_eh_day, 49_000_000.0);
        assert_eq!(default_ask_hashrate_ph, None);
    }

    #[test]
    fn uses_lowest_available_ask_when_present() {
        let orderbook: Orderbook = serde_json::from_value(serde_json::json!({
            "asks": [
                {
                    "price_sat": 44_000_000.0,
                    "hashRateAvailable": 70.99,
                    "hashRateMatched": 70.99
                },
                {
                    "price_sat": 45_748_000.0,
                    "hashRateAvailable": 248.39,
                    "hashRateMatched": 201.98
                }
            ]
        }))
        .expect("expected orderbook JSON to parse");

        let (default_price_sats_per_eh_day, default_ask_hashrate_ph) =
            default_orderbook_price(Some(&orderbook), 49_000_000.0);

        assert_eq!(default_price_sats_per_eh_day, 45_748_000.0);
        assert_eq!(default_ask_hashrate_ph, Some(46.41));
    }
}
