use crate::types::{
    CalculatorInputs, CalculatorResults, CalculatorWarning, FieldError, MarketSnapshot, WarningCode,
};

const BLOCK_SUBSIDY_BTC: f64 = 3.125;
const OCEAN_DATUM_POOL_FEE_RATE: f64 = 0.01;
const DEFAULT_DURATION_DAYS: f64 = 30.0;
const MIN_DURATION_DAYS: f64 = 7.0;
const MAX_DURATION_DAYS: f64 = 90.0;
const SECONDS_PER_DAY: f64 = 86_400.0;
const HASHES_PER_EH: f64 = 1_000_000_000_000_000_000.0;
const MAX_U32_TARGET: f64 = 4_294_967_296.0;

#[derive(Clone, Debug, Default)]
pub struct QueryInput {
    pub budget_usd: Option<f64>,
    pub duration_days: Option<f64>,
    pub price_sats_per_ph_day: Option<f64>,
}

impl QueryInput {
    pub fn with_market_defaults(
        self,
        market: &MarketSnapshot,
    ) -> Result<CalculatorInputs, Vec<FieldError>> {
        let inputs = CalculatorInputs {
            budget_usd: self.budget_usd.unwrap_or(1_000.0),
            duration_days: self.duration_days.unwrap_or(DEFAULT_DURATION_DAYS),
            price_sats_per_ph_day: self
                .price_sats_per_ph_day
                .unwrap_or(market.best_ask_sats_per_eh_day / 1_000.0),
        };
        validate_inputs(inputs)
    }
}

pub struct HashpowerCalculator<'a> {
    inputs: &'a CalculatorInputs,
    market: &'a MarketSnapshot,
}

impl<'a> HashpowerCalculator<'a> {
    pub fn new(inputs: &'a CalculatorInputs, market: &'a MarketSnapshot) -> Self {
        Self { inputs, market }
    }

    pub fn results(&self) -> CalculatorResults {
        let budget_btc = self.budget_btc();
        let hashrate_eh = self.hashrate_eh(budget_btc);
        let hashrate_ph = hashrate_eh * 1_000.0;
        let expected_network_blocks = self.expected_network_blocks(hashrate_eh);
        let expected_mined_btc = expected_network_blocks
            * self.gross_block_reward_btc()
            * (1.0 - OCEAN_DATUM_POOL_FEE_RATE);
        let buy_btc = budget_btc;
        let delta_pct = ((expected_mined_btc / buy_btc) - 1.0) * 100.0;
        let expected_ocean_blocks = self.expected_ocean_blocks();

        CalculatorResults {
            budget_btc,
            buy_btc,
            hashrate_ph,
            hashrate_eh,
            expected_network_blocks,
            expected_mined_btc,
            delta_pct,
            expected_ocean_blocks,
            one_ocean_block_shortfall_pct: expected_ocean_blocks.map(one_block_shortfall_pct),
            probability_at_least_one_ocean_block: expected_ocean_blocks
                .map(probability_at_least_one),
            probability_at_least_two_ocean_blocks: expected_ocean_blocks
                .map(probability_at_least_two),
        }
    }

    pub fn warnings(&self, results: &CalculatorResults) -> Vec<CalculatorWarning> {
        let mut warnings = vec![
            CalculatorWarning {
                code: WarningCode::ExpectedValueOnly,
                message: "This is expected value, not a forecast. Actual mining results can vary heavily.".to_string(),
            },
            CalculatorWarning {
                code: WarningCode::SimplifiedModel,
                message: self.model_warning(),
            },
        ];

        if self.exceeds_top_ask_liquidity(results) {
            warnings.push(CalculatorWarning {
                code: WarningCode::Liquidity,
                message: "The requested hashrate exceeds top ask liquidity at the best-ask price, so the flat-price estimate may be too optimistic.".to_string(),
            });
        }

        if results.expected_ocean_blocks.is_none() {
            warnings.push(CalculatorWarning {
                code: WarningCode::OceanTimingUnavailable,
                message: "OCEAN payout timing data is unavailable, so only the core expected-value estimate is shown.".to_string(),
            });
        }

        if let Some(expected_ocean_blocks) = results.expected_ocean_blocks
            && expected_ocean_blocks < 2.0
        {
            warnings.push(CalculatorWarning {
                code: WarningCode::ShortOceanWindow,
                message: "The selected window has fewer than two expected OCEAN pool blocks at the current pool hashrate.".to_string(),
            });
        }

        warnings
    }

