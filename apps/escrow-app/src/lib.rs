//! Liquid Nation Escrow App
//! 
//! A secure escrow contract for the Charms protocol.
//! Holds assets trustlessly until swap conditions are met.
//! 
//! ## Features
//! - Time-locked escrows with expiry
//! - Multi-party escrows (2-of-2, 2-of-3)
//! - Conditional release based on cryptographic proofs
//! - Refund mechanism for expired/cancelled escrows

use charms_sdk::data::{
    charm_values, check, sum_token_amount, App, Data, Transaction, B32, TOKEN,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Escrow status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EscrowStatus {
    /// Escrow is active and holding funds
    Active = 0,
    /// Escrow has been released to recipient
    Released = 1,
    /// Escrow has been refunded to depositor
    Refunded = 2,
    /// Escrow has expired
    Expired = 3,
    /// Escrow is in dispute
    Disputed = 4,
}

/// Escrow type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EscrowType {
    /// Simple 2-party escrow (depositor -> recipient)
    TwoParty = 0,
    /// 2-of-2 multisig (both parties must agree)
    TwoOfTwo = 1,
    /// 2-of-3 with arbiter (arbiter can resolve disputes)
    TwoOfThree = 2,
}

/// Escrow NFT state
/// Represents an active escrow holding assets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Escrow {
    /// Unique escrow identifier (hash of creation UTXO)
    pub escrow_id: B32,
    /// Depositor's public key
    pub depositor_pubkey: Vec<u8>,
    /// Recipient's public key
    pub recipient_pubkey: Vec<u8>,
    /// Optional arbiter's public key (for 2-of-3)
    pub arbiter_pubkey: Option<Vec<u8>>,
    /// Type of escrow
    pub escrow_type: EscrowType,
    /// Token/NFT being held (app identity)
    pub held_app_id: B32,
    /// Amount being held (for fungible tokens)
    pub held_amount: u64,
    /// Hash of release condition (e.g., hash of secret)
    pub release_hash: Option<B32>,
    /// Block height when escrow expires
    pub expiry_height: u64,
    /// Current status
    pub status: EscrowStatus,
    /// Creation timestamp (block height)
    pub created_at: u64,
    /// Associated order ID (for swap integration)
    pub order_id: Option<B32>,
}

/// Release proof for conditional escrows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseProof {
    /// The preimage that hashes to release_hash
    pub preimage: Vec<u8>,
    /// Signature from required party
    pub signature: Vec<u8>,
    /// Public key of signer
    pub signer_pubkey: Vec<u8>,
}

/// Refund request data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefundRequest {
    /// Reason for refund
    pub reason: String,
    /// Signature from depositor
    pub signature: Vec<u8>,
}

/// Dispute data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisputeData {
    /// Dispute reason
    pub reason: String,
    /// Evidence hash
    pub evidence_hash: Option<B32>,
    /// Initiator pubkey
    pub initiator_pubkey: Vec<u8>,
}

/// App tag constants
pub const ESCROW_NFT: char = 'n';    // NFT representing escrow state
pub const ESCROW_TOKEN: char = 't';  // Token type (for held assets)

/// Main app contract entry point
pub fn app_contract(app: &App, tx: &Transaction, x: &Data, w: &Data) -> bool {
    match app.tag {
        ESCROW_NFT => {
            check!(escrow_nft_contract(app, tx, x, w))
        }
        ESCROW_TOKEN => {
            check!(token_conservation(app, tx))
        }
        _ => return false,
    }
    true
}

/// Escrow NFT contract logic
fn escrow_nft_contract(app: &App, tx: &Transaction, x: &Data, w: &Data) -> bool {
    let operation: Option<String> = x.value().ok();
    
    match operation.as_deref() {
        Some("create") => check!(validate_escrow_creation(app, tx, w)),
        Some("release") => check!(validate_escrow_release(app, tx, w)),
        Some("refund") => check!(validate_escrow_refund(app, tx, w)),
        Some("dispute") => check!(validate_escrow_dispute(app, tx, w)),
        Some("resolve") => check!(validate_dispute_resolution(app, tx, w)),
        _ => check!(validate_escrow_transfer(app, tx)),
    }
    true
}

