use crate::types::MarketSnapshot;

pub(super) fn validate_market_snapshot(market: MarketSnapshot) -> Result<MarketSnapshot, String> {
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
