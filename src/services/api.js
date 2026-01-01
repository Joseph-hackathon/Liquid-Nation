/**
 * Liquid Nation API Client
 * 
 * This service handles all communication with the Liquid Nation backend
 * for order management, wallet operations, and Charms protocol integration.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ============================================
// Health Check
// ============================================

export async function checkHealth() {
  return apiRequest('/health');
}

// ============================================
// Order Management
// ============================================

/**
 * List all orders with optional filters
 * @param {Object} filters - Filter parameters
 * @param {string} filters.status - Order status filter
 * @param {string} filters.offerToken - Filter by offer token
 * @param {string} filters.wantToken - Filter by want token
 * @param {string} filters.makerAddress - Filter by maker address
 * @param {number} filters.limit - Results limit
 * @param {number} filters.offset - Results offset
 */
export async function listOrders(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.offerToken) params.append('offer_token', filters.offerToken);
  if (filters.wantToken) params.append('want_token', filters.wantToken);
  if (filters.makerAddress) params.append('maker_address', filters.makerAddress);
  if (filters.sourceChain) params.append('source_chain', filters.sourceChain);
  if (filters.destChain) params.append('dest_chain', filters.destChain);
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.offset) params.append('offset', filters.offset.toString());
  
  const query = params.toString();
  return apiRequest(`/orders${query ? `?${query}` : ''}`);
}

/**
 * Get a specific order by ID
 * @param {string} orderId - Order ID
 */
export async function getOrder(orderId) {
  return apiRequest(`/orders/${orderId}`);
}

/**
 * Create a new swap order
 * @param {Object} orderData - Order creation data
 * @param {string} orderData.makerAddress - Maker's Bitcoin address
 * @param {string} orderData.offerToken - Token being offered
 * @param {string} orderData.offerAmount - Amount being offered
 * @param {string} orderData.wantToken - Token wanted in return
 * @param {string} orderData.wantAmount - Amount wanted
 * @param {string} orderData.sourceChain - Source blockchain
 * @param {string} orderData.destChain - Destination blockchain
 * @param {boolean} orderData.allowPartial - Allow partial fills
 * @param {number} orderData.expiryBlocks - Expiry in blocks
 * @param {string} orderData.fundingUtxo - UTXO to fund the order
 */
export async function createOrder(orderData) {
  return apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      maker_address: orderData.makerAddress,
      offer_token: orderData.offerToken,
      offer_amount: orderData.offerAmount,
      want_token: orderData.wantToken,
      want_amount: orderData.wantAmount,
      source_chain: orderData.sourceChain,
      dest_chain: orderData.destChain,
      allow_partial: orderData.allowPartial,
      expiry_blocks: orderData.expiryBlocks,
      funding_utxo: orderData.fundingUtxo,
    }),
  });
}

/**
 * Fill an order (execute atomic swap)
 * @param {string} orderId - Order ID to fill
 * @param {Object} fillData - Fill data
 * @param {string} fillData.takerAddress - Taker's address
 * @param {string} fillData.takerUtxo - Taker's UTXO with tokens
 * @param {string} fillData.fillAmount - Amount to fill (for partial)
 */
export async function fillOrder(orderId, fillData) {
  return apiRequest(`/orders/${orderId}/fill`, {
    method: 'POST',
    body: JSON.stringify({
      taker_address: fillData.takerAddress,
      taker_utxo: fillData.takerUtxo,
      fill_amount: fillData.fillAmount,
    }),
  });
}

/**
 * Partially fill an order
 * @param {string} orderId - Order ID
 * @param {Object} fillData - Partial fill data
 */
export async function partialFillOrder(orderId, fillData) {
  return apiRequest(`/orders/${orderId}/partial-fill`, {
    method: 'POST',
    body: JSON.stringify({
      taker_address: fillData.takerAddress,
      taker_utxo: fillData.takerUtxo,
      fill_amount: fillData.fillAmount,
    }),
  });
}

/**
 * Cancel an order
 * @param {string} orderId - Order ID to cancel
 */
export async function cancelOrder(orderId) {
  return apiRequest(`/orders/${orderId}/cancel`, {
    method: 'DELETE',
  });
}

/**
 * Broadcast a signed order transaction
 * @param {string} orderId - Order ID
 * @param {string} signedTxHex - Signed transaction hex
 */
