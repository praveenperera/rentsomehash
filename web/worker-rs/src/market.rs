use futures::join;
use regex::Regex;
use serde::Deserialize;
use url::Url;
use worker::Fetch;

use crate::types::{MarketSnapshot, MarketSource};

const BRAIINS_SPOT_STATS_URL: &str = "https://hashpower.braiins.com/webapi/spot/stats";
const BRAIINS_ORDERBOOK_URL: &str = "https://hashpower.braiins.com/webapi/orderbook";
const BRAIINS_DIFFICULTY_STATS_URL: &str = "https://hashpower.braiins.com/webapi/difficulty-stats";
const BRAIINS_BTC_PRICE_URL: &str = "https://hashpower.braiins.com/webapi/btc-price";
const OCEAN_DASHBOARD_URL: &str = "https://ocean.xyz/dashboard";

pub struct MarketClient {
    now: u32,
}

impl MarketClient {
    pub fn new(now: u32) -> Self {
        Self { now }
    }

    pub async fn fetch(&self) -> Result<MarketSnapshot, String> {
        let spot = fetch_json::<BraiinsSpotStats>(BRAIINS_SPOT_STATS_URL);
        let orderbook = fetch_json::<BraiinsOrderbook>(BRAIINS_ORDERBOOK_URL);
        let difficulty = fetch_json::<BraiinsDifficultyStats>(BRAIINS_DIFFICULTY_STATS_URL);
        let btc_price = fetch_json::<BraiinsBtcPrice>(BRAIINS_BTC_PRICE_URL);
        let ocean = fetch_ocean_timing();

        let (spot, orderbook, difficulty, btc_price, ocean) =
            join!(spot, orderbook, difficulty, btc_price, ocean);

        let spot = spot?;
        let orderbook = orderbook?;
        let difficulty = difficulty?;
        let btc_price = btc_price?;
        let ocean = ocean.ok().flatten();

        Ok(MarketSnapshot {
            best_ask_sats_per_eh_day: spot.best_ask_sat,
            last_avg_sats_per_eh_day: spot.last_avg_price_sat,
            available_hashrate_ph: spot.hash_rate_available_10m_ph,
            top_ask_hashrate_ph: orderbook.top_ask().map(|ask| ask.hash_rate_available),
            top_ask_sats_per_eh_day: orderbook.top_ask().map(|ask| ask.price_sat),
            difficulty: difficulty.difficulty,
            btc_usd: btc_price.price,
            market_status: spot.status,
            ocean_hashrate_eh: ocean.as_ref().map(|timing| timing.hashrate_eh),
            ocean_average_time_to_block_hours: ocean
                .as_ref()
                .map(|timing| timing.average_time_to_block_hours),
            fetched_at: self.now,
            sources: market_sources(),
        })
    }
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

#[derive(Clone, Debug)]
struct OceanTiming {
    hashrate_eh: f64,
    average_time_to_block_hours: f64,
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
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