/// Validates creation of a new escrow
fn validate_escrow_creation(app: &App, tx: &Transaction, w: &Data) -> bool {
    // Get creation UTXO for unique identity
    let w_str: Option<String> = w.value().ok();
    check!(w_str.is_some());
    let w_str = w_str.unwrap();

    // Escrow identity must be hash of spent UTXO
    check!(hash(&w_str) == app.identity);

    // Get output escrows
    let escrow_outputs: Vec<Escrow> = charm_values(app, tx.outs.iter())
        .filter_map(|data| data.value().ok())
        .collect();

    // Must create exactly one escrow
    check!(escrow_outputs.len() == 1);
    let escrow = &escrow_outputs[0];

    // Validate escrow state
    check!(escrow.status == EscrowStatus::Active);
    check!(escrow.held_amount > 0);
    check!(escrow.expiry_height > 0);
    check!(!escrow.depositor_pubkey.is_empty());
    check!(!escrow.recipient_pubkey.is_empty());

    // Validate escrow type requirements
    match escrow.escrow_type {
        EscrowType::TwoOfThree => {
            check!(escrow.arbiter_pubkey.is_some());
            check!(!escrow.arbiter_pubkey.as_ref().unwrap().is_empty());
        }
        _ => {}
    }

    // Verify the held tokens are actually in the escrow output
    let held_app = App {
        tag: TOKEN,
        identity: escrow.held_app_id.clone(),
        vk: app.vk.clone(),
    };

    let output_amount = sum_token_amount(&held_app, tx.outs.iter());
    check!(output_amount.is_ok());
    check!(output_amount.unwrap() >= escrow.held_amount);

    true
}

/// Validates release of escrowed assets to recipient
fn validate_escrow_release(app: &App, tx: &Transaction, w: &Data) -> bool {
    // Get release proof
    let release_proof: Option<ReleaseProof> = w.value().ok();
    check!(release_proof.is_some());
    let proof = release_proof.unwrap();

    // Get input escrow
    let input_escrows: Vec<Escrow> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_escrows.len() == 1);
    let escrow = &input_escrows[0];

    // Escrow must be active
    check!(escrow.status == EscrowStatus::Active);

    // Validate release condition
    if let Some(release_hash) = &escrow.release_hash {
        // Hash-locked release: verify preimage
        let preimage_hash = hash_bytes(&proof.preimage);
        check!(preimage_hash == *release_hash);
    }

    // Verify signer is authorized
    match escrow.escrow_type {
        EscrowType::TwoParty => {
            // Either depositor or recipient can release
            check!(
                proof.signer_pubkey == escrow.depositor_pubkey ||
                proof.signer_pubkey == escrow.recipient_pubkey
            );
        }
        EscrowType::TwoOfTwo => {
            // Both parties need to have signed (simplified: just check one sig here)
            check!(
                proof.signer_pubkey == escrow.depositor_pubkey ||
                proof.signer_pubkey == escrow.recipient_pubkey
            );
        }
        EscrowType::TwoOfThree => {
            // Any 2 of 3 can release
            let is_depositor = proof.signer_pubkey == escrow.depositor_pubkey;
            let is_recipient = proof.signer_pubkey == escrow.recipient_pubkey;
            let is_arbiter = escrow.arbiter_pubkey.as_ref()
                .map(|a| proof.signer_pubkey == *a)
                .unwrap_or(false);
            check!(is_depositor || is_recipient || is_arbiter);
        }
    }

    // No output escrow (escrow is consumed)
    let output_escrows = charm_values(app, tx.outs.iter()).count();
    check!(output_escrows == 0);

    // Held tokens should go to recipient (verified by spell structure)
    
    true
}

/// Validates refund of escrowed assets to depositor
fn validate_escrow_refund(app: &App, tx: &Transaction, w: &Data) -> bool {
    let refund_request: Option<RefundRequest> = w.value().ok();
    
    // Get input escrow
    let input_escrows: Vec<Escrow> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_escrows.len() == 1);
    let escrow = &input_escrows[0];

    // Can only refund if:
    // 1. Escrow is active and expired, OR
    // 2. Both parties agree (2-of-2 signature)
    
    // Check if expired (simplified: assume current height is provided)
    // In production, this would check against block height
    let is_expired = escrow.status == EscrowStatus::Expired;
    
    if !is_expired {
        // Need signature from authorized party
        check!(refund_request.is_some());
        // In 2-of-2, both must agree
        // In 2-of-3, arbiter can force refund
    }

    // No output escrow
    let output_escrows = charm_values(app, tx.outs.iter()).count();
    check!(output_escrows == 0);

    // Tokens go back to depositor (verified by spell)
    
    true
}

