use url::form_urlencoded;
use worker::{Request, Result};

use crate::calculator::QueryInput;

pub fn parse_query(request: &Request) -> Result<QueryInput> {
    let url = request.url()?;
    Ok(parse_query_string(url.query().unwrap_or_default()))
}

fn parse_query_string(query_string: &str) -> QueryInput {
    let mut query = QueryInput::default();

    for (key, value) in form_urlencoded::parse(query_string.as_bytes()) {
        match key.as_ref() {
            "budget_usd" => query.budget_usd = parse_present_number(&value),
            "duration_days" => query.duration_days = parse_present_number(&value),
            "price_sats_per_ph_day" => {
                query.price_sats_per_ph_day = parse_present_number(&value);
            }
            _ => {}
        }
    }

    query
}

fn parse_present_number(value: &str) -> Option<f64> {
    if value.trim().is_empty() {
        return Some(f64::NAN);
    }

    Some(value.parse().unwrap_or(f64::NAN))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leaves_missing_numbers_unset() {
        let query = parse_query_string("");

        assert_eq!(query.budget_usd, None);
        assert_eq!(query.duration_days, None);
        assert_eq!(query.price_sats_per_ph_day, None);
    }

    #[test]
    fn parses_valid_numbers() {
        let query =
            parse_query_string("budget_usd=1000&duration_days=30&price_sats_per_ph_day=45000");

        assert_eq!(query.budget_usd, Some(1_000.0));
        assert_eq!(query.duration_days, Some(30.0));
        assert_eq!(query.price_sats_per_ph_day, Some(45_000.0));
    }

    #[test]
    fn marks_empty_numbers_invalid() {
        let query = parse_query_string("budget_usd=&duration_days=&price_sats_per_ph_day=");

        assert!(query.budget_usd.unwrap().is_nan());
        assert!(query.duration_days.unwrap().is_nan());
        assert!(query.price_sats_per_ph_day.unwrap().is_nan());
    }

    #[test]
    fn marks_unparseable_numbers_invalid() {
        let query =
            parse_query_string("budget_usd=abc&duration_days=def&price_sats_per_ph_day=ghi");

        assert!(query.budget_usd.unwrap().is_nan());
        assert!(query.duration_days.unwrap().is_nan());
        assert!(query.price_sats_per_ph_day.unwrap().is_nan());
    }
}
