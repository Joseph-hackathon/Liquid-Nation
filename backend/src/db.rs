//! Database module for PostgreSQL persistence
//!
//! Handles order and transaction storage using Prisma Postgres

use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};

pub type DbPool = Pool<Postgres>;

/// Initialize the database connection pool and run migrations
pub async fn init_db() -> Result<DbPool> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| {
            // Default Prisma Postgres connection string
            "postgres://ef199c3414d636146a178aa16f6e8d5496c5c31bf8bc20c3b7df5c52bb54fd8d:sk_nM1NU3XuvG27SKJv-C-di@db.prisma.io:5432/postgres?sslmode=require".to_string()
        });

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

/// Create tables if they don't exist
async fn run_migrations(pool: &DbPool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(255) PRIMARY KEY,
            maker_address VARCHAR(255) NOT NULL,
            offer_token VARCHAR(100) NOT NULL,
            offer_amount VARCHAR(100) NOT NULL,
            want_token VARCHAR(100) NOT NULL,
            want_amount VARCHAR(100) NOT NULL,
            source_chain VARCHAR(50) NOT NULL,
            dest_chain VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pendingsignature',
            allow_partial BOOLEAN NOT NULL DEFAULT false,
            filled_amount VARCHAR(100) DEFAULT '0',
            expiry_height BIGINT,
            utxo_id VARCHAR(255),
            tx_id VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(255) PRIMARY KEY,
            order_id VARCHAR(255) NOT NULL,
            tx_type VARCHAR(50) NOT NULL,
            tx_hex TEXT,
            txid VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            signed_at TIMESTAMP,
            broadcast_at TIMESTAMP,
            confirmed_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS escrows (
            id VARCHAR(255) PRIMARY KEY,
            order_id VARCHAR(255),
            depositor_address VARCHAR(255) NOT NULL,
            recipient_address VARCHAR(255) NOT NULL,
            amount VARCHAR(100) NOT NULL,
            token VARCHAR(100) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            lock_time BIGINT,
            hashlock VARCHAR(255),
            preimage VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes for better query performance
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)")
        .execute(pool)
        .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_orders_maker ON orders(maker_address)")
        .execute(pool)
        .await?;
    
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id)")
        .execute(pool)
        .await?;

    tracing::info!("Database migrations completed");
    Ok(())
}

/// Order record for database
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize, serde::Deserialize)]
pub struct OrderRecord {
    pub id: String,
    pub maker_address: String,
    pub offer_token: String,
    pub offer_amount: String,
    pub want_token: String,
    pub want_amount: String,
    pub source_chain: String,
    pub dest_chain: String,
    pub status: String,
    pub allow_partial: bool,
    pub filled_amount: Option<String>,
    pub expiry_height: Option<i64>,
    pub utxo_id: Option<String>,
    pub tx_id: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Transaction record for database
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize, serde::Deserialize)]
pub struct TransactionRecord {
    pub id: String,
    pub order_id: String,
    pub tx_type: String,
    pub tx_hex: Option<String>,
    pub txid: Option<String>,
    pub status: String,
    pub signed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub broadcast_at: Option<chrono::DateTime<chrono::Utc>>,
    pub confirmed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// ============================================
// Order CRUD Operations
// ============================================

/// Insert a new order
pub async fn insert_order(pool: &DbPool, order: &OrderRecord) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO orders (
            id, maker_address, offer_token, offer_amount,
            want_token, want_amount, source_chain, dest_chain,
            status, allow_partial, filled_amount, expiry_height,
            utxo_id, tx_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        "#,
    )
    .bind(&order.id)
    .bind(&order.maker_address)
    .bind(&order.offer_token)
    .bind(&order.offer_amount)
    .bind(&order.want_token)
    .bind(&order.want_amount)
    .bind(&order.source_chain)
    .bind(&order.dest_chain)
    .bind(&order.status)
    .bind(order.allow_partial)
    .bind(&order.filled_amount)
    .bind(order.expiry_height)
    .bind(&order.utxo_id)
    .bind(&order.tx_id)
    .bind(order.created_at)
    .bind(order.updated_at)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get all orders
pub async fn get_all_orders(pool: &DbPool) -> Result<Vec<OrderRecord>> {
    let orders = sqlx::query_as::<_, OrderRecord>(
        "SELECT * FROM orders ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await?;

    Ok(orders)
}

/// Get order by ID
pub async fn get_order_by_id(pool: &DbPool, id: &str) -> Result<Option<OrderRecord>> {
    let order = sqlx::query_as::<_, OrderRecord>(
        "SELECT * FROM orders WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(order)
}

/// Update order status
pub async fn update_order_status(pool: &DbPool, id: &str, status: &str) -> Result<()> {
    let now = chrono::Utc::now();
    sqlx::query("UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3")
        .bind(status)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Update order transaction ID
pub async fn update_order_tx_id(pool: &DbPool, id: &str, tx_id: &str) -> Result<()> {
    let now = chrono::Utc::now();
    sqlx::query("UPDATE orders SET tx_id = $1, updated_at = $2 WHERE id = $3")
        .bind(tx_id)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Delete order by ID
pub async fn delete_order(pool: &DbPool, id: &str) -> Result<()> {
    sqlx::query("DELETE FROM orders WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}

// ============================================
// Transaction CRUD Operations
// ============================================

/// Insert a new transaction record
pub async fn insert_transaction(pool: &DbPool, tx: &TransactionRecord) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO transactions (
            id, order_id, tx_type, tx_hex, txid,
            status, signed_at, broadcast_at, confirmed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(&tx.id)
    .bind(&tx.order_id)
    .bind(&tx.tx_type)
    .bind(&tx.tx_hex)
    .bind(&tx.txid)
    .bind(&tx.status)
    .bind(tx.signed_at)
    .bind(tx.broadcast_at)
    .bind(tx.confirmed_at)
    .bind(tx.created_at)
    .execute(pool)
    .await?;

    Ok(())
}

/// Get transactions by order ID
pub async fn get_transactions_by_order(pool: &DbPool, order_id: &str) -> Result<Vec<TransactionRecord>> {
    let txs = sqlx::query_as::<_, TransactionRecord>(
        "SELECT * FROM transactions WHERE order_id = $1 ORDER BY created_at DESC"
    )
    .bind(order_id)
    .fetch_all(pool)
    .await?;

    Ok(txs)
}

/// Update transaction status
pub async fn update_transaction_status(
    pool: &DbPool,
    id: &str,
    status: &str,
    txid: Option<&str>,
) -> Result<()> {
    let now = chrono::Utc::now();
    
    if let Some(txid) = txid {
        sqlx::query("UPDATE transactions SET status = $1, txid = $2, broadcast_at = $3 WHERE id = $4")
            .bind(status)
            .bind(txid)
            .bind(now)
            .bind(id)
            .execute(pool)
            .await?;
    } else {
        sqlx::query("UPDATE transactions SET status = $1 WHERE id = $2")
            .bind(status)
            .bind(id)
            .execute(pool)
            .await?;
    }

    Ok(())
}

