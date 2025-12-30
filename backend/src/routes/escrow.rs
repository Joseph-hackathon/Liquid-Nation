//! Escrow API Routes
//! 
//! Handles escrow creation, release, refund, and dispute operations

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::services::{BitcoinService, CharmsService};

/// Application state for escrow routes
pub struct EscrowState {
    pub charms: Arc<CharmsService>,
    pub bitcoin: Arc<BitcoinService>,
    pub escrows: RwLock<Vec<EscrowRecord>>,
}

/// Escrow status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
    Expired,
    Disputed,
}

/// Escrow type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EscrowType {
    TwoParty,
    TwoOfTwo,
    TwoOfThree,
}

/// Escrow record in database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscrowRecord {
    pub id: String,
    pub escrow_id: String,
    pub depositor_pubkey: String,
    pub recipient_pubkey: String,
    pub arbiter_pubkey: Option<String>,
    pub escrow_type: EscrowType,
    pub held_token_id: String,
    pub held_amount: u64,
    pub release_hash: Option<String>,
    pub expiry_height: u64,
    pub status: EscrowStatus,
    pub created_at: u64,
    pub order_id: Option<String>,
    pub utxo_id: Option<String>,
    pub tx_id: Option<String>,
}

/// Create escrow request
#[derive(Debug, Deserialize)]
pub struct CreateEscrowRequest {
    pub depositor_pubkey: String,
    pub recipient_pubkey: String,
    pub arbiter_pubkey: Option<String>,
    pub escrow_type: EscrowType,
    pub token_id: String,
    pub amount: u64,
    pub release_hash: Option<String>,
    pub expiry_height: u64,
    pub order_id: Option<String>,
}

/// Release escrow request
#[derive(Debug, Deserialize)]
pub struct ReleaseEscrowRequest {
    pub preimage: Option<String>,
    pub signature: String,
    pub signer_pubkey: String,
}

/// Refund escrow request
#[derive(Debug, Deserialize)]
pub struct RefundEscrowRequest {
    pub reason: String,
    pub signature: String,
}

/// Dispute escrow request
#[derive(Debug, Deserialize)]
pub struct DisputeEscrowRequest {
    pub reason: String,
    pub evidence_hash: Option<String>,
    pub initiator_pubkey: String,
}

/// Resolve dispute request
#[derive(Debug, Deserialize)]
pub struct ResolveDisputeRequest {
    pub winner: String, // "depositor" or "recipient"
    pub arbiter_signature: String,
}

/// API response wrapper
#[derive(Debug, Serialize)]
pub struct EscrowResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> EscrowResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

/// Create the escrow router
pub fn router(state: Arc<EscrowState>) -> Router {
    Router::new()
        .route("/", get(list_escrows).post(create_escrow))
        .route("/{id}", get(get_escrow))
        .route("/{id}/release", post(release_escrow))
        .route("/{id}/refund", post(refund_escrow))
        .route("/{id}/dispute", post(dispute_escrow))
        .route("/{id}/resolve", post(resolve_dispute))
        .route("/by-depositor/{pubkey}", get(get_escrows_by_depositor))
        .route("/by-recipient/{pubkey}", get(get_escrows_by_recipient))
        .with_state(state)
}

/// List all escrows
async fn list_escrows(
    State(state): State<Arc<EscrowState>>,
) -> Json<EscrowResponse<Vec<EscrowRecord>>> {
    let escrows = state.escrows.read().await;
    Json(EscrowResponse::success(escrows.clone()))
}

/// Get escrow by ID
async fn get_escrow(
    State(state): State<Arc<EscrowState>>,
    Path(id): Path<String>,
) -> Result<Json<EscrowResponse<EscrowRecord>>, StatusCode> {
    let escrows = state.escrows.read().await;
    
    if let Some(escrow) = escrows.iter().find(|e| e.id == id) {
        Ok(Json(EscrowResponse::success(escrow.clone())))
    } else {
        Ok(Json(EscrowResponse::error("Escrow not found")))
    }
}

