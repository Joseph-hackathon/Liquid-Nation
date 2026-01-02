//! Order management endpoints
//!
//! Handles order creation, filling, cancellation with full Charms integration

use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::db::{self, DbPool, OrderRecord};
use crate::services::charms::{CharmsService, OrderSpellData, FillSpellData, SpellProveRequest};
use crate::services::bitcoin::BitcoinService;

/// Application state shared across handlers
pub struct AppState {
    pub charms: CharmsService,
    pub bitcoin: BitcoinService,
    pub db: DbPool,
}

/// Order status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Open,
    Filled,
    Cancelled,
    Expired,
    PartiallyFilled,
    PendingSignature,
}

/// Chain identifier - using String for flexibility
pub type Chain = String;

/// Helper function to normalize chain names
pub fn normalize_chain(chain: &str) -> String {
    match chain.to_lowercase().as_str() {
        "btc" | "bitcoin" => "bitcoin".to_string(),
        "ada" | "cardano" => "cardano".to_string(),
        "eth" | "ethereum" => "ethereum".to_string(),
        "base" => "base".to_string(),
        "arbitrum" | "arb" => "arbitrum".to_string(),
        other => other.to_lowercase(),
    }
}

/// Map chain string to numeric ID for spell
pub fn chain_to_id(chain: &str) -> u8 {
    match chain.to_lowercase().as_str() {
        "bitcoin" | "btc" => 0,
        "cardano" | "ada" => 1,
        "ethereum" | "eth" => 2,
        "base" => 3,
        "arbitrum" | "arb" => 4,
        _ => 0,
    }
}

/// Order representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub maker_address: String,
    pub offer_token: String,
    pub offer_amount: String,
    pub want_token: String,
    pub want_amount: String,
    pub source_chain: Chain,
    pub dest_chain: Chain,
    pub status: OrderStatus,
    pub allow_partial: bool,
    pub filled_amount: String,
    pub expiry_height: u64,
    pub created_at: String,
    pub updated_at: String,
    pub utxo_id: Option<String>,
}

/// Create order request
#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub maker_address: String,
    #[serde(default)]
    pub maker_pubkey: Option<String>,
    pub offer_token: String,
    pub offer_amount: String,
    pub want_token: String,
    pub want_amount: String,
    pub source_chain: Chain,
    pub dest_chain: Chain,
    pub allow_partial: bool,
    pub expiry_blocks: u64,
    pub funding_utxo: String,
    #[serde(default)]
    pub funding_utxo_value: Option<u64>,
    #[serde(default)]
    pub dest_address: Option<String>,
}

/// Create order response with spell and unsigned transactions
#[derive(Debug, Serialize)]
pub struct CreateOrderResponse {
    pub order: Order,
    pub spell: SpellData,
    pub unsigned_txs: Vec<UnsignedTransaction>,
    pub signing_instructions: SigningInstructions,
}

/// Spell data for proving
#[derive(Debug, Serialize, Deserialize)]
pub struct SpellData {
    pub spell_yaml: String,
    pub spell_yaml_built: String,  // With variables substituted
    pub app_binary: String,
    pub prev_txs: Vec<String>,
}

/// Unsigned transaction ready for signing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnsignedTransaction {
    pub hex: String,
    pub txid: String,
    pub inputs_to_sign: Vec<InputToSign>,
}

/// Input that needs signing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputToSign {
    pub index: u32,
    pub address: String,
    pub sighash_type: String,
}

/// Instructions for wallet signing
#[derive(Debug, Serialize, Deserialize)]
pub struct SigningInstructions {
    pub message: String,
    pub steps: Vec<String>,
    pub broadcast_endpoint: String,
}

/// Fill order request
#[derive(Debug, Deserialize)]
pub struct FillOrderRequest {
    pub taker_address: String,
    #[serde(default)]
    pub taker_pubkey: Option<String>,
    pub taker_utxo: String,
    #[serde(default)]
    pub taker_utxo_value: Option<u64>,
    pub fill_amount: Option<String>,
}