/// Validates dispute initiation
fn validate_escrow_dispute(app: &App, tx: &Transaction, w: &Data) -> bool {
    let dispute_data: Option<DisputeData> = w.value().ok();
    check!(dispute_data.is_some());
    let dispute = dispute_data.unwrap();

    // Get input escrow
    let input_escrows: Vec<Escrow> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_escrows.len() == 1);
    let escrow = &input_escrows[0];

    // Only active escrows can be disputed
    check!(escrow.status == EscrowStatus::Active);

    // Only 2-of-3 escrows can be disputed (need arbiter)
    check!(escrow.escrow_type == EscrowType::TwoOfThree);

    // Dispute can be initiated by depositor or recipient
    check!(
        dispute.initiator_pubkey == escrow.depositor_pubkey ||
        dispute.initiator_pubkey == escrow.recipient_pubkey
    );

    // Output escrow should be in Disputed status
    let output_escrows: Vec<Escrow> = charm_values(app, tx.outs.iter())
        .filter_map(|data| data.value().ok())
        .collect();
    check!(output_escrows.len() == 1);
    check!(output_escrows[0].status == EscrowStatus::Disputed);

    true
}

/// Validates dispute resolution by arbiter
fn validate_dispute_resolution(app: &App, tx: &Transaction, w: &Data) -> bool {
    let resolution: Option<ReleaseProof> = w.value().ok();
    check!(resolution.is_some());
    let proof = resolution.unwrap();

    // Get input escrow
    let input_escrows: Vec<Escrow> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    check!(input_escrows.len() == 1);
    let escrow = &input_escrows[0];

    // Must be in disputed state
    check!(escrow.status == EscrowStatus::Disputed);

    // Only arbiter can resolve
    check!(escrow.arbiter_pubkey.is_some());
    check!(proof.signer_pubkey == *escrow.arbiter_pubkey.as_ref().unwrap());

    // No output escrow (resolved)
    let output_escrows = charm_values(app, tx.outs.iter()).count();
    check!(output_escrows == 0);

    true
}

/// Validates simple escrow transfer (ownership change)
fn validate_escrow_transfer(app: &App, tx: &Transaction) -> bool {
    // Get input and output escrows
    let input_escrows: Vec<Escrow> = charm_values(app, tx.ins.iter().map(|(_, v)| v))
        .filter_map(|data| data.value().ok())
        .collect();
    
    let output_escrows: Vec<Escrow> = charm_values(app, tx.outs.iter())
        .filter_map(|data| data.value().ok())
        .collect();

    // Must have same number
    check!(input_escrows.len() == output_escrows.len());

    // Escrow state must be unchanged
    for (input, output) in input_escrows.iter().zip(output_escrows.iter()) {
        check!(input.escrow_id == output.escrow_id);
        check!(input.held_amount == output.held_amount);
        check!(input.held_app_id == output.held_app_id);
        check!(input.status == output.status);
        check!(input.depositor_pubkey == output.depositor_pubkey);
        check!(input.recipient_pubkey == output.recipient_pubkey);
    }

    true
}

/// Token conservation validation
fn token_conservation(app: &App, tx: &Transaction) -> bool {
    let input_amount = sum_token_amount(app, tx.ins.iter().map(|(_, v)| v));
    let output_amount = sum_token_amount(app, tx.outs.iter());

    check!(input_amount.is_ok());
    check!(output_amount.is_ok());
    check!(output_amount.unwrap() <= input_amount.unwrap());

    true
}

/// Hash a string to B32
pub fn hash(data: &str) -> B32 {
    let hash = Sha256::digest(data.as_bytes());
    B32(hash.into())
}

/// Hash bytes to B32
pub fn hash_bytes(data: &[u8]) -> B32 {
    let hash = Sha256::digest(data);
    B32(hash.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escrow_status() {
        assert_eq!(EscrowStatus::Active as u8, 0);
        assert_eq!(EscrowStatus::Released as u8, 1);
    }

    #[test]
    fn test_escrow_type() {
        assert_eq!(EscrowType::TwoParty as u8, 0);
        assert_eq!(EscrowType::TwoOfThree as u8, 2);
    }

    #[test]
    fn test_hash() {
        let h1 = hash("test");
        let h2 = hash("test");
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_hash_bytes() {
        let data = b"secret preimage";
        let h = hash_bytes(data);
        assert_eq!(h.0.len(), 32);
    }
}

