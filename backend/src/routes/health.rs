//! Health check endpoints

use axum::Json;
use serde::Serialize;
use std::time::Instant;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: String,
    pub prover_api: ProverApiHealth,
    pub mock_mode: bool,
}

/// Prover API health status
#[derive(Serialize)]
pub struct ProverApiHealth {
    pub url: String,
    pub reachable: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

/// Overall system health check endpoint
pub async fn health_check() -> Json<HealthResponse> {
    let mock_mode = std::env::var("MOCK_MODE")
        .map(|v| v == "true")
        .unwrap_or(true);

    let api_url = std::env::var("CHARMS_PROVE_API_URL")
        .unwrap_or_else(|_| "https://v8.charms.dev/spells/prove".to_string());

    let prover_health = check_prover_api_internal(&api_url).await;

    let status = if prover_health.reachable || mock_mode {
        "healthy"
    } else {
        "degraded"
    };

    Json(HealthResponse {
        status: status.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        prover_api: prover_health,
        mock_mode,
    })
}

/// Check only the Prover API status
pub async fn check_prover_api() -> Json<ProverApiHealth> {
    let api_url = std::env::var("CHARMS_PROVE_API_URL")
        .unwrap_or_else(|_| "https://v8.charms.dev/spells/prove".to_string());

    Json(check_prover_api_internal(&api_url).await)
}

/// Internal function to check Prover API reachability
async fn check_prover_api_internal(api_url: &str) -> ProverApiHealth {
    let start = Instant::now();

    tracing::debug!("🏥 Health check: Testing Prover API at {}", api_url);

    // Create a client with short timeout for health checks (5 seconds)
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("❌ Failed to build HTTP client for health check: {}", e);
            return ProverApiHealth {
                url: api_url.to_string(),
                reachable: false,
                latency_ms: None,
                error: Some(format!("Client build error: {}", e)),
            };
        }
    };

    // Try to connect to the API (HEAD request to avoid full request overhead)
    match client.head(api_url).send().await {
        Ok(response) => {
            let latency = start.elapsed().as_millis() as u64;
            let status = response.status();

            tracing::debug!("✅ Prover API reachable (status: {}, latency: {}ms)", status, latency);

            ProverApiHealth {
                url: api_url.to_string(),
                reachable: true,
                latency_ms: Some(latency),
                error: None,
            }
        }
        Err(e) => {
            tracing::warn!("⚠️  Prover API unreachable: {}", e);

            ProverApiHealth {
                url: api_url.to_string(),
                reachable: false,
                latency_ms: None,
                error: Some(e.to_string()),
            }
        }
    }
}

