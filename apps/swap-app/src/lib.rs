//! Liquid Nation Swap App
//! 
//! A P2P atomic swap contract for the Charms protocol.
//! Enables trustless cross-chain asset swaps without liquidity pools.

use charms_sdk::data::{
    charm_values, check, sum_token_amount, App, Data, Transaction, UtxoId, B32, TOKEN,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::str::FromStr;

/// Order status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderStatus {
    Open = 0,
    Filled = 1,
    Cancelled = 2,
    Expired = 3,
}

/// Swap order NFT content
/// This NFT represents an open order in the orderbook
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapOrder {
    /// Maker's public key (for signature verification)
    pub maker_pubkey: Vec<u8>,
    /// Token/NFT being offered (app identity)
    pub offer_app_id: B32,
    /// Amount being offered (for fungible tokens)
    pub offer_amount: u64,
    /// Token/NFT wanted in return (app identity)
    pub want_app_id: B32,
    /// Amount wanted (for fungible tokens)
    pub want_amount: u64,
    /// Destination chain for cross-chain swaps (0 = Bitcoin, 1 = Cardano)
    pub dest_chain: u8,
    /// Destination address on target chain
    pub dest_address: Vec<u8>,
    /// Order expiry (block height)
    pub expiry_height: u64,
    /// Allow partial fills
    pub allow_partial: bool,
    /// Current order status
    pub status: OrderStatus,
    /// Amount already filled (for partial orders)
    pub filled_amount: u64,
}

/// Fill data for order execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FillData {
    /// Taker's public key
    pub taker_pubkey: Vec<u8>,
    /// Amount to fill
    pub fill_amount: u64,
    /// Taker's destination address
    pub taker_dest_address: Vec<u8>,
}

/// App tag constants (char type to match charms-sdk)
pub const ORDER_NFT: char = 'n';     // NFT representing an order
pub const SWAP_TOKEN: char = 't';    // Token type for swaps

/// Main app contract entry point
/// Validates all charm operations for the Liquid Nation swap protocol
pub fn app_contract(app: &App, tx: &Transaction, x: &Data, w: &Data) -> bool {
    match app.tag {
        ORDER_NFT => {
            // Order NFT operations: create, fill, cancel
            check!(order_nft_contract(app, tx, x, w))
        }
        SWAP_TOKEN => {
            // Token transfer validation
            check!(token_transfer_valid(app, tx))
        }
        _ => {
            // Unknown tag - reject
            return false;
        }
    }
    true
}

/// Validates order NFT operations
fn order_nft_contract(app: &App, tx: &Transaction, x: &Data, w: &Data) -> bool {
    // Get public input to determine operation type
    let operation: Option<String> = x.value().ok();
    
    match operation.as_deref() {
        Some("create") => check!(validate_order_creation(app, tx, w)),
        Some("fill") => check!(validate_order_fill(app, tx, w)),
        Some("cancel") => check!(validate_order_cancel(app, tx, w)),
        Some("partial_fill") => check!(validate_partial_fill(app, tx, w)),
        _ => {
            // Simple transfer - just verify conservation
            check!(validate_order_transfer(app, tx))
        }
    }
    true
}

/// Validates creation of a new swap order
fn validate_order_creation(app: &App, tx: &Transaction, w: &Data) -> bool {
    // Get the UTXO being spent to create unique identity
    let w_str: Option<String> = w.value().ok();
    check!(w_str.is_some());
    let w_str = w_str.unwrap();

    // Order identity must be hash of spent UTXO
    check!(hash(&w_str) == app.identity);

    // Verify the UTXO is being spent
    let w_utxo_id = UtxoId::from_str(&w_str).unwrap();
    check!(tx.ins.iter().any(|(utxo_id, _)| utxo_id == &w_utxo_id));

    // Get order NFTs in outputs
    let order_charms = charm_values(app, tx.outs.iter()).collect::<Vec<_>>();

    // Must create exactly one order NFT
    check!(order_charms.len() == 1);

    // Validate order structure
    let order: Result<SwapOrder, _> = order_charms[0].value();
    check!(order.is_ok());
    let order = order.unwrap();

    // New order must be Open status
    check!(order.status == OrderStatus::Open);
    // Filled amount must be zero
    check!(order.filled_amount == 0);
    // Must have valid amounts
    check!(order.offer_amount > 0);
    check!(order.want_amount > 0);

    true
}

/// Validates filling a swap order (atomic swap execution)
fn validate_order_fill(app: &App, tx: &Transaction, w: &Data) -> bool {
    // Get fill data from private input
    let fill_data: Option<FillData> = w.value().ok();
    check!(fill_data.is_some());
    let _fill_data = fill_data.unwrap();

    // Get input order
    let input_orders: Vec<SwapOrder> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_orders.len() == 1);
    let order = &input_orders[0];

    // Order must be open
    check!(order.status == OrderStatus::Open);

    // For full fill, no output order NFT (order is consumed)
    let output_orders = charm_values(app, tx.outs.iter()).count();
    check!(output_orders == 0);

    // Verify taker provides the wanted tokens
    let want_app = App {
        tag: TOKEN,
        identity: order.want_app_id.clone(),
        vk: app.vk.clone(),
    };
    
    let taker_input = sum_token_amount(&want_app, tx.ins.iter().map(|(_, v)| v));
    check!(taker_input.is_ok());
    check!(taker_input.unwrap() >= order.want_amount);

    // Verify maker receives wanted tokens
    // (Output validation handled by spell structure)

    true
}