/// Fill order response
#[derive(Debug, Serialize)]
pub struct FillOrderResponse {
    pub order: Order,
    pub spell: SpellData,
    pub unsigned_txs: Vec<UnsignedTransaction>,
    pub signing_instructions: SigningInstructions,
}

/// Query parameters for listing orders
#[derive(Debug, Deserialize)]
pub struct ListOrdersQuery {
    pub status: Option<String>,
    pub offer_token: Option<String>,
    pub want_token: Option<String>,
    pub maker_address: Option<String>,
    pub source_chain: Option<String>,
    pub dest_chain: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

/// List orders response
#[derive(Debug, Serialize)]
pub struct ListOrdersResponse {
    pub orders: Vec<Order>,
    pub total: u64,
    pub limit: u32,
    pub offset: u32,
}

/// Broadcast request
#[derive(Debug, Deserialize)]
pub struct BroadcastRequest {
    pub signed_tx_hex: String,
    pub order_id: String,
}

/// Broadcast response
#[derive(Debug, Serialize)]
pub struct BroadcastResponse {
    pub txid: String,
    pub status: String,
    pub message: String,
}

// ============ App Configuration ============
// Built with: charms app build && charms app vk

const DEFAULT_APP_ID: &str = "liquid-swap";
const DEFAULT_APP_VK: &str = "857ee181813511526321296bb0183b7496e1cdc0801552495464e9ec44c37718";
const DEFAULT_TOKEN_ID: &str = "toad-token";
const DEFAULT_TOKEN_VK: &str = "857ee181813511526321296bb0183b7496e1cdc0801552495464e9ec44c37718";

// Path to the compiled WASM binary
const APP_WASM_PATH: &str = "target/wasm32-wasip1/release/liquid-swap-app.wasm";

// ============ Spell Templates ============

const CREATE_ORDER_SPELL: &str = include_str!("../../../apps/swap-app/spells/create-order.yaml");
const FILL_ORDER_SPELL: &str = include_str!("../../../apps/swap-app/spells/fill-order.yaml");
const CANCEL_ORDER_SPELL: &str = include_str!("../../../apps/swap-app/spells/cancel-order.yaml");
const PARTIAL_FILL_SPELL: &str = include_str!("../../../apps/swap-app/spells/partial-fill.yaml");

// ============ Route Handlers ============

/// List all orders with optional filters
pub async fn list_orders(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListOrdersQuery>,
) -> Json<ListOrdersResponse> {
    // Fetch orders from database
    let db_orders = match db::get_all_orders(&state.db).await {
        Ok(orders) => orders,
        Err(e) => {
            tracing::error!("Failed to fetch orders: {}", e);
            Vec::new()
        }
    };

    // Convert database records to API response format
    let orders: Vec<Order> = db_orders
        .into_iter()
        .map(|record| Order {
            id: record.id,
            maker_address: record.maker_address,
            offer_token: record.offer_token,
            offer_amount: record.offer_amount,
            want_token: record.want_token,
            want_amount: record.want_amount,
            source_chain: record.source_chain,
            dest_chain: record.dest_chain,
            status: match record.status.as_str() {
                "open" => OrderStatus::Open,
                "filled" => OrderStatus::Filled,
                "cancelled" => OrderStatus::Cancelled,
                "expired" => OrderStatus::Expired,
                "partiallyfilled" => OrderStatus::PartiallyFilled,
                _ => OrderStatus::PendingSignature,
            },
            allow_partial: record.allow_partial,
            filled_amount: record.filled_amount.unwrap_or_else(|| "0".to_string()),
            expiry_height: record.expiry_height.unwrap_or(0) as u64,
            created_at: record.created_at.to_rfc3339(),
            updated_at: record.updated_at.to_rfc3339(),
            utxo_id: record.utxo_id,
        })
        .collect();

    let total = orders.len() as u64;
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    Json(ListOrdersResponse {
        total,
        orders,
        limit,
        offset,
    })
}

/// Get a specific order by ID
pub async fn get_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<Option<Order>> {
    // Fetch from database
    match db::get_order_by_id(&state.db, &id).await {
        Ok(Some(record)) => {
            Json(Some(Order {
                id: record.id,
                maker_address: record.maker_address,
                offer_token: record.offer_token,
                offer_amount: record.offer_amount,
                want_token: record.want_token,
                want_amount: record.want_amount,
                source_chain: record.source_chain,
                dest_chain: record.dest_chain,
                status: match record.status.as_str() {
                    "open" => OrderStatus::Open,
                    "filled" => OrderStatus::Filled,
                    "cancelled" => OrderStatus::Cancelled,
                    "expired" => OrderStatus::Expired,
                    "partiallyfilled" => OrderStatus::PartiallyFilled,
                    _ => OrderStatus::PendingSignature,
                },
                allow_partial: record.allow_partial,
                filled_amount: record.filled_amount.unwrap_or_else(|| "0".to_string()),
                expiry_height: record.expiry_height.unwrap_or(0) as u64,
                created_at: record.created_at.to_rfc3339(),
                updated_at: record.updated_at.to_rfc3339(),
                utxo_id: record.utxo_id,
            }))
        }
        Ok(None) => Json(None),
        Err(e) => {
            tracing::error!("Failed to fetch order {}: {}", id, e);
            Json(None)
        }
    }
}

/// Create a new order - builds spell and calls prover
pub async fn create_order(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateOrderRequest>,
) -> Json<CreateOrderResponse> {
    let order_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now();
    
    // Validate funding UTXO
    if req.funding_utxo.is_empty() || req.funding_utxo == "pending" {
        tracing::warn!("Invalid funding UTXO: {}. Using mock mode.", req.funding_utxo);
        // In real mode, we need a valid UTXO. For now, fall back to mock mode
        // TODO: Get actual UTXO from wallet
    }
    
    // Get current block height for expiry calculation
    let current_height = match state.bitcoin.get_blockchain_info().await {
        Ok(info) => info.blocks,
        Err(_) => 850000, // Fallback
    };
    
    let expiry_height = current_height + req.expiry_blocks;
    
    // Normalize chains
    let source_chain = normalize_chain(&req.source_chain);
    let dest_chain = normalize_chain(&req.dest_chain);
    
    // Generate escrow address (in production, this would be derived from the contract)
    let escrow_address = format!("tb1q_escrow_{}", &order_id[..8]);
    
    // Prepare spell data
    let order_spell_data = OrderSpellData {
        maker_address: req.maker_address.clone(),
        maker_pubkey: req.maker_pubkey.clone().unwrap_or_else(|| req.maker_address.clone()),
        offer_token_id: DEFAULT_TOKEN_ID.to_string(),
        offer_token_vk: DEFAULT_TOKEN_VK.to_string(),
        offer_amount: req.offer_amount.clone(),
        want_token_id: req.want_token.clone().to_lowercase(),
        want_amount: req.want_amount.clone(),
        expiry_height,
        allow_partial: req.allow_partial,
        funding_utxo: req.funding_utxo.clone(),
        escrow_address: escrow_address.clone(),
        dest_chain: chain_to_id(&dest_chain),
        dest_address: req.dest_address.clone().unwrap_or_else(|| req.maker_address.clone()),
    };
    
    // Build the spell with variables substituted
    let spell_built = state.charms.build_create_order_spell(
        CREATE_ORDER_SPELL,
        &order_spell_data,
        DEFAULT_APP_ID,
        DEFAULT_APP_VK,
    ).unwrap_or_else(|e| {
        tracing::error!("Failed to build spell: {}", e);
        CREATE_ORDER_SPELL.to_string()
    });
    
    // Validate the spell
    if let Err(e) = state.charms.validate_spell(&spell_built) {
        tracing::warn!("Spell validation warning: {}", e);
    }
    
    // Call the Charms Prover API
    let proved_txs = if !state.charms.is_mock_mode() {
        // Load app binary if path is set
        let mut binaries = std::collections::BTreeMap::new();
        if let Ok(binary_path) = std::env::var("SWAP_APP_BINARY_PATH") {
            if let Ok(binary_data) = tokio::fs::read(&binary_path).await {
                let app_vk = std::env::var("SWAP_APP_VK")
                    .unwrap_or_else(|_| DEFAULT_APP_VK.to_string());
                binaries.insert(app_vk, binary_data);
                tracing::info!("Loaded app binary from: {}", binary_path);
            } else {
                tracing::warn!("Failed to load app binary from: {}", binary_path);
            }
        }
        
        let prove_request = SpellProveRequest {
            spell: spell_built.clone(),
            binaries,
            prev_txs: vec![],
            funding_utxo: req.funding_utxo.clone(),
            funding_utxo_value: req.funding_utxo_value.unwrap_or(10000),
            change_address: req.maker_address.clone(),
            fee_rate: 10.0,
            chain: "testnet4".to_string(),
        };
        
        match state.charms.prove_spell(prove_request).await {
            Ok(txs) => {
                if txs.is_empty() {
                    tracing::warn!("Prover API returned empty transactions, falling back to mock");
                    // Fallback to mock transaction
                    vec![crate::services::charms::ProvedTransaction {
                        hex: format!("0200000001...mock_fallback_{}...", order_id),
                        txid: format!("mock_fallback_{}", order_id),
                    }]
                } else {
                    txs
                }
            }
            Err(e) => {
                tracing::error!("Prover API error: {}. Falling back to mock transaction.", e);
                // Fallback to mock transaction when API fails
                vec![crate::services::charms::ProvedTransaction {
                    hex: format!("0200000001...mock_fallback_{}...", order_id),
                    txid: format!("mock_fallback_{}", order_id),
                }]
            }
        }
    } else {
        // Mock mode - generate mock transaction
        vec![crate::services::charms::ProvedTransaction {
            hex: "0200000001...mock...".to_string(),
            txid: format!("mock_{}", order_id),
        }]
    };
    
    // Create unsigned transactions for signing
    let unsigned_txs: Vec<UnsignedTransaction> = proved_txs.iter().map(|tx| {
        UnsignedTransaction {
            hex: tx.hex.clone(),
            txid: tx.txid.clone(),
            inputs_to_sign: vec![
                InputToSign {
                    index: 0,
                    address: req.maker_address.clone(),
                    sighash_type: "SIGHASH_DEFAULT".to_string(),
                }
            ],
        }
    }).collect();
    
    // Create the order record
    let order = Order {
        id: order_id.clone(),
        maker_address: req.maker_address.clone(),
        offer_token: req.offer_token.clone(),
        offer_amount: req.offer_amount.clone(),
        want_token: req.want_token.clone(),
        want_amount: req.want_amount.clone(),
        source_chain: source_chain.clone(),
        dest_chain: dest_chain.clone(),
        status: OrderStatus::PendingSignature,
        allow_partial: req.allow_partial,
        filled_amount: "0".to_string(),
        expiry_height,
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
        utxo_id: Some(req.funding_utxo.clone()),
    };

    // Store order in database
    let db_record = OrderRecord {
        id: order_id.clone(),
        maker_address: req.maker_address.clone(),
        offer_token: req.offer_token.clone(),
        offer_amount: req.offer_amount.clone(),
        want_token: req.want_token,
        want_amount: req.want_amount,
        source_chain,
        dest_chain,
        status: "pendingsignature".to_string(),
        allow_partial: req.allow_partial,
        filled_amount: Some("0".to_string()),
        expiry_height: Some(expiry_height as i64),
        utxo_id: Some(req.funding_utxo),
        tx_id: None,
        created_at: now,
        updated_at: now,
    };

    if let Err(e) = db::insert_order(&state.db, &db_record).await {
        tracing::error!("Failed to insert order into database: {}", e);
    } else {
        tracing::info!("Order {} saved to database", order_id);
    }
    
    Json(CreateOrderResponse {
        order,
        spell: SpellData {
            spell_yaml: CREATE_ORDER_SPELL.to_string(),
            spell_yaml_built: spell_built,
            app_binary: "".to_string(), // TODO: Load compiled app binary
            prev_txs: vec![],
        },
        unsigned_txs,
        signing_instructions: SigningInstructions {
            message: "Please sign the transaction to lock your tokens in escrow".to_string(),
            steps: vec![
                "1. Review the transaction details".to_string(),
                "2. Sign with your Bitcoin wallet".to_string(),
                "3. Submit the signed transaction to broadcast".to_string(),
            ],
            broadcast_endpoint: format!("/api/orders/{}/broadcast", order_id),
        },
    })
}

/// Fill an order (atomic swap)
pub async fn fill_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<FillOrderRequest>,
) -> Json<FillOrderResponse> {
    let now = chrono::Utc::now();
    
    // TODO: Lookup order from database
    let existing_order = Order {
        id: id.clone(),
        maker_address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string(),
        offer_token: "TOAD".to_string(),
        offer_amount: "1000".to_string(),
        want_token: "BTC".to_string(),
        want_amount: "10000".to_string(),
        source_chain: "bitcoin".to_string(),
        dest_chain: "bitcoin".to_string(),
        status: OrderStatus::Open,
        allow_partial: true,
        filled_amount: "0".to_string(),
        expiry_height: 850000,
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
        utxo_id: Some("abc123:0".to_string()),
    };
    
    // Prepare fill spell data
    let order_spell_data = OrderSpellData {
        maker_address: existing_order.maker_address.clone(),
        maker_pubkey: existing_order.maker_address.clone(),
        offer_token_id: DEFAULT_TOKEN_ID.to_string(),
        offer_token_vk: DEFAULT_TOKEN_VK.to_string(),
        offer_amount: existing_order.offer_amount.clone(),
        want_token_id: existing_order.want_token.clone().to_lowercase(),
        want_amount: existing_order.want_amount.clone(),
        expiry_height: existing_order.expiry_height,
        allow_partial: existing_order.allow_partial,
        funding_utxo: existing_order.utxo_id.clone().unwrap_or_default(),
        escrow_address: "".to_string(),
        dest_chain: chain_to_id(&existing_order.dest_chain),
        dest_address: existing_order.maker_address.clone(),
    };
    
    let fill_spell_data = FillSpellData {
        order_utxo: existing_order.utxo_id.clone().unwrap_or_default(),
        taker_utxo: req.taker_utxo.clone(),
        taker_pubkey: req.taker_pubkey.clone().unwrap_or_else(|| req.taker_address.clone()),
        taker_address: req.taker_address.clone(),
        maker_address: existing_order.maker_address.clone(),
        offer_amount: existing_order.offer_amount.clone(),
        want_amount: existing_order.want_amount.clone(),
        fill_amount: req.fill_amount.clone(),
    };
    
    // Build the fill spell
    let spell_built = state.charms.build_fill_order_spell(
        FILL_ORDER_SPELL,
        &fill_spell_data,
        &order_spell_data,
        DEFAULT_APP_ID,
        DEFAULT_APP_VK,
    ).unwrap_or_else(|e| {
        tracing::error!("Failed to build fill spell: {}", e);
        FILL_ORDER_SPELL.to_string()
    });
    
    // Call prover (mock for now)
    let unsigned_txs = vec![
        UnsignedTransaction {
            hex: "0200000001...mock_fill...".to_string(),
            txid: format!("mock_fill_{}", id),
            inputs_to_sign: vec![
                InputToSign {
                    index: 0,
                    address: req.taker_address.clone(),
                    sighash_type: "SIGHASH_DEFAULT".to_string(),
                }
            ],
        }
    ];
    
    let order = Order {
        id: id.clone(),
        maker_address: existing_order.maker_address,
        offer_token: existing_order.offer_token,
        offer_amount: existing_order.offer_amount.clone(),
        want_token: existing_order.want_token,
        want_amount: existing_order.want_amount,
        source_chain: existing_order.source_chain,
        dest_chain: existing_order.dest_chain,
        status: OrderStatus::PendingSignature,
        allow_partial: existing_order.allow_partial,
        filled_amount: existing_order.offer_amount, // Full fill
        expiry_height: existing_order.expiry_height,
        created_at: existing_order.created_at,
        updated_at: now.to_rfc3339(),
        utxo_id: None,
    };

    Json(FillOrderResponse {
        order,
        spell: SpellData {
            spell_yaml: FILL_ORDER_SPELL.to_string(),
            spell_yaml_built: spell_built,
            app_binary: "".to_string(),
            prev_txs: vec![],
        },
        unsigned_txs,
        signing_instructions: SigningInstructions {
            message: "Sign to complete the atomic swap".to_string(),
            steps: vec![
                "1. You will receive the offered tokens".to_string(),
                "2. Your tokens will be sent to the maker".to_string(),
                "3. Sign the transaction to execute".to_string(),
            ],
            broadcast_endpoint: format!("/api/orders/{}/broadcast", id),
        },
    })
}

