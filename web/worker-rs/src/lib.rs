mod cache;
mod calculator;
mod market;
mod types;

use cache::MarketCache;
use calculator::{HashpowerCalculator, QueryInput};
use js_sys::Date;
use types::{ApiError, ApiErrorResponse, CalculatorWarning, HashpowerCalculatorResponse};
use worker::{Env, Request, Response, Result, event};

const CANONICAL_HOSTNAME: &str = "rentsomehash.com";
const WWW_CANONICAL_HOSTNAME: &str = "www.rentsomehash.com";

#[event(fetch)]
pub async fn fetch(request: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
    if let Some(response) = canonical_redirect(&request)? {
        return Ok(response);
    }

    if request.path() == "/api/hashpower-calculator" {
        return hashpower_calculator(request, env).await;
    }

    env.assets("ASSETS")?.fetch_request(request).await
}

async fn hashpower_calculator(request: Request, env: Env) -> Result<Response> {
    let query = parse_query(&request)?;
    let mut cache_result = match MarketCache::from_env(&env, now()).market().await {
        Ok(result) => result,
        Err(error) => return json_error(503, "MARKET_DATA_UNAVAILABLE", &error),
    };

    let inputs = match query.with_market_defaults(&cache_result.market) {
        Ok(inputs) => inputs,
        Err(fields) => {
            let error = ApiErrorResponse {
                error: ApiError {
                    code: "INVALID_INPUT".to_string(),
                    message: "Calculator input is invalid".to_string(),
                    fields,
                },
            };
            return Ok(Response::from_json(&error)?.with_status(400));
        }
    };

    let calculator = HashpowerCalculator::new(&inputs, &cache_result.market);
    let results = calculator.results();
    let mut warnings = calculator.warnings(&results);
    warnings.append(&mut cache_result.warnings);

    Response::from_json(&HashpowerCalculatorResponse {
        inputs,
        market: cache_result.market,
        results,
        warnings: unique_warnings(warnings),
        stale: cache_result.stale,
        cache_mode: cache_result.cache_mode,
    })
}

fn canonical_redirect(request: &Request) -> Result<Option<Response>> {
    let mut url = request.url()?;

    if url.scheme() == "https" && url.host_str() != Some(WWW_CANONICAL_HOSTNAME) {
        return Ok(None);
    }

    set_canonical_url(&mut url)?;
    Ok(Some(Response::redirect_with_status(url, 308)?))
}

fn set_canonical_url(url: &mut url::Url) -> Result<()> {
    url.set_scheme("https")
        .map_err(|_| worker::Error::RustError("failed to set canonical scheme".to_string()))?;
    url.set_host(Some(CANONICAL_HOSTNAME)).map_err(|error| {
        worker::Error::RustError(format!("failed to set canonical host: {error}"))
    })?;
    url.set_port(None)
        .map_err(|_| worker::Error::RustError("failed to clear canonical port".to_string()))
}

fn parse_query(request: &Request) -> Result<QueryInput> {
    let url = request.url()?;
    let mut query = QueryInput::default();

    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "budget_usd" => query.budget_usd = parse_optional_number(&value),
            "duration_days" => query.duration_days = parse_optional_number(&value),
            "price_sats_per_ph_day" => {
                query.price_sats_per_ph_day = parse_optional_number(&value);
            }
            _ => {}
        }
    }

    Ok(query)
}

fn parse_optional_number(value: &str) -> Option<f64> {
    if value.trim().is_empty() {
        return Some(f64::NAN);
    }

    Some(value.parse().unwrap_or(f64::NAN))
}

fn json_error(status: u16, code: &str, message: &str) -> Result<Response> {
    let response = ApiErrorResponse {
        error: ApiError {
            code: code.to_string(),
            message: message.to_string(),
            fields: Vec::new(),
        },
    };

    Ok(Response::from_json(&response)?.with_status(status))
}

fn unique_warnings(warnings: Vec<CalculatorWarning>) -> Vec<CalculatorWarning> {
    let mut unique = Vec::new();

    for warning in warnings {
        if unique
            .iter()
            .any(|seen: &CalculatorWarning| seen.code == warning.code)
        {
            continue;
        }

        unique.push(warning);
    }

    unique
}

fn now() -> u32 {
    (Date::now() / 1_000.0) as u32
}
