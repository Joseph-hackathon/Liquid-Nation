//! Liquid Nation Backend API Server
//! 
//! This server provides REST API endpoints for:
//! - Order management (create, list, fill, cancel)
//! - Wallet operations
//! - Escrow management
//! - Charms protocol integration

mod db;
mod routes;
mod services;

use axum::{
    Router,
    routing::{get, post, delete},
};
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;

use routes::{health, orders, wallet, spells, escrow};
use services::bitcoin::BitcoinService;
use services::charms::CharmsService;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env()
            .add_directive("liquid_nation_backend=debug".parse()?))
        .init();

    tracing::info!("Starting Liquid Nation API Server");

    // Initialize database
    let db_pool = db::init_db().await?;
    tracing::info!("Database initialized");

    // Initialize services
    let bitcoin_rpc = std::env::var("BITCOIN_RPC_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:48332".to_string());
    let bitcoin_service = BitcoinService::new(&bitcoin_rpc);
    let charms_service = CharmsService::new();

    // Create shared order state with database
    let order_state = Arc::new(orders::AppState {
        charms: charms_service,
        bitcoin: bitcoin_service,
        db: db_pool.clone(),
    });

    // Initialize escrow state with cloned services
    let bitcoin_service_escrow = BitcoinService::new(&bitcoin_rpc);
    let charms_service_escrow = CharmsService::new();
    let escrow_state = Arc::new(escrow::EscrowState {
        charms: Arc::new(charms_service_escrow),
        bitcoin: Arc::new(bitcoin_service_escrow),
        escrows: RwLock::new(Vec::new()),
    });

    // Build application routes
    let app = Router::new()
        // Health check
        .route("/health", get(health::health_check))
        .route("/api/health", get(health::health_check))
        
        // Orders (with state)
        .route("/api/orders", get(orders::list_orders))
        .route("/api/orders", post(orders::create_order))
        .route("/api/orders/:id", get(orders::get_order))
        .route("/api/orders/:id/fill", post(orders::fill_order))
        .route("/api/orders/:id/cancel", delete(orders::cancel_order))
        .route("/api/orders/:id/partial-fill", post(orders::partial_fill_order))
        .route("/api/orders/:id/broadcast", post(orders::broadcast_order))
        .with_state(order_state)
        
        // Wallet
        .route("/api/wallet/connect", post(wallet::connect_wallet))
        .route("/api/wallet/balance", get(wallet::get_balance))
        .route("/api/wallet/utxos", get(wallet::get_utxos))
        .route("/api/wallet/address", get(wallet::get_address))
        
        // Escrow
        .nest("/api/escrows", escrow::router(escrow_state))
        
        // Spells (Charms protocol)
        .route("/api/spells/prove", post(spells::prove_spell))
        .route("/api/spells/broadcast", post(spells::broadcast_transaction))
        .route("/api/spells/status/:txid", get(spells::get_transaction_status))
        
        // CORS
        .layer(CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any))
        
        // Tracing
        .layer(TraceLayer::new_for_http());

    // Get port from environment or default
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