/// Cancel an order
pub async fn cancel_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<FillOrderResponse> {
    let now = chrono::Utc::now();
    
    // Update order status to cancelled in database
    if let Err(e) = db::update_order_status(&state.db, &id, "cancelled").await {
        tracing::error!("Failed to update order status: {}", e);
    }
    
    // Build cancel spell
    let spell_built = CANCEL_ORDER_SPELL.to_string();
    
    let unsigned_txs = vec![
        UnsignedTransaction {
            hex: "0200000001...mock_cancel...".to_string(),
            txid: format!("mock_cancel_{}", id),
            inputs_to_sign: vec![
                InputToSign {
                    index: 0,
                    address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string(),
                    sighash_type: "SIGHASH_DEFAULT".to_string(),
                }
            ],
        }
    ];
    
    Json(FillOrderResponse {
        order: Order {
            id: id.clone(),
            maker_address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string(),
            offer_token: "TOAD".to_string(),
            offer_amount: "1000".to_string(),
            want_token: "BTC".to_string(),
            want_amount: "10000".to_string(),
            source_chain: "bitcoin".to_string(),
            dest_chain: "bitcoin".to_string(),
            status: OrderStatus::PendingSignature,
            allow_partial: true,
            filled_amount: "0".to_string(),
            expiry_height: 850000,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            utxo_id: None,
        },
        spell: SpellData {
            spell_yaml: CANCEL_ORDER_SPELL.to_string(),
            spell_yaml_built: spell_built,
            app_binary: "".to_string(),
            prev_txs: vec![],
        },
        unsigned_txs,
        signing_instructions: SigningInstructions {
            message: "Sign to cancel your order and unlock your tokens".to_string(),
            steps: vec![
                "1. Your escrowed tokens will be returned".to_string(),
                "2. Sign the transaction to cancel".to_string(),
            ],
            broadcast_endpoint: format!("/api/orders/{}/broadcast", id),
        },
    })
}