export async function broadcastOrder(orderId, signedTxHex) {
  return apiRequest(`/orders/${orderId}/broadcast`, {
    method: 'POST',
    body: JSON.stringify({
      signed_tx_hex: signedTxHex,
      order_id: orderId,
    }),
  });
}

// ============================================
// Wallet Operations
// ============================================

/**
 * Connect wallet
 * @param {Object} walletData - Wallet connection data
 * @param {string} walletData.address - Wallet address
 * @param {string} walletData.signature - Optional signature for verification
 * @param {string} walletData.message - Optional message that was signed
 */
export async function connectWallet(walletData) {
  return apiRequest('/wallet/connect', {
    method: 'POST',
    body: JSON.stringify({
      address: walletData.address,
      signature: walletData.signature,
      message: walletData.message,
    }),
  });
}

/**
 * Get wallet balance
 */
export async function getWalletBalance() {
  return apiRequest('/wallet/balance');
}

/**
 * Get wallet UTXOs
 */
export async function getWalletUtxos() {
  return apiRequest('/wallet/utxos');
}

/**
 * Get new wallet address
 */
export async function getNewAddress() {
  return apiRequest('/wallet/address');
}

// ============================================
// Spell / Transaction Operations
// ============================================

/**
 * Prove a spell and generate transactions
 * @param {Object} spellData - Spell data
 * @param {string} spellData.spellYaml - Spell YAML content
 * @param {string} spellData.appBinary - App binary (base64)
 * @param {Array} spellData.prevTxs - Previous transactions
 * @param {string} spellData.fundingUtxo - Funding UTXO
 * @param {number} spellData.fundingUtxoValue - Funding UTXO value in sats
 * @param {string} spellData.changeAddress - Change address
 * @param {number} spellData.feeRate - Fee rate in sat/vB
 */
export async function proveSpell(spellData) {
  return apiRequest('/spells/prove', {
    method: 'POST',
    body: JSON.stringify({
      spell_yaml: spellData.spellYaml,
      app_binary: spellData.appBinary,
      prev_txs: spellData.prevTxs,
      funding_utxo: spellData.fundingUtxo,
      funding_utxo_value: spellData.fundingUtxoValue,
      change_address: spellData.changeAddress,
      fee_rate: spellData.feeRate,
    }),
  });
}

/**
 * Broadcast signed transactions
 * @param {Array<string>} signedTxs - Array of signed transaction hex strings
 */
export async function broadcastTransactions(signedTxs) {
  return apiRequest('/spells/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      signed_txs: signedTxs,
    }),
  });
}

/**
 * Get transaction status
 * @param {string} txid - Transaction ID
 */
export async function getTransactionStatus(txid) {
  return apiRequest(`/spells/status/${txid}`);
}

// ============================================
// Escrow Operations
// ============================================

/**
 * List all escrows with optional filters
 * @param {Object} filters - Filter parameters
 */
export async function listEscrows(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.depositor) params.append('depositor', filters.depositor);
  if (filters.recipient) params.append('recipient', filters.recipient);
  
  const query = params.toString();
  return apiRequest(`/escrows${query ? `?${query}` : ''}`);
}

/**
 * Get a specific escrow by ID
 * @param {string} escrowId - Escrow ID
 */
export async function getEscrow(escrowId) {
  return apiRequest(`/escrows/${escrowId}`);
}

/**
 * Create a new escrow
 * @param {Object} escrowData - Escrow creation data
 * @param {string} escrowData.depositorPubkey - Depositor's public key
 * @param {string} escrowData.recipientPubkey - Recipient's public key
 * @param {string} escrowData.arbiterPubkey - Optional arbiter's public key
 * @param {string} escrowData.escrowType - 'TwoParty', 'TwoOfTwo', or 'TwoOfThree'
 * @param {string} escrowData.tokenId - Token to escrow
 * @param {number} escrowData.amount - Amount to escrow
 * @param {string} escrowData.releaseHash - Optional hash for conditional release
 * @param {number} escrowData.expiryHeight - Block height when escrow expires
 * @param {string} escrowData.orderId - Optional associated order ID
 */
export async function createEscrow(escrowData) {
  return apiRequest('/escrows', {
    method: 'POST',
    body: JSON.stringify({
      depositor_pubkey: escrowData.depositorPubkey,
      recipient_pubkey: escrowData.recipientPubkey,
      arbiter_pubkey: escrowData.arbiterPubkey,
      escrow_type: escrowData.escrowType,
      token_id: escrowData.tokenId,
      amount: escrowData.amount,
      release_hash: escrowData.releaseHash,
      expiry_height: escrowData.expiryHeight,
      order_id: escrowData.orderId,
    }),
  });
}

