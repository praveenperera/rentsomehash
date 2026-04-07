mod cache;
mod calculator;
mod market;
mod types;

use cache::MarketCache;
use calculator::{HashpowerCalculator, QueryInput};
use js_sys::Date;
use serde::Serialize;
use types::{ApiError, ApiErrorResponse, CalculatorWarning, HashpowerCalculatorResponse};
use worker::{Env, Request, Response, Result, event};

const API_CACHE_CONTROL: &str = "public, max-age=120, stale-while-revalidate=60";
const ERROR_CACHE_CONTROL: &str = "no-store";
const JSON_CONTENT_TYPE: &str = "application/json; charset=utf-8";
const VARY_HEADER_VALUE: &str = "Accept-Encoding";

#[event(fetch)]
pub async fn fetch(request: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
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
            return error_response(
                400,
                &ApiErrorResponse {
                    error: ApiError {
                        code: "INVALID_INPUT".to_string(),
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

fn json_response<T>(request: &Request, body: &T) -> Result<Response>
where
    T: Serialize,
{
    let body = serde_json::to_vec(body)
        .map_err(|error| worker::Error::RustError(format!("failed to serialize JSON: {error}")))?;
    let etag = response_etag(&body);

    if request_matches_etag(request, &etag)? {
        let mut response = Response::empty()?.with_status(304);
        set_api_headers(&mut response, &etag)?;
        return Ok(response);
    }

    let mut response = Response::builder().with_status(200).fixed(body);
    set_api_headers(&mut response, &etag)?;
    response
        .headers_mut()
        .set("Content-Type", JSON_CONTENT_TYPE)?;

    Ok(response)
}

fn error_response(status: u16, body: &ApiErrorResponse) -> Result<Response> {
    let mut response = Response::from_json(body)?.with_status(status);
    response
        .headers_mut()
        .set("Cache-Control", ERROR_CACHE_CONTROL)?;
    Ok(response)
}

fn set_api_headers(response: &mut Response, etag: &str) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("Cache-Control", API_CACHE_CONTROL)?;
    headers.set("ETag", etag)?;
    headers.set("Vary", VARY_HEADER_VALUE)?;
    Ok(())
}

fn request_matches_etag(request: &Request, etag: &str) -> Result<bool> {
    let Some(if_none_match) = request.headers().get("If-None-Match")? else {
        return Ok(false);
    };

    Ok(if_none_match
        .split(',')
        .map(str::trim)
        .any(|candidate| candidate == "*" || candidate == etag))
}

fn response_etag(body: &[u8]) -> String {
    format!("W/\"{}\"", blake3::hash(body).to_hex())
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
    error_response(
        status,
        &ApiErrorResponse {
            error: ApiError {
                code: code.to_string(),
                message: message.to_string(),
                fields: Vec::new(),
            },
        },
    )
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
