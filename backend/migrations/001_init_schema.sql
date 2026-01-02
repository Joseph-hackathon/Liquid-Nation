-- Liquid Nation Database Schema
-- Initial migration

-- Orders table
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
);

-- Transactions table
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
);

-- Escrows table
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
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_maker ON orders(maker_address);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrows_order ON escrows(order_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