/// Create a new escrow
async fn create_escrow(
    State(state): State<Arc<EscrowState>>,
    Json(req): Json<CreateEscrowRequest>,
) -> Result<Json<EscrowResponse<EscrowRecord>>, StatusCode> {
    // Validate escrow type requirements
    if req.escrow_type == EscrowType::TwoOfThree && req.arbiter_pubkey.is_none() {
        return Ok(Json(EscrowResponse::error(
            "2-of-3 escrow requires arbiter pubkey",
        )));
    }

    // Generate unique escrow ID
    let id = Uuid::new_v4().to_string();
    let escrow_id = format!("escrow_{}", &id[..8]);

    // Create escrow record
    let escrow = EscrowRecord {
        id: id.clone(),
        escrow_id,
        depositor_pubkey: req.depositor_pubkey,
        recipient_pubkey: req.recipient_pubkey,
        arbiter_pubkey: req.arbiter_pubkey,
        escrow_type: req.escrow_type,
        held_token_id: req.token_id,
        held_amount: req.amount,
        release_hash: req.release_hash,
        expiry_height: req.expiry_height,
        status: EscrowStatus::Active,
        created_at: chrono::Utc::now().timestamp() as u64,
        order_id: req.order_id,
        utxo_id: None,
        tx_id: None,
    };

    // Store escrow
    let mut escrows = state.escrows.write().await;
    escrows.push(escrow.clone());

    // TODO: Build and broadcast create-escrow spell
    // let spell = state.charms.build_create_escrow_spell(&escrow)?;
    // let tx_id = state.bitcoin.broadcast_spell(&spell)?;

    Ok(Json(EscrowResponse::success(escrow)))
}

/// Release escrow to recipient
async fn release_escrow(
    State(state): State<Arc<EscrowState>>,
    Path(id): Path<String>,
    Json(req): Json<ReleaseEscrowRequest>,
) -> Result<Json<EscrowResponse<EscrowRecord>>, StatusCode> {
    let mut escrows = state.escrows.write().await;
    
    if let Some(escrow) = escrows.iter_mut().find(|e| e.id == id) {
        // Validate escrow is active
        if escrow.status != EscrowStatus::Active {
            return Ok(Json(EscrowResponse::error(
                "Escrow is not active",
            )));
        }

        // Validate release hash if present
        if escrow.release_hash.is_some() && req.preimage.is_none() {
            return Ok(Json(EscrowResponse::error(
                "Preimage required for hash-locked escrow",
            )));
        }

        // Validate signer is authorized
        let is_authorized = req.signer_pubkey == escrow.depositor_pubkey
            || req.signer_pubkey == escrow.recipient_pubkey
            || escrow.arbiter_pubkey.as_ref().map(|a| a == &req.signer_pubkey).unwrap_or(false);

        if !is_authorized {
            return Ok(Json(EscrowResponse::error(
                "Signer not authorized to release escrow",
            )));
        }

        // Update escrow status
        escrow.status = EscrowStatus::Released;

        // TODO: Build and broadcast release-escrow spell

        Ok(Json(EscrowResponse::success(escrow.clone())))
    } else {
        Ok(Json(EscrowResponse::error("Escrow not found")))
    }
}

/// Refund escrow to depositor
async fn refund_escrow(
    State(state): State<Arc<EscrowState>>,
    Path(id): Path<String>,
    Json(_req): Json<RefundEscrowRequest>,
) -> Result<Json<EscrowResponse<EscrowRecord>>, StatusCode> {
    let mut escrows = state.escrows.write().await;
    
    if let Some(escrow) = escrows.iter_mut().find(|e| e.id == id) {
        // Validate escrow is active or expired
        if escrow.status != EscrowStatus::Active && escrow.status != EscrowStatus::Expired {
            return Ok(Json(EscrowResponse::error(
                "Escrow cannot be refunded in current state",
            )));
        }

        // Update escrow status
        escrow.status = EscrowStatus::Refunded;

        // TODO: Build and broadcast refund-escrow spell

        Ok(Json(EscrowResponse::success(escrow.clone())))
    } else {
        Ok(Json(EscrowResponse::error("Escrow not found")))
    }
}

