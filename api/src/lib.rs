mod cache;
mod calculator;
mod http;
mod market;
mod query;
mod types;

use std::collections::HashSet;

use cache::MarketCache;
use calculator::HashpowerCalculator;
use http::{error_response, json_error, json_response};
use js_sys::Date;
use query::parse_query;
use types::{
    ApiError, ApiErrorCode, ApiErrorResponse, CalculatorWarning, HashpowerCalculatorResponse,
};
use worker::{Env, Request, Response, Result, event};

#[event(fetch)]
pub async fn fetch(request: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
    if request.path() == "/api/hashpower-calculator" {
        return hashpower_calculator(request, env).await;
    }

    Response::error("Not Found", 404)
}

async fn hashpower_calculator(request: Request, env: Env) -> Result<Response> {
    let query = parse_query(&request)?;
    let mut cache_result = match MarketCache::from_env(&env, now()).market().await {
        Ok(result) => result,
        Err(error) => return json_error(503, ApiErrorCode::MarketDataUnavailable, &error),
    };

    let inputs = match query.with_market_defaults(&cache_result.market) {
        Ok(inputs) => inputs,
        Err(fields) => {
            return error_response(
                400,
                &ApiErrorResponse {
                    error: ApiError {
                        code: ApiErrorCode::InvalidInput,
                        message: "Calculator input is invalid".to_string(),
                        fields,
                    },
                },
            );
        }
    };

    let calculator = HashpowerCalculator::new(&inputs, &cache_result.market);
    let results = calculator.results();
    let mut warnings = calculator.warnings(&results);
    warnings.append(&mut cache_result.warnings);

    json_response(
        &request,
        &HashpowerCalculatorResponse {
            inputs,
            market: cache_result.market,
            results,
            warnings: unique_warnings(warnings),
            stale: cache_result.stale,
            cache_mode: cache_result.cache_mode,
        },
    )
}

fn unique_warnings(warnings: Vec<CalculatorWarning>) -> Vec<CalculatorWarning> {
    let mut seen = HashSet::new();
    warnings
        .into_iter()
        .filter(|w| seen.insert(w.code.clone()))
        .collect()
}

fn now() -> u32 {
    (Date::now() / 1_000.0) as u32
}