    fn budget_btc(&self) -> f64 {
        self.inputs.budget_usd / self.market.btc_usd
    }

    fn hashrate_eh(&self, budget_btc: f64) -> f64 {
        budget_btc / (self.price_btc_per_eh_day() * self.inputs.duration_days)
    }

    fn expected_network_blocks(&self, hashrate_eh: f64) -> f64 {
        (hashrate_eh * HASHES_PER_EH * self.inputs.duration_days * SECONDS_PER_DAY)
            / (self.market.difficulty * MAX_U32_TARGET)
    }

    fn expected_ocean_blocks(&self) -> Option<f64> {
        self.market
            .ocean_average_time_to_block_hours
            .map(|hours| (self.inputs.duration_days * 24.0) / hours)
    }

    fn price_btc_per_eh_day(&self) -> f64 {
        (self.inputs.price_sats_per_ph_day * 1_000.0) / 100_000_000.0
    }

    fn gross_block_reward_btc(&self) -> f64 {
        BLOCK_SUBSIDY_BTC + self.market.ocean_average_block_tx_fees_btc.unwrap_or(0.0)
    }

    fn model_warning(&self) -> String {
        if let Some(fees_btc) = self.market.ocean_average_block_tx_fees_btc {
            return format!(
                "This estimate uses a recent OCEAN block transaction-fee average of {fees_btc:.8} BTC per block, applies OCEAN's 1% DATUM pool fee, and ignores future difficulty changes, fee changes, bid slippage, exact OCEAN TIDES payout accounting, and mining variance."
            );
        }

        "Recent OCEAN block transaction-fee data is unavailable, so this estimate uses subsidy only, applies OCEAN's 1% DATUM pool fee, and ignores future difficulty changes, fee changes, bid slippage, exact OCEAN TIDES payout accounting, and mining variance.".to_string()
    }

    fn exceeds_top_ask_liquidity(&self, results: &CalculatorResults) -> bool {
        let Some(top_ask_hashrate_ph) = self.market.top_ask_hashrate_ph else {
            return false;
        };

        results.hashrate_ph > top_ask_hashrate_ph && self.selected_best_ask()
    }

    fn selected_best_ask(&self) -> bool {
        let default_price = self.market.best_ask_sats_per_eh_day / 1_000.0;
        (self.inputs.price_sats_per_ph_day - default_price).abs() < 0.000_001
    }
}

pub fn validate_inputs(inputs: CalculatorInputs) -> Result<CalculatorInputs, Vec<FieldError>> {
    let validator = InputValidator::new(inputs);
    validator.validate()
}

fn probability_at_least_one(lambda: f64) -> f64 {
    1.0 - (-lambda).exp()
}

fn probability_at_least_two(lambda: f64) -> f64 {
    1.0 - (-lambda).exp() * (1.0 + lambda)
}

fn one_block_shortfall_pct(expected_ocean_blocks: f64) -> f64 {
    100.0 / expected_ocean_blocks
}

struct InputValidator {
    inputs: CalculatorInputs,
    errors: Vec<FieldError>,
}

impl InputValidator {
    fn new(inputs: CalculatorInputs) -> Self {
        Self {
            inputs,
            errors: Vec::new(),
        }
    }

