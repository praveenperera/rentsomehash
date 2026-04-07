use crate::types::MarketSnapshot;

pub(super) struct MarketSnapshotValidator(MarketSnapshot);

impl MarketSnapshotValidator {
    pub(super) fn validate(self) -> Result<MarketSnapshot, String> {
        self.validate_metric(
            MarketMetric::BestAskSatsPerEhDay,
            self.0.best_ask_sats_per_eh_day,
            MetricBound::Positive,
        )?;

        self.validate_metric(
            MarketMetric::LastAvgSatsPerEhDay,
            self.0.last_avg_sats_per_eh_day,
            MetricBound::Positive,
        )?;

        self.validate_metric(
            MarketMetric::AvailableHashratePh,
            self.0.available_hashrate_ph,
            MetricBound::NonNegative,
        )?;

        self.validate_optional_metric(
            MarketMetric::TopAskHashratePh,
            self.0.top_ask_hashrate_ph,
            MetricBound::NonNegative,
        )?;

        self.validate_optional_metric(
            MarketMetric::TopAskSatsPerEhDay,
            self.0.top_ask_sats_per_eh_day,
            MetricBound::Positive,
        )?;

        self.validate_metric(
            MarketMetric::Difficulty,
            self.0.difficulty,
            MetricBound::Positive,
        )?;

        self.validate_metric(MarketMetric::BtcUsd, self.0.btc_usd, MetricBound::Positive)?;

        self.validate_optional_metric(
            MarketMetric::OceanHashrateEh,
            self.0.ocean_hashrate_eh,
            MetricBound::Positive,
        )?;

        self.validate_optional_metric(
            MarketMetric::OceanAverageTimeToBlockHours,
            self.0.ocean_average_time_to_block_hours,
            MetricBound::Positive,
        )?;

        self.validate_optional_metric(
            MarketMetric::OceanAverageBlockTxFeesBtc,
            self.0.ocean_average_block_tx_fees_btc,
            MetricBound::NonNegative,
        )?;

        Ok(self.0)
    }

    fn validate_optional_metric(
        &self,
        metric: MarketMetric,
        value: Option<f64>,
        bound: MetricBound,
    ) -> Result<(), String> {
        let Some(value) = value else {
            return Ok(());
        };

        self.validate_metric(metric, value, bound)
    }

    fn validate_metric(
        &self,
        metric: MarketMetric,
        value: f64,
        bound: MetricBound,
    ) -> Result<(), String> {
        if bound.accepts(value) {
            return Ok(());
        }

        Err(format!("{} {}", metric.name(), bound.error_suffix()))
    }
}

#[derive(Clone, Copy)]
enum MarketMetric {
    BestAskSatsPerEhDay,
    LastAvgSatsPerEhDay,
    AvailableHashratePh,
    TopAskHashratePh,
    TopAskSatsPerEhDay,
    Difficulty,
    BtcUsd,
    OceanHashrateEh,
    OceanAverageTimeToBlockHours,
    OceanAverageBlockTxFeesBtc,
}

impl MarketMetric {
    fn name(self) -> &'static str {
        match self {
            Self::BestAskSatsPerEhDay => "best_ask_sats_per_eh_day",
            Self::LastAvgSatsPerEhDay => "last_avg_sats_per_eh_day",
            Self::AvailableHashratePh => "available_hashrate_ph",
            Self::TopAskHashratePh => "top_ask_hashrate_ph",
            Self::TopAskSatsPerEhDay => "top_ask_sats_per_eh_day",
            Self::Difficulty => "difficulty",
            Self::BtcUsd => "btc_usd",
            Self::OceanHashrateEh => "ocean_hashrate_eh",
            Self::OceanAverageTimeToBlockHours => "ocean_average_time_to_block_hours",
            Self::OceanAverageBlockTxFeesBtc => "ocean_average_block_tx_fees_btc",
        }
    }
}

#[derive(Clone, Copy)]
enum MetricBound {
    Positive,
    NonNegative,
}

impl MetricBound {
    fn accepts(self, value: f64) -> bool {
        match self {
            Self::Positive => value.is_finite() && value > 0.0,
            Self::NonNegative => value.is_finite() && value >= 0.0,
        }
    }

    fn error_suffix(self) -> &'static str {
        match self {
            Self::Positive => "must be finite and greater than zero",
            Self::NonNegative => "must be finite and greater than or equal to zero",
        }
    }
}

impl From<MarketSnapshot> for MarketSnapshotValidator {
    fn from(market: MarketSnapshot) -> Self {
        Self(market)
    }
}

impl MarketSnapshot {
    pub(super) fn validate(self) -> Result<MarketSnapshot, String> {
        MarketSnapshotValidator::from(self).validate()
    }
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

        assert!(market.validate().is_ok());
    }

    #[test]
    fn rejects_invalid_market_snapshot() {
        let market = MarketSnapshot {
            btc_usd: 0.0,
            ..market_snapshot()
        };

        let error = market
            .validate()
            .expect_err("expected invalid market snapshot");
        assert!(error.contains("btc_usd"));
    }

    #[test]
    fn rejects_nan_values() {
        let market = MarketSnapshot {
            btc_usd: f64::NAN,
            ..market_snapshot()
        };

        assert!(market.validate().is_err());
    }

    #[test]
    fn rejects_infinite_values() {
        let market = MarketSnapshot {
            difficulty: f64::INFINITY,
            ..market_snapshot()
        };

        assert!(market.validate().is_err());
    }

    #[test]
    fn rejects_negative_required_positive_field() {
        let market = MarketSnapshot {
            best_ask_sats_per_eh_day: -1.0,
            ..market_snapshot()
        };

        assert!(market.validate().is_err());
    }
}
