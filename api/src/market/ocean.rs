use futures::future::join_all;
use regex::Regex;
use serde::{Deserialize, Serialize};
use url::Url;
use worker::Fetch;

use crate::types::MarketSource;

use super::fetch_json;

const DASHBOARD_URL: &str = "https://ocean.xyz/dashboard";
const BLOCKS_FOUND_URL: &str = "https://ocean.xyz/data/json/blocksfound?range=1m";
const MEMPOOL_BLOCK_SUMMARY_URL_BASE: &str = "https://mempool.space/api/v1/block";
const BLOCK_FEE_SAMPLE_SIZE: usize = 12;
const SATS_PER_BTC: f64 = 100_000_000.0;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct OceanFeeEstimate {
    pub average_block_tx_fees_btc: f64,
    pub sample_size: u32,
    pub fetched_at: u32,
}

#[derive(Clone, Debug)]
pub struct OceanTiming {
    pub hashrate_eh: f64,
    pub average_time_to_block_hours: f64,
}

#[derive(Clone, Debug, Deserialize)]
struct FoundBlock {
    #[serde(rename = "blockHash")]
    block_hash: String,
}

#[derive(Clone, Debug, Deserialize)]
struct MempoolTxSummary {
    fee: f64,
}

pub async fn fetch_ocean_fee_estimate(now: u32) -> Result<OceanFeeEstimate, String> {
    let blocks = fetch_json::<Vec<FoundBlock>>(BLOCKS_FOUND_URL).await?;
    let fee_requests = blocks
        .into_iter()
        .take(BLOCK_FEE_SAMPLE_SIZE)
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

pub(crate) async fn fetch_or_reuse_timing(
    cached_ocean_timing: Option<OceanTiming>,
) -> Result<OceanTiming, String> {
    if let Some(timing) = cached_ocean_timing {
        return Ok(timing);
    }

    fetch_timing().await
}

pub(crate) fn dashboard_source() -> MarketSource {
    source("OCEAN dashboard", DASHBOARD_URL)
}

pub(crate) fn blocks_found_source() -> MarketSource {
    source("OCEAN recent blocks", BLOCKS_FOUND_URL)
}

pub(crate) fn mempool_block_summary_source() -> MarketSource {
    source(
        "mempool.space block summaries",
        MEMPOOL_BLOCK_SUMMARY_URL_BASE,
    )
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

async fn fetch_timing() -> Result<OceanTiming, String> {
    let url = Url::parse(DASHBOARD_URL).map_err(|error| format!("invalid OCEAN URL: {error}"))?;
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

    parse_timing(&html)
}

fn parse_timing(html: &str) -> Result<OceanTiming, String> {
    let hashrate = parse_hashrate(html)?;
    let average_time_to_block_hours = parse_time_to_block_hours(html)?;

    Ok(OceanTiming {
        hashrate_eh: hashrate,
        average_time_to_block_hours,
    })
}

fn parse_hashrate(html: &str) -> Result<f64, String> {
    let regex = Regex::new(r"OCEAN Hashrate:\s*([0-9.]+)\s*Eh/s")
        .map_err(|error| format!("invalid OCEAN hashrate regex: {error}"))?;
    let Some(captures) = regex.captures(html) else {
        return Err("OCEAN hashrate not found".to_string());
    };

    captures[1]
        .parse()
        .map_err(|error| format!("OCEAN hashrate parse failed: {error}"))
}

fn parse_time_to_block_hours(html: &str) -> Result<f64, String> {
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

fn source(label: &str, url: &str) -> MarketSource {
    MarketSource {
        label: label.to_string(),
        url: url.to_string(),
    }
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

        let timing = parse_timing(html).unwrap();

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

        let timing = parse_timing(html).unwrap();

        assert_eq!(timing.average_time_to_block_hours, 0.75);
    }

    #[test]
    fn averages_block_fees() {
        let average = average_block_fees_btc(&[0.01, 0.03, 0.05]);

        assert_eq!(average, Some(0.03));
    }
}