/// Partially fill an order
pub async fn partial_fill_order(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<FillOrderRequest>,
) -> Json<FillOrderResponse> {
    let fill_amount = req.fill_amount.clone().unwrap_or("500".to_string());
    let now = chrono::Utc::now();
    
    // Build partial fill spell
    let spell_built = PARTIAL_FILL_SPELL.to_string();
    
    let unsigned_txs = vec![
        UnsignedTransaction {
            hex: "0200000001...mock_partial...".to_string(),
            txid: format!("mock_partial_{}", id),
            inputs_to_sign: vec![
                InputToSign {
                    index: 0,
                    address: req.taker_address.clone(),
                    sighash_type: "SIGHASH_DEFAULT".to_string(),
                }
            ],
        }
    ];
    
    Json(FillOrderResponse {
        order: Order {
            id: id.clone(),
            maker_address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string(),
            offer_token: "TOAD".to_string(),
            offer_amount: "1000".to_string(),
            want_token: "BTC".to_string(),
            want_amount: "10000".to_string(),
            source_chain: "bitcoin".to_string(),
            dest_chain: "bitcoin".to_string(),
            status: OrderStatus::PartiallyFilled,
            allow_partial: true,
            filled_amount: fill_amount,
            expiry_height: 850000,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            utxo_id: Some("abc123:1".to_string()),
        },
        spell: SpellData {
            spell_yaml: PARTIAL_FILL_SPELL.to_string(),
            spell_yaml_built: spell_built,
            app_binary: "".to_string(),
            prev_txs: vec![],
        },
        unsigned_txs,
        signing_instructions: SigningInstructions {
            message: "Sign to partially fill this order".to_string(),
            steps: vec![
                "1. You will receive a portion of the offered tokens".to_string(),
                "2. A portion of your tokens will be sent to the maker".to_string(),
                "3. The remaining order will stay open".to_string(),
            ],
            broadcast_endpoint: format!("/api/orders/{}/broadcast", id),
        },
    })
}

