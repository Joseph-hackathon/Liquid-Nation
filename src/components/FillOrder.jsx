/**
 * FillOrder Component
 * 
 * Allows users to fill (take) an existing order by sending their tokens
 * in exchange for the maker's tokens.
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrders } from '../context/OrderContext';
import { useWallet } from '../context/WalletContext';
import { useEVMWallet } from '../context/EVMWalletContext';
import * as api from '../services/api';
import './FillOrder.css';

// Order status enum
const OrderStatus = {
  Active: 'active',
  PendingSignature: 'pendingsignature',
  Pending: 'pending',
  PartiallyFilled: 'partiallyfilled',
  Filled: 'filled',
  Cancelled: 'cancelled',
  Expired: 'expired',
};

const getStatusLabel = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'Active';
    case 'pendingsignature': return 'Pending Signature';
    case 'pending': return 'Pending';
    case 'partiallyfilled': return 'Partially Filled';
    case 'filled': return 'Filled';
    case 'cancelled': return 'Cancelled';
    case 'expired': return 'Expired';
    default: return status || 'Unknown';
  }
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'status-active';
    case 'pendingsignature': 
    case 'pending': return 'status-pending';
    case 'partiallyfilled': return 'status-partial';
    case 'filled': return 'status-filled';
    case 'cancelled': 
    case 'expired': return 'status-cancelled';
    default: return 'status-unknown';
  }
};

function FillOrder({ orderId, chainThemes, onNavigate }) {
  const { orders, fillOrder, loading: ordersLoading } = useOrders();
  const { connected: btcConnected, address: btcAddress, signPsbt } = useWallet() || {};
  const { connected: evmConnected, address: evmAddress } = useEVMWallet() || {};
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fill form state
  const [fillPercent, setFillPercent] = useState(100);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [fillResult, setFillResult] = useState(null);
  
  // Signing modal state
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [unsignedTx, setUnsignedTx] = useState(null);
  const [signedTxHex, setSignedTxHex] = useState('');

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First check local orders
        const localOrder = orders.find(o => o.orderId === orderId);
        if (localOrder) {
          setOrder(localOrder);
          setLoading(false);
          return;
        }
        
        // If not found locally, fetch from API
        const apiOrder = await api.getOrder(orderId);
        if (apiOrder) {
          setOrder({
            orderId: apiOrder.id,
            name: api.shortenAddress(apiOrder.maker_address),
            makerAddress: apiOrder.maker_address,
            asset: `${api.formatBtc(apiOrder.offer_amount)} ${apiOrder.offer_token}`,
            offerToken: apiOrder.offer_token,
            offerAmount: apiOrder.offer_amount,
            wantToken: apiOrder.want_token,
            wantAmount: apiOrder.want_amount,
            chain: apiOrder.source_chain,
            destChain: apiOrder.dest_chain,
            accepts: [apiOrder.want_token],
            partial: apiOrder.allow_partial,
            status: apiOrder.status,
            filledAmount: apiOrder.filled_amount || '0',
            expiryHeight: apiOrder.expiry_height,
            createdAt: apiOrder.created_at,
            _apiOrder: apiOrder,
          });
        }
      } catch (err) {
        console.error('Failed to load order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, orders]);

  // Calculate fill amounts based on percentage
  const calculateFillAmounts = useCallback(() => {
    if (!order) return { receiveAmount: '0', sendAmount: '0' };
    
    const offerAmount = parseFloat(order.offerAmount || order._apiOrder?.offer_amount || '0');
    const wantAmount = parseFloat(order.wantAmount || order._apiOrder?.want_amount || '0');
    const filledAmount = parseFloat(order.filledAmount || '0');
    const remainingAmount = offerAmount - filledAmount;
    
    const fillFraction = fillPercent / 100;
    const receiveAmount = remainingAmount * fillFraction;
    const sendAmount = wantAmount * fillFraction;
    
    return {
      receiveAmount: receiveAmount.toFixed(8),
      sendAmount: sendAmount.toFixed(8),
      remainingPercent: ((remainingAmount / offerAmount) * 100).toFixed(1),
    };
  }, [order, fillPercent]);

  const { receiveAmount, sendAmount, remainingPercent } = calculateFillAmounts();

  // Handle approve token (for ERC20 tokens)
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // In a real implementation, this would approve the token transfer
      // For now, we'll simulate approval
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsApproved(true);
    } catch (err) {
      console.error('Approval failed:', err);
      setError('Failed to approve token');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle fill order
  const handleFill = async () => {
    if (!order) return;
    
    setIsFilling(true);
    setError(null);
    
    try {
      const takerAddress = btcAddress || evmAddress;
      if (!takerAddress) {
        throw new Error('Please connect a wallet first');
      }

      // Call the fill order API
      const response = await api.fillOrder(orderId, {
        taker_address: takerAddress,
        fill_amount: sendAmount,
        fill_percent: fillPercent,
      });

      if (response && response.unsigned_txs && response.unsigned_txs.length > 0) {
        // Show signing modal
        setUnsignedTx(response.unsigned_txs[0]);
        setShowSigningModal(true);
      } else if (response && response.txid) {
        // Already completed (mock mode)
        setFillResult({
          success: true,
          txid: response.txid,
          message: 'Order filled successfully!',
        });
      } else {
        throw new Error('Failed to create fill transaction');
      }
    } catch (err) {
      console.error('Fill failed:', err);
      setError(err.message || 'Failed to fill order');
    } finally {
      setIsFilling(false);
    }
  };

  // Handle signing
  const handleSign = async () => {
    if (!unsignedTx) return;
    
    setIsFilling(true);
    try {
      // Check if this is a mock transaction
      const isMock = unsignedTx.hex?.includes('mock') || unsignedTx.txid?.includes('mock');
      
      if (isMock) {
        // Simulate signing for mock transactions
        setSignedTxHex(`signed_mock_${unsignedTx.txid}`);
        await handleBroadcast(`signed_mock_${unsignedTx.txid}`);
      } else if (btcConnected && signPsbt) {
        // Sign with wallet
        const signed = await signPsbt(unsignedTx.hex, {
          finalize: true,
          broadcast: false,
        });
        setSignedTxHex(signed);
        await handleBroadcast(signed);
      } else {
        setError('Please connect a Bitcoin wallet to sign');
      }
    } catch (err) {
      console.error('Signing failed:', err);
      setError(`Failed to sign: ${err.message}`);
    } finally {
      setIsFilling(false);
    }
  };

  // Handle broadcast
  const handleBroadcast = async (signedHex) => {
    try {
      const result = await api.broadcastOrder(orderId, signedHex);
      setFillResult({
        success: true,
        txid: result.txid,
        message: result.message || 'Order filled successfully!',
      });
      setShowSigningModal(false);
    } catch (err) {
      console.error('Broadcast failed:', err);
      setError(`Failed to broadcast: ${err.message}`);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="fill-order-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !order) {
    return (
      <div className="fill-order-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Error Loading Order</h2>
          <p>{error}</p>
          <button className="btn-back" onClick={() => onNavigate('offers')}>
            ← Back to Offers
          </button>
        </div>
      </div>
    );
  }

  // Render success state
  if (fillResult?.success) {
    return (
      <div className="fill-order-container">
        <div className="success-state">
          <span className="success-icon">🎉</span>
          <h2>Order Filled Successfully!</h2>
          <p>{fillResult.message}</p>
          {fillResult.txid && (
            <div className="tx-info">
              <span>Transaction ID:</span>
              <a 
                href={`https://mempool.space/testnet4/tx/${fillResult.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                {api.shortenAddress(fillResult.txid, 12)}
              </a>
            </div>
          )}
          <button className="btn-primary" onClick={() => onNavigate('offers')}>
            Back to Offers
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fill-order-container">
        <div className="error-state">
          <span className="error-icon">🔍</span>
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist or has been removed.</p>
          <button className="btn-back" onClick={() => onNavigate('offers')}>
            ← Back to Offers
          </button>
        </div>
      </div>
    );
  }

  const theme = chainThemes?.[order.chain] || chainThemes?.BTC || { background: '#f7931a', textColor: '#000' };
  const canFill = order.status?.toLowerCase() === 'active' || order.status?.toLowerCase() === 'partiallyfilled';
  
  // Check if current user is the maker of this order
  const isOwnOrder = (btcAddress && (order.makerAddress === btcAddress || order.btcWallet === btcAddress)) ||
                     (evmAddress && (order.makerAddress === evmAddress || order.evmWallet === evmAddress));

  return (
    <div className="fill-order-container">
      {/* Header */}
      <div className="fill-order-header">
        <button className="btn-back" onClick={() => onNavigate('offers')}>
          ← Back
        </button>
        <h1>Fill Order</h1>
        <div className="order-id">Order #{api.shortenAddress(orderId, 8)}</div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Order Status */}
      <div className="status-card">
        <div className="status-header">
          <span>Order Status</span>
          <span className={`status-badge ${getStatusClass(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
        <div className="status-bar">
          <div 
            className="status-fill"
            style={{ width: `${100 - parseFloat(remainingPercent)}%` }}
          />
        </div>
        <div className="status-text">
          {remainingPercent}% remaining
        </div>
      </div>

      {/* You Receive Section */}
      <div className="trade-section receive-section">
        <h3>📥 You Receive</h3>
        <div className="trade-from">
          From: <span className="address">{api.shortenAddress(order.makerAddress || order.name, 12)}</span>
        </div>
        <div className="trade-amount">
          <span className="amount">{api.formatBtc(receiveAmount)}</span>
          <span className="token">{order.offerToken || 'BTC'}</span>
          <span 
            className="chain-badge"
            style={{ background: theme.background, color: theme.textColor }}
          >
            {order.chain}
          </span>
        </div>
      </div>

      {/* Exchange Arrow */}
      <div className="exchange-arrow">
        <span>⇅</span>
      </div>

      {/* You Send Section */}
      <div className="trade-section send-section">
        <h3>📤 You Send</h3>
        <div className="trade-amount">
          <span className="amount">{api.formatBtc(sendAmount)}</span>
          <span className="token">{order.wantToken || 'USDC'}</span>
          <span className="chain-badge chain-dest">
            {order.destChain || order.chain}
          </span>
        </div>
      </div>

      {/* Partial Fill Slider */}
      {order.partial && canFill && (
        <div className="partial-fill-section">
          <div className="partial-header">
            <span>✂️ Partial Fill Available</span>
            <span className="fill-percent">{fillPercent}%</span>
          </div>
          <p className="partial-description">
            Use the slider to choose how much of the order you want to fill
          </p>
          <input
            type="range"
            min="1"
            max="100"
            value={fillPercent}
            onChange={(e) => setFillPercent(parseInt(e.target.value))}
            className="fill-slider"
          />
          <div className="slider-labels">
            <span>1%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Wallet Status */}
      <div className={`wallet-status ${btcConnected || evmConnected ? 'connected' : 'disconnected'}`}>
        {btcConnected || evmConnected ? (
          <>
            <span>🔗</span>
            <span>Connected: {api.shortenAddress(btcAddress || evmAddress, 8)}</span>
          </>
        ) : (
          <>
            <span>⚠️</span>
            <span>Please connect a wallet to fill this order</span>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {isOwnOrder ? (
          <div className="own-order-notice">
            <span>📋</span>
            <p>This is your order. You can view the details but cannot fill your own order.</p>
            <button className="btn-secondary" onClick={() => onNavigate('offers')}>
              Back to Offers
            </button>
          </div>
        ) : !canFill ? (
          <button className="btn-disabled" disabled>
            Order Not Available
          </button>
        ) : !btcConnected && !evmConnected ? (
          <button className="btn-primary" onClick={() => onNavigate('wallet')}>
            Connect Wallet
          </button>
        ) : !isApproved && order.wantToken !== 'BTC' ? (
          <button 
            className="btn-approve"
            onClick={handleApprove}
            disabled={isApproving}
          >
            {isApproving ? '⏳ Approving...' : '✓ Approve Token'}
          </button>
        ) : (
          <button 
            className="btn-fill"
            onClick={handleFill}
            disabled={isFilling}
          >
            {isFilling ? '⏳ Processing...' : '🔄 Fill Order'}
          </button>
        )}
      </div>

      {/* Signing Modal */}
      {showSigningModal && unsignedTx && (
        <div className="signing-modal-overlay" onClick={() => setShowSigningModal(false)}>
          <div className="signing-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSigningModal(false)}>×</button>
            <h2>🔐 Sign Fill Transaction</h2>
            
            <div className="tx-details">
              <p>Transaction ID: <code>{unsignedTx.txid}</code></p>
              <details>
                <summary>View Transaction Hex</summary>
                <pre>{unsignedTx.hex}</pre>
              </details>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSigningModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSign}
                disabled={isFilling}
              >
                {isFilling ? '⏳ Signing...' : '✍️ Sign & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FillOrder;

