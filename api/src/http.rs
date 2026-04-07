use serde::Serialize;
use worker::{Request, Response, Result};

use crate::types::{ApiError, ApiErrorCode, ApiErrorResponse};

const API_CACHE_CONTROL: &str = "public, max-age=120, stale-while-revalidate=60";
const ERROR_CACHE_CONTROL: &str = "no-store";
const JSON_CONTENT_TYPE: &str = "application/json; charset=utf-8";
const VARY_HEADER_VALUE: &str = "Accept-Encoding";

pub fn json_response<T>(request: &Request, body: &T) -> Result<Response>
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

pub fn error_response(status: u16, body: &ApiErrorResponse) -> Result<Response> {
    let mut response = Response::from_json(body)?.with_status(status);
    response
        .headers_mut()
        .set("Cache-Control", ERROR_CACHE_CONTROL)?;
    Ok(response)
}

pub fn json_error(status: u16, code: ApiErrorCode, message: &str) -> Result<Response> {
    error_response(
        status,
        &ApiErrorResponse {
            error: ApiError {
                code,
                message: message.to_string(),
                fields: Vec::new(),
            },
        },
    )
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