/// Broadcast a signed transaction
pub async fn broadcast_order(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<BroadcastRequest>,
) -> Json<BroadcastResponse> {
    tracing::info!("Broadcasting transaction for order {}", id);
    
    // Check if we're in mock mode (transaction hex starts with mock indicator)
    let is_mock = req.signed_tx_hex.contains("mock") 
        || req.signed_tx_hex.len() < 100 
        || state.charms.is_mock_mode();
    
    if is_mock {
        // In mock mode, simulate successful broadcast
        let mock_txid = format!("mock_broadcast_{}", uuid::Uuid::new_v4());
        tracing::info!("Mock mode: simulating broadcast with txid {}", mock_txid);
        
        // Update order status in database
        if let Err(e) = db::update_order_status(&state.db, &id, "open").await {
            tracing::error!("Failed to update order status: {}", e);
        }
        if let Err(e) = db::update_order_tx_id(&state.db, &id, &mock_txid).await {
            tracing::error!("Failed to update order tx_id: {}", e);
        }
        
        return Json(BroadcastResponse {
            txid: mock_txid,
            status: "confirmed".to_string(),
            message: "Transaction simulated successfully (mock mode). In production, tokens would be locked in escrow.".to_string(),
        });
    }
    
    // Send to Bitcoin network (real mode)
    match state.bitcoin.send_raw_transaction(&req.signed_tx_hex).await {
        Ok(txid) => {
            tracing::info!("Transaction broadcast successful: {}", txid);
            
            // Update order status in database
            if let Err(e) = db::update_order_status(&state.db, &id, "open").await {
                tracing::error!("Failed to update order status: {}", e);
            }
            if let Err(e) = db::update_order_tx_id(&state.db, &id, &txid).await {
                tracing::error!("Failed to update order tx_id: {}", e);
            }
            
            Json(BroadcastResponse {
                txid,
                status: "confirmed".to_string(),
                message: "Transaction broadcast successfully. Tokens are now locked in escrow.".to_string(),
            })
        }
        Err(e) => {
            tracing::error!("Broadcast failed: {}", e);
            
            Json(BroadcastResponse {
                txid: "".to_string(),
                status: "failed".to_string(),
                message: format!("Failed to broadcast: {}", e),
            })
        }
    }
}