    fn validate(mut self) -> Result<CalculatorInputs, Vec<FieldError>> {
        self.validate_range(
            "budget_usd",
            self.inputs.budget_usd,
            1.0,
            10_000_000.0,
            "Budget must be between $1 and $10,000,000",
        );
        self.validate_range(
            "duration_days",
            self.inputs.duration_days,
            MIN_DURATION_DAYS,
            MAX_DURATION_DAYS,
            "Duration must be between 7 and 90 days",
        );
        self.validate_range(
            "price_sats_per_ph_day",
            self.inputs.price_sats_per_ph_day,
            1.0,
            1_000_000.0,
            "Hashpower price must be between 1 and 1,000,000 sats/PH/day",
        );

        if self.errors.is_empty() {
            Ok(self.inputs)
        } else {
            Err(self.errors)
        }
    }

    fn validate_range(&mut self, field: &str, value: f64, min: f64, max: f64, message: &str) {
        if value.is_finite() && value >= min && value <= max {
            return;
        }

        self.errors.push(FieldError {
            field: field.to_string(),
            message: message.to_string(),
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn market() -> MarketSnapshot {
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
    fn fixed_budget_expected_value_is_duration_invariant() {
        let seven_day_inputs = CalculatorInputs {
            budget_usd: 1_000.0,
            duration_days: 7.0,
            price_sats_per_ph_day: 44_981.0,
        };
        let thirty_day_inputs = CalculatorInputs {
            duration_days: 30.0,
            ..seven_day_inputs.clone()
        };

        let market = market();
        let seven_day = HashpowerCalculator::new(&seven_day_inputs, &market).results();
        let thirty_day = HashpowerCalculator::new(&thirty_day_inputs, &market).results();

        assert!(
            (seven_day.expected_mined_btc - thirty_day.expected_mined_btc).abs()
                < 0.000_000_000_001
        );
        assert!(seven_day.hashrate_ph > thirty_day.hashrate_ph);
    }

    #[test]
    fn defaults_to_thirty_days() {
        let market = market();
        let inputs = QueryInput::default()
            .with_market_defaults(&market)
            .expect("expected valid default inputs");

        assert_eq!(inputs.duration_days, 30.0);
    }

    #[test]
    fn validates_inputs() {
        let result = validate_inputs(CalculatorInputs {
            budget_usd: 0.0,
            duration_days: 1.0,
            price_sats_per_ph_day: f64::NAN,
        });

        let errors = result.expect_err("expected validation errors");
        assert_eq!(errors.len(), 3);
    }

    #[test]
    fn applies_ocean_datum_pool_fee() {
        let inputs = CalculatorInputs {
            budget_usd: 1_000.0,
            duration_days: 7.0,
            price_sats_per_ph_day: 44_981.0,
        };
        let market = market();
        let results = HashpowerCalculator::new(&inputs, &market).results();
        let gross_block_reward_btc =
            BLOCK_SUBSIDY_BTC + market.ocean_average_block_tx_fees_btc.unwrap();
        let gross_mined_btc = results.expected_network_blocks * gross_block_reward_btc;

        assert!((results.expected_mined_btc - gross_mined_btc * 0.99).abs() < 0.000_000_000_001);
    }

    #[test]
    fn calculates_ocean_poisson_probabilities() {
        let inputs = CalculatorInputs {
            budget_usd: 1_000.0,
            duration_days: 7.0,
            price_sats_per_ph_day: 44_981.0,
        };
        let market = market();
        let results = HashpowerCalculator::new(&inputs, &market).results();

        assert!((results.expected_ocean_blocks.unwrap() - 15.272_727_272_7).abs() < 0.000_000_1);
        assert!(
            (results.one_ocean_block_shortfall_pct.unwrap() - 6.547_619_047_6).abs() < 0.000_000_1
        );
        assert!(results.probability_at_least_one_ocean_block.unwrap() > 0.999);
        assert!(results.probability_at_least_two_ocean_blocks.unwrap() > 0.999);
    }
}