/// Initiate dispute on escrow
async fn dispute_escrow(
    State(state): State<Arc<EscrowState>>,
    Path(id): Path<String>,
    Json(req): Json<DisputeEscrowRequest>,
) -> Result<Json<EscrowResponse<EscrowRecord>>, StatusCode> {
    let mut escrows = state.escrows.write().await;
    
    if let Some(escrow) = escrows.iter_mut().find(|e| e.id == id) {
        // Validate escrow type supports disputes
        if escrow.escrow_type != EscrowType::TwoOfThree {
            return Ok(Json(EscrowResponse::error(
                "Only 2-of-3 escrows can be disputed",
            )));
        }

        // Validate escrow is active
        if escrow.status != EscrowStatus::Active {
            return Ok(Json(EscrowResponse::error(
                "Escrow is not active",
            )));
        }

        // Validate initiator is party to escrow
        if req.initiator_pubkey != escrow.depositor_pubkey
            && req.initiator_pubkey != escrow.recipient_pubkey
        {
            return Ok(Json(EscrowResponse::error(
                "Only depositor or recipient can initiate dispute",
            )));
        }

        // Update escrow status
        escrow.status = EscrowStatus::Disputed;

        // TODO: Build and broadcast dispute-escrow spell

        Ok(Json(EscrowResponse::success(escrow.clone())))
    } else {
        Ok(Json(EscrowResponse::error("Escrow not found")))
    }
}

/// Resolve dispute (arbiter only)
async fn resolve_dispute(
    State(state): State<Arc<EscrowState>>,
    Path(id): Path<String>,
    Json(req): Json<ResolveDisputeRequest>,
) -> Result<Json<EscrowResponse<EscrowRecord>>, StatusCode> {
    let mut escrows = state.escrows.write().await;
    
    if let Some(escrow) = escrows.iter_mut().find(|e| e.id == id) {
        // Validate escrow is disputed
        if escrow.status != EscrowStatus::Disputed {
            return Ok(Json(EscrowResponse::error(
                "Escrow is not in disputed state",
            )));
        }

        // Determine winner
        let winner = match req.winner.as_str() {
            "depositor" => {
                escrow.status = EscrowStatus::Refunded;
                &escrow.depositor_pubkey
            }
            "recipient" => {
                escrow.status = EscrowStatus::Released;
                &escrow.recipient_pubkey
            }
            _ => {
                return Ok(Json(EscrowResponse::error(
                    "Winner must be 'depositor' or 'recipient'",
                )));
            }
        };

        let _ = winner; // Use to resolve the dispute

        // TODO: Build and broadcast resolve-dispute spell

        Ok(Json(EscrowResponse::success(escrow.clone())))
    } else {
        Ok(Json(EscrowResponse::error("Escrow not found")))
    }
}

/// Get escrows by depositor
async fn get_escrows_by_depositor(
    State(state): State<Arc<EscrowState>>,
    Path(pubkey): Path<String>,
) -> Json<EscrowResponse<Vec<EscrowRecord>>> {
    let escrows = state.escrows.read().await;
    let filtered: Vec<EscrowRecord> = escrows
        .iter()
        .filter(|e| e.depositor_pubkey == pubkey)
        .cloned()
        .collect();
    Json(EscrowResponse::success(filtered))
}

/// Get escrows by recipient
async fn get_escrows_by_recipient(
    State(state): State<Arc<EscrowState>>,
    Path(pubkey): Path<String>,
) -> Json<EscrowResponse<Vec<EscrowRecord>>> {
    let escrows = state.escrows.read().await;
    let filtered: Vec<EscrowRecord> = escrows
        .iter()
        .filter(|e| e.recipient_pubkey == pubkey)
        .cloned()
        .collect();
    Json(EscrowResponse::success(filtered))
}