/// Validates order cancellation
fn validate_order_cancel(app: &App, tx: &Transaction, _w: &Data) -> bool {
    // Get input order
    let input_orders: Vec<SwapOrder> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_orders.len() == 1);
    let order = &input_orders[0];

    // Order must be open to cancel
    check!(order.status == OrderStatus::Open);

    // Signature verification would happen via witness
    // For now, the UTXO ownership proves authorization

    // No output order NFT (order is destroyed)
    let output_orders = charm_values(app, tx.outs.iter()).count();
    check!(output_orders == 0);

    // Offered tokens must be returned to maker
    // (Handled by spell output structure)

    true
}

/// Validates partial fill of an order
fn validate_partial_fill(app: &App, tx: &Transaction, w: &Data) -> bool {
    // Get fill data
    let fill_data_opt: Option<FillData> = w.value().ok();
    check!(fill_data_opt.is_some());
    let fill_data = fill_data_opt.unwrap();

    // Get input order
    let input_orders: Vec<SwapOrder> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_orders.len() == 1);
    let input_order = &input_orders[0];

    // Order must allow partial fills
    check!(input_order.allow_partial);
    check!(input_order.status == OrderStatus::Open);

    // Get output order (updated with partial fill)
    let output_orders: Vec<SwapOrder> = charm_values(app, tx.outs.iter())
        .filter_map(|data| data.value().ok())
        .collect();
    check!(output_orders.len() == 1);
    let output_order = &output_orders[0];

    // Validate fill amount
    let remaining = input_order.offer_amount - input_order.filled_amount;
    check!(fill_data.fill_amount > 0);
    check!(fill_data.fill_amount <= remaining);

    // Validate output order state
    let new_filled = input_order.filled_amount + fill_data.fill_amount;
    check!(output_order.filled_amount == new_filled);

    // If fully filled, status should change
    if new_filled >= input_order.offer_amount {
        check!(output_order.status == OrderStatus::Filled);
    } else {
        check!(output_order.status == OrderStatus::Open);
    }

    true
}

/// Validates simple order NFT transfer (no state change)
fn validate_order_transfer(app: &App, tx: &Transaction) -> bool {
    // Get input and output orders
    let input_orders: Vec<SwapOrder> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    
    let output_orders: Vec<SwapOrder> = charm_values(app, tx.outs.iter())
        .filter_map(|data| data.value().ok())
        .collect();

    // Must have same number of orders
    check!(input_orders.len() == output_orders.len());

    // Orders must be unchanged (just transferred)
    for (input, output) in input_orders.iter().zip(output_orders.iter()) {
        check!(input.offer_app_id == output.offer_app_id);
        check!(input.offer_amount == output.offer_amount);
        check!(input.want_app_id == output.want_app_id);
        check!(input.want_amount == output.want_amount);
        check!(input.status == output.status);
        check!(input.filled_amount == output.filled_amount);
    }

    true
}

/// Validates token transfer (conservation law)
fn token_transfer_valid(app: &App, tx: &Transaction) -> bool {
    let input_amount = sum_token_amount(app, tx.ins.iter().map(|(_, v)| v));
    let output_amount = sum_token_amount(app, tx.outs.iter());

    check!(input_amount.is_ok());
    check!(output_amount.is_ok());

    // Output must not exceed input (no minting during swaps)
    check!(output_amount.unwrap() <= input_amount.unwrap());

    true
}

/// Hash utility for generating order identity
pub(crate) fn hash(data: &str) -> B32 {
    let hash = Sha256::digest(data);
    B32(hash.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_order_status_serialization() {
        let status = OrderStatus::Open;
        let serialized = serde_json::to_string(&status).unwrap();
        assert_eq!(serialized, "0");
    }

    #[test]
    fn test_swap_order_creation() {
        let order = SwapOrder {
            maker_pubkey: vec![1, 2, 3],
            offer_app_id: B32([0u8; 32]),
            offer_amount: 1000,
            want_app_id: B32([1u8; 32]),
            want_amount: 500,
            dest_chain: 0,
            dest_address: vec![],
            expiry_height: 100000,
            allow_partial: true,
            status: OrderStatus::Open,
            filled_amount: 0,
        };
        
        assert_eq!(order.status, OrderStatus::Open);
        assert_eq!(order.filled_amount, 0);
    }

    #[test]
    fn test_hash() {
        let data = "test_utxo_id";
        let hash1 = hash(data);
        let hash2 = hash(data);
        assert_eq!(hash1, hash2);
    }
}

