use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct HashpowerCalculatorResponse {
    pub inputs: CalculatorInputs,
    pub market: MarketSnapshot,
    pub results: CalculatorResults,
    pub warnings: Vec<CalculatorWarning>,
    pub stale: bool,
    pub cache_mode: CacheMode,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct CalculatorInputs {
    pub budget_usd: f64,
    pub duration_days: f64,
    pub price_sats_per_ph_day: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct MarketSnapshot {
    pub best_ask_sats_per_eh_day: f64,
    pub last_avg_sats_per_eh_day: f64,
    pub available_hashrate_ph: f64,
    pub top_ask_hashrate_ph: Option<f64>,
    pub top_ask_sats_per_eh_day: Option<f64>,
    pub difficulty: f64,
    pub btc_usd: f64,
    pub market_status: String,
    pub ocean_hashrate_eh: Option<f64>,
    pub ocean_average_time_to_block_hours: Option<f64>,
    pub ocean_average_block_tx_fees_btc: Option<f64>,
    pub ocean_block_fee_sample_size: u32,
    pub fetched_at: u32,
    pub sources: Vec<MarketSource>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct MarketSource {
    pub label: String,
    pub url: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct CalculatorResults {
    pub budget_btc: f64,
    pub buy_btc: f64,
    pub hashrate_ph: f64,
    pub hashrate_eh: f64,
    pub expected_network_blocks: f64,
    pub expected_mined_btc: f64,
    pub delta_pct: f64,
    pub expected_ocean_blocks: Option<f64>,
    pub one_ocean_block_shortfall_pct: Option<f64>,
    pub probability_at_least_one_ocean_block: Option<f64>,
    pub probability_at_least_two_ocean_blocks: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct CalculatorWarning {
    pub code: WarningCode,
    pub message: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[ts(export, rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WarningCode {
    ExpectedValueOnly,
    SimplifiedModel,
    StaleMarketData,
    MemorylessCache,
    CacheWriteFailed,
    Liquidity,
    OceanTimingUnavailable,
    ShortOceanWindow,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[ts(export, rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CacheMode {
    KvFresh,
    KvStale,
    KvRefreshed,
    KvWriteFailed,
    Memoryless,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct ApiErrorResponse {
    pub error: ApiError,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct ApiError {
    pub code: ApiErrorCode,
    pub message: String,
    pub fields: Vec<FieldError>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[ts(export, rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ApiErrorCode {
    InvalidInput,
    MarketDataUnavailable,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, rename_all = "camelCase")]
pub struct FieldError {
    pub field: CalculatorInputField,
    pub message: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(export, rename_all = "snake_case")]
pub enum CalculatorInputField {
    BudgetUsd,
    DurationDays,
    PriceSatsPerPhDay,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_api_error_codes_as_existing_wire_strings() {
        assert_eq!(
            serde_json::to_value(ApiErrorCode::InvalidInput).unwrap(),
            serde_json::json!("INVALID_INPUT")
        );
        assert_eq!(
            serde_json::to_value(ApiErrorCode::MarketDataUnavailable).unwrap(),
            serde_json::json!("MARKET_DATA_UNAVAILABLE")
        );
    }

    #[test]
    fn serializes_input_fields_as_existing_wire_strings() {
        assert_eq!(
            serde_json::to_value(CalculatorInputField::BudgetUsd).unwrap(),
            serde_json::json!("budget_usd")
        );
        assert_eq!(
            serde_json::to_value(CalculatorInputField::DurationDays).unwrap(),
            serde_json::json!("duration_days")
        );
        assert_eq!(
            serde_json::to_value(CalculatorInputField::PriceSatsPerPhDay).unwrap(),
            serde_json::json!("price_sats_per_ph_day")
        );
    }
}
