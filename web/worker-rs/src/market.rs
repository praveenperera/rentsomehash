use futures::{future::join_all, join};
use regex::Regex;
use serde::{Deserialize, Serialize};
use url::Url;
use worker::Fetch;

use crate::types::{MarketSnapshot, MarketSource};

const BRAIINS_SPOT_STATS_URL: &str = "https://hashpower.braiins.com/webapi/spot/stats";
const BRAIINS_ORDERBOOK_URL: &str = "https://hashpower.braiins.com/webapi/orderbook";
const BRAIINS_DIFFICULTY_STATS_URL: &str = "https://hashpower.braiins.com/webapi/difficulty-stats";
const BRAIINS_BTC_PRICE_URL: &str = "https://hashpower.braiins.com/webapi/btc-price";
const OCEAN_DASHBOARD_URL: &str = "https://ocean.xyz/dashboard";
const OCEAN_BLOCKS_FOUND_URL: &str = "https://ocean.xyz/data/json/blocksfound?range=1m";
const MEMPOOL_BLOCK_SUMMARY_URL_BASE: &str = "https://mempool.space/api/v1/block";
const OCEAN_BLOCK_FEE_SAMPLE_SIZE: usize = 12;
const SATS_PER_BTC: f64 = 100_000_000.0;

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
        let spot = fetch_json::<BraiinsSpotStats>(BRAIINS_SPOT_STATS_URL);
        let orderbook = fetch_json::<BraiinsOrderbook>(BRAIINS_ORDERBOOK_URL);
        let difficulty = fetch_json::<BraiinsDifficultyStats>(BRAIINS_DIFFICULTY_STATS_URL);
        let btc_price = fetch_json::<BraiinsBtcPrice>(BRAIINS_BTC_PRICE_URL);
        let ocean = fetch_or_reuse_ocean_timing(cached_ocean_timing);

        let (spot, orderbook, difficulty, btc_price, ocean) =
            join!(spot, orderbook, difficulty, btc_price, ocean);

        let spot = spot?;
        let orderbook = orderbook.ok();
        let difficulty = difficulty?;
        let btc_price = btc_price?;
        let ocean = ocean.ok().flatten();

        validate_market_snapshot(MarketSnapshot {
            best_ask_sats_per_eh_day: spot.best_ask_sat,
            last_avg_sats_per_eh_day: spot.last_avg_price_sat,
            available_hashrate_ph: spot.hash_rate_available_10m_ph,
            top_ask_hashrate_ph: orderbook
                .as_ref()
                .and_then(|book| book.top_ask().map(|ask| ask.hash_rate_available)),
            top_ask_sats_per_eh_day: orderbook
                .as_ref()
                .and_then(|book| book.top_ask().map(|ask| ask.price_sat)),
            difficulty: difficulty.difficulty,
            btc_usd: btc_price.price,
            market_status: spot.status,
            ocean_hashrate_eh: ocean.as_ref().map(|timing| timing.hashrate_eh),
            ocean_average_time_to_block_hours: ocean
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
        })
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct OceanFeeEstimate {
    pub average_block_tx_fees_btc: f64,
    pub sample_size: u32,
    pub fetched_at: u32,
}

#[derive(Clone, Debug, Deserialize)]
struct BraiinsSpotStats {
    hash_rate_available_10m_ph: f64,
    best_ask_sat: f64,
    last_avg_price_sat: f64,
    status: String,
}

#[derive(Clone, Debug, Deserialize)]
struct BraiinsOrderbook {
    asks: Vec<BraiinsOrderbookAsk>,
}

impl BraiinsOrderbook {
    fn top_ask(&self) -> Option<&BraiinsOrderbookAsk> {
        self.asks.first()
    }
}

#[derive(Clone, Debug, Deserialize)]
struct BraiinsOrderbookAsk {
    price_sat: f64,
    #[serde(rename = "hashRateAvailable")]
    hash_rate_available: f64,
}

#[derive(Clone, Debug, Deserialize)]
struct BraiinsDifficultyStats {
    difficulty: f64,
}

#[derive(Clone, Debug, Deserialize)]
struct BraiinsBtcPrice {
    price: f64,
}

#[derive(Clone, Debug, Deserialize)]
struct OceanFoundBlock {
    #[serde(rename = "blockHash")]
    block_hash: String,
}

#[derive(Clone, Debug, Deserialize)]
struct MempoolTxSummary {
    fee: f64,
}

