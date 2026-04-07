use serde::Deserialize;

use crate::types::MarketSource;

use super::fetch_json;

const SPOT_STATS_URL: &str = "https://hashpower.braiins.com/webapi/spot/stats";
const ORDERBOOK_URL: &str = "https://hashpower.braiins.com/webapi/orderbook";
const DIFFICULTY_STATS_URL: &str = "https://hashpower.braiins.com/webapi/difficulty-stats";
const BTC_PRICE_URL: &str = "https://hashpower.braiins.com/webapi/btc-price";

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct SpotStats {
    #[serde(rename = "hash_rate_available_10m_ph")]
    pub(crate) available_hashrate_ph: f64,
    #[serde(rename = "best_ask_sat")]
    pub(crate) best_ask_sats_per_eh_day: f64,
    #[serde(rename = "last_avg_price_sat")]
    pub(crate) last_avg_sats_per_eh_day: f64,
    pub(crate) status: String,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct Orderbook {
    asks: Vec<OrderbookAsk>,
}

impl Orderbook {
    pub(crate) fn top_ask_hashrate_ph(&self) -> Option<f64> {
        self.top_ask().map(|ask| ask.hashrate_ph)
    }

    pub(crate) fn top_ask_sats_per_eh_day(&self) -> Option<f64> {
        self.top_ask().map(|ask| ask.sats_per_eh_day)
    }

    // the Braiins orderbook API returns asks sorted ascending by price_sat,
    // so first() yields the best (cheapest) ask
    fn top_ask(&self) -> Option<&OrderbookAsk> {
        self.asks.first()
    }
}

#[derive(Clone, Debug, Deserialize)]
struct OrderbookAsk {
    #[serde(rename = "price_sat")]
    sats_per_eh_day: f64,
    #[serde(rename = "hashRateAvailable")]
    hashrate_ph: f64,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct DifficultyStats {
    pub(crate) difficulty: f64,
}

#[derive(Clone, Debug, Deserialize)]
pub(crate) struct BtcPrice {
    pub(crate) price: f64,
}

pub(crate) async fn fetch_spot_stats() -> Result<SpotStats, String> {
    fetch_json(SPOT_STATS_URL).await
}

pub(crate) async fn fetch_orderbook() -> Result<Orderbook, String> {
    fetch_json(ORDERBOOK_URL).await
}

pub(crate) async fn fetch_difficulty_stats() -> Result<DifficultyStats, String> {
    fetch_json(DIFFICULTY_STATS_URL).await
}

pub(crate) async fn fetch_btc_price() -> Result<BtcPrice, String> {
    fetch_json(BTC_PRICE_URL).await
}

pub(crate) fn spot_stats_source() -> MarketSource {
    source("Braiins spot stats", SPOT_STATS_URL)
}

pub(crate) fn orderbook_source() -> MarketSource {
    source("Braiins orderbook", ORDERBOOK_URL)
}

pub(crate) fn difficulty_stats_source() -> MarketSource {
    source("Braiins difficulty stats", DIFFICULTY_STATS_URL)
}

pub(crate) fn btc_price_source() -> MarketSource {
    source("Braiins BTC price", BTC_PRICE_URL)
}

fn source(label: &str, url: &str) -> MarketSource {
    MarketSource {
        label: label.to_string(),
        url: url.to_string(),
    }
}