/**
 * Release escrow to recipient
 * @param {string} escrowId - Escrow ID
 * @param {Object} releaseData - Release data
 * @param {string} releaseData.preimage - Preimage for hash-locked release
 * @param {string} releaseData.signature - Release signature
 * @param {string} releaseData.signerPubkey - Signer's public key
 */
export async function releaseEscrow(escrowId, releaseData) {
  return apiRequest(`/escrows/${escrowId}/release`, {
    method: 'POST',
    body: JSON.stringify({
      preimage: releaseData.preimage,
      signature: releaseData.signature,
      signer_pubkey: releaseData.signerPubkey,
    }),
  });
}

/**
 * Refund escrow to depositor
 * @param {string} escrowId - Escrow ID
 * @param {Object} refundData - Refund data
 * @param {string} refundData.reason - Refund reason
 * @param {string} refundData.signature - Refund signature
 */
export async function refundEscrow(escrowId, refundData) {
  return apiRequest(`/escrows/${escrowId}/refund`, {
    method: 'POST',
    body: JSON.stringify({
      reason: refundData.reason,
      signature: refundData.signature,
    }),
  });
}

/**
 * Initiate dispute on escrow
 * @param {string} escrowId - Escrow ID
 * @param {Object} disputeData - Dispute data
 * @param {string} disputeData.reason - Dispute reason
 * @param {string} disputeData.evidenceHash - Optional evidence hash
 * @param {string} disputeData.initiatorPubkey - Initiator's public key
 */
export async function disputeEscrow(escrowId, disputeData) {
  return apiRequest(`/escrows/${escrowId}/dispute`, {
    method: 'POST',
    body: JSON.stringify({
      reason: disputeData.reason,
      evidence_hash: disputeData.evidenceHash,
      initiator_pubkey: disputeData.initiatorPubkey,
    }),
  });
}

/**
 * Resolve dispute (arbiter only)
 * @param {string} escrowId - Escrow ID
 * @param {Object} resolveData - Resolution data
 * @param {string} resolveData.winner - 'depositor' or 'recipient'
 * @param {string} resolveData.arbiterSignature - Arbiter's signature
 */
export async function resolveDispute(escrowId, resolveData) {
  return apiRequest(`/escrows/${escrowId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      winner: resolveData.winner,
      arbiter_signature: resolveData.arbiterSignature,
    }),
  });
}

/**
 * Get escrows by depositor
 * @param {string} pubkey - Depositor's public key
 */
export async function getEscrowsByDepositor(pubkey) {
  return apiRequest(`/escrows/by-depositor/${pubkey}`);
}

/**
 * Get escrows by recipient
 * @param {string} pubkey - Recipient's public key
 */
export async function getEscrowsByRecipient(pubkey) {
  return apiRequest(`/escrows/by-recipient/${pubkey}`);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format satoshis to BTC string
 * @param {number} sats - Amount in satoshis
 * @returns {string} Formatted BTC amount
 */
export function formatBtc(sats) {
  return (sats / 100000000).toFixed(8);
}

/**
 * Parse BTC string to satoshis
 * @param {string} btc - BTC amount string
 * @returns {number} Amount in satoshis
 */
export function parseBtc(btc) {
  return Math.round(parseFloat(btc) * 100000000);
}

/**
 * Shorten an address for display
 * @param {string} address - Full address
 * @param {number} chars - Characters to show on each side
 * @returns {string} Shortened address
 */
export function shortenAddress(address, chars = 6) {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default {
  // Health
  checkHealth,
  
  // Orders
  listOrders,
  getOrder,
  createOrder,
  fillOrder,
  partialFillOrder,
  cancelOrder,
  broadcastOrder,
  
  // Wallet
  connectWallet,
  getWalletBalance,
  getWalletUtxos,
  getNewAddress,
  
  // Spells
  proveSpell,
  broadcastTransactions,
  getTransactionStatus,
  
  // Escrows
  listEscrows,
  getEscrow,
  createEscrow,
  releaseEscrow,
  refundEscrow,
  disputeEscrow,
  resolveDispute,
  getEscrowsByDepositor,
  getEscrowsByRecipient,
  
  // Utilities
  formatBtc,
  parseBtc,
  shortenAddress,
};