#[derive(Clone, Debug)]
pub struct OceanTiming {
    pub hashrate_eh: f64,
    pub average_time_to_block_hours: f64,
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

pub async fn fetch_ocean_fee_estimate(now: u32) -> Result<OceanFeeEstimate, String> {
    let blocks = fetch_json::<Vec<OceanFoundBlock>>(OCEAN_BLOCKS_FOUND_URL).await?;
    let fee_requests = blocks
        .into_iter()
        .take(OCEAN_BLOCK_FEE_SAMPLE_SIZE)
        .map(|block| fetch_mempool_block_fees_btc(block.block_hash));
    let fees = join_all(fee_requests).await;
    let fees: Vec<f64> = fees.into_iter().filter_map(Result::ok).collect();
    let Some(average_block_tx_fees_btc) = average_block_fees_btc(&fees) else {
        return Err("recent OCEAN block fee estimate unavailable".to_string());
    };

    Ok(OceanFeeEstimate {
        average_block_tx_fees_btc,
        sample_size: fees.len() as u32,
        fetched_at: now,
    })
}

async fn fetch_mempool_block_fees_btc(block_hash: String) -> Result<f64, String> {
    let url = format!("{MEMPOOL_BLOCK_SUMMARY_URL_BASE}/{block_hash}/summary");
    let transactions = fetch_json::<Vec<MempoolTxSummary>>(&url).await?;
    let fee_sats = transactions
        .into_iter()
        .map(|transaction| transaction.fee)
        .sum::<f64>();

    Ok(fee_sats / SATS_PER_BTC)
}

fn average_block_fees_btc(fees: &[f64]) -> Option<f64> {
    if fees.is_empty() {
        return None;
    }

    Some(fees.iter().sum::<f64>() / fees.len() as f64)
}

async fn fetch_ocean_timing() -> Result<Option<OceanTiming>, String> {
    let url =
        Url::parse(OCEAN_DASHBOARD_URL).map_err(|error| format!("invalid OCEAN URL: {error}"))?;
    let mut response = Fetch::Url(url)
        .send()
        .await
        .map_err(|error| format!("OCEAN fetch failed: {error}"))?;

    if response.status_code() != 200 {
        return Err(format!("OCEAN returned HTTP {}", response.status_code()));
    }

    let html = response
        .text()
        .await
        .map_err(|error| format!("OCEAN HTML read failed: {error}"))?;

    parse_ocean_timing(&html)
}

async fn fetch_or_reuse_ocean_timing(
    cached_ocean_timing: Option<OceanTiming>,
) -> Result<Option<OceanTiming>, String> {
    if let Some(timing) = cached_ocean_timing {
        return Ok(Some(timing));
    }

    fetch_ocean_timing().await
}

fn parse_ocean_timing(html: &str) -> Result<Option<OceanTiming>, String> {
    let hashrate = parse_ocean_hashrate(html)?;
    let average_time_to_block_hours = parse_ocean_time_to_block_hours(html)?;

    Ok(Some(OceanTiming {
        hashrate_eh: hashrate,
        average_time_to_block_hours,
    }))
}

fn parse_ocean_hashrate(html: &str) -> Result<f64, String> {
    let regex = Regex::new(r"OCEAN Hashrate:\s*([0-9.]+)\s*Eh/s")
        .map_err(|error| format!("invalid OCEAN hashrate regex: {error}"))?;
    let Some(captures) = regex.captures(html) else {
        return Err("OCEAN hashrate not found".to_string());
    };

    captures[1]
        .parse()
        .map_err(|error| format!("OCEAN hashrate parse failed: {error}"))
}

fn parse_ocean_time_to_block_hours(html: &str) -> Result<f64, String> {
    let regex = Regex::new(
        r"(?is)Average Time to Block.*?<span>\s*([0-9.]+)\s*(minutes?|hours?)\s*</span>",
    )
    .map_err(|error| format!("invalid OCEAN time-to-block regex: {error}"))?;
    let Some(captures) = regex.captures(html) else {
        return Err("OCEAN average time to block not found".to_string());
    };

    let value = captures[1]
        .parse::<f64>()
        .map_err(|error| format!("OCEAN time-to-block parse failed: {error}"))?;
    let unit = captures[2].to_ascii_lowercase();

    if unit.starts_with("minute") {
        Ok(value / 60.0)
    } else {
        Ok(value)
    }
}

fn market_sources() -> Vec<MarketSource> {
    vec![
        MarketSource {
            label: "Braiins spot stats".to_string(),
            url: BRAIINS_SPOT_STATS_URL.to_string(),
        },
        MarketSource {
            label: "Braiins orderbook".to_string(),
            url: BRAIINS_ORDERBOOK_URL.to_string(),
        },
        MarketSource {
            label: "Braiins difficulty stats".to_string(),
            url: BRAIINS_DIFFICULTY_STATS_URL.to_string(),
        },
        MarketSource {
            label: "Braiins BTC price".to_string(),
            url: BRAIINS_BTC_PRICE_URL.to_string(),
        },
        MarketSource {
            label: "OCEAN dashboard".to_string(),
            url: OCEAN_DASHBOARD_URL.to_string(),
        },
        MarketSource {
            label: "OCEAN recent blocks".to_string(),
            url: OCEAN_BLOCKS_FOUND_URL.to_string(),
        },
        MarketSource {
            label: "mempool.space block summaries".to_string(),
            url: MEMPOOL_BLOCK_SUMMARY_URL_BASE.to_string(),
        },
    ]
}

fn validate_market_snapshot(market: MarketSnapshot) -> Result<MarketSnapshot, String> {
    validate_positive_metric("best_ask_sats_per_eh_day", market.best_ask_sats_per_eh_day)?;
    validate_positive_metric("last_avg_sats_per_eh_day", market.last_avg_sats_per_eh_day)?;
    validate_non_negative_metric("available_hashrate_ph", market.available_hashrate_ph)?;
    validate_optional_non_negative_metric("top_ask_hashrate_ph", market.top_ask_hashrate_ph)?;
    validate_optional_positive_metric("top_ask_sats_per_eh_day", market.top_ask_sats_per_eh_day)?;
    validate_positive_metric("difficulty", market.difficulty)?;
    validate_positive_metric("btc_usd", market.btc_usd)?;
    validate_optional_positive_metric("ocean_hashrate_eh", market.ocean_hashrate_eh)?;
    validate_optional_positive_metric(
        "ocean_average_time_to_block_hours",
        market.ocean_average_time_to_block_hours,
    )?;
    validate_optional_non_negative_metric(
        "ocean_average_block_tx_fees_btc",
        market.ocean_average_block_tx_fees_btc,
    )?;

    Ok(market)
}

fn validate_positive_metric(name: &str, value: f64) -> Result<(), String> {
    if value.is_finite() && value > 0.0 {
        return Ok(());
    }

    Err(format!("{name} must be finite and greater than zero"))
}

fn validate_optional_positive_metric(name: &str, value: Option<f64>) -> Result<(), String> {
    let Some(value) = value else {
        return Ok(());
    };

    validate_positive_metric(name, value)
}

fn validate_non_negative_metric(name: &str, value: f64) -> Result<(), String> {
    if value.is_finite() && value >= 0.0 {
        return Ok(());
    }

    Err(format!(
        "{name} must be finite and greater than or equal to zero"
    ))
}

fn validate_optional_non_negative_metric(name: &str, value: Option<f64>) -> Result<(), String> {
    let Some(value) = value else {
        return Ok(());
    };

    validate_non_negative_metric(name, value)
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
    fn parses_ocean_timing() {
        let html = r#"
            <div class="graph-title">OCEAN Hashrate: 12.30 Eh/s</div>
            <div class="blocks-label">Average Time to Block
              <span>11 hours</span>
            </div>
        "#;

        let timing = parse_ocean_timing(html).unwrap().unwrap();

        assert_eq!(timing.hashrate_eh, 12.30);
        assert_eq!(timing.average_time_to_block_hours, 11.0);
    }

    #[test]
    fn parses_ocean_minutes() {
        let html = r#"
            <div class="graph-title">OCEAN Hashrate: 12.30 Eh/s</div>
            <div class="blocks-label">Average Time to Block
              <span>45 minutes</span>
            </div>
        "#;

        let timing = parse_ocean_timing(html).unwrap().unwrap();

        assert_eq!(timing.average_time_to_block_hours, 0.75);
    }

    #[test]
    fn averages_block_fees() {
        let average = average_block_fees_btc(&[0.01, 0.03, 0.05]);

        assert_eq!(average, Some(0.03));
    }

    #[test]
    fn accepts_missing_orderbook_fields() {
        let market = MarketSnapshot {
            top_ask_hashrate_ph: None,
            top_ask_sats_per_eh_day: None,
            ..market_snapshot()
        };

        assert!(validate_market_snapshot(market).is_ok());
    }

    #[test]
    fn rejects_invalid_market_snapshot() {
        let market = MarketSnapshot {
            btc_usd: 0.0,
            ..market_snapshot()
        };

        let error = validate_market_snapshot(market).expect_err("expected invalid market snapshot");
        assert!(error.contains("btc_usd"));
    }
}
