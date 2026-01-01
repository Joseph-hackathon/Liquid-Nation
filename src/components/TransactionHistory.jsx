/**
 * TransactionHistory Component
 * 
 * Displays a history of all order transactions including:
 * - Order creation
 * - Escrow locks
 * - Fills and cancellations
 * - Broadcast status
 */

import { useState, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const { orders } = useOrders();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, confirmed, failed

  // Build transaction list from orders
  useEffect(() => {
    const txList = orders
      .filter(order => order.txid || order.id)
      .map(order => ({
        id: order.txid || order.id,
        orderId: order.orderId,
        type: getTransactionType(order),
        status: getTransactionStatus(order),
        amount: order.asset || `${order.offer_amount} ${order.offer_token}`,
        timestamp: order.created_at || new Date().toISOString(),
        chain: order.chain || 'BTC',
        isMock: order.txid?.startsWith('mock_') || !order.txid,
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setTransactions(txList);
  }, [orders]);

  const getTransactionType = (order) => {
    if (order.rawStatus === 'cancelled') return 'Cancel';
    if (order.rawStatus === 'filled') return 'Fill';
    if (order.rawStatus === 'pending_signature') return 'Pending';
    return 'Create';
  };

  const getTransactionStatus = (order) => {
    if (order.txid?.startsWith('mock_')) return 'simulated';
    if (order.rawStatus === 'pending_signature') return 'pending';
    if (order.txid) return 'confirmed';
    return 'pending';
  };

  const filteredTxs = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return '✅';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      case 'simulated': return '🧪';
      default: return '•';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Create': return '📝';
      case 'Fill': return '🔄';
      case 'Cancel': return '🚫';
      case 'Pending': return '⏳';
      default: return '📋';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortenTxid = (txid) => {
    if (!txid) return 'N/A';
    if (txid.length <= 16) return txid;
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  const getExplorerUrl = (txid, chain) => {
    if (txid?.startsWith('mock_')) return null;
    // Testnet4 explorer
    return `https://mempool.space/testnet4/tx/${txid}`;
  };

  return (
    <div className="tx-history">
      <div className="tx-history-header">
        <h2>📜 Transaction History</h2>
        <div className="tx-filters">
          {['all', 'confirmed', 'pending', 'simulated'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredTxs.length === 0 ? (
        <div className="tx-empty">
          <div className="empty-icon">📭</div>
          <p>No transactions yet</p>
          <span>Create an order to see transactions here</span>
        </div>
      ) : (
        <div className="tx-list">
          {filteredTxs.map((tx, index) => (
            <div 
              key={tx.id || index} 
              className={`tx-item ${tx.status} ${tx.isMock ? 'mock' : ''}`}
            >
              <div className="tx-icon">
                {getTypeIcon(tx.type)}
              </div>
              
              <div className="tx-details">
                <div className="tx-main">
                  <span className="tx-type">{tx.type} Order</span>
                  <span className="tx-order-id">{tx.orderId}</span>
                </div>
                <div className="tx-meta">
                  <span className="tx-amount">{tx.amount}</span>
                  <span className="tx-chain">{tx.chain}</span>
                  <span className="tx-time">{formatDate(tx.timestamp)}</span>
                </div>
              </div>

              <div className="tx-status-section">
                <div className={`tx-status ${tx.status}`}>
                  {getStatusIcon(tx.status)}
                  <span>{tx.status}</span>
                </div>
                
                {tx.id && (
                  <div className="tx-id">
                    {getExplorerUrl(tx.id, tx.chain) ? (
                      <a 
                        href={getExplorerUrl(tx.id, tx.chain)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        {shortenTxid(tx.id)} ↗
                      </a>
                    ) : (
                      <span className="tx-mock-id" title="Simulated transaction (mock mode)">
                        {shortenTxid(tx.id)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mock-notice">
          <span>⚡</span>
          <p>
            <strong>Bitcoin Testnet4:</strong> All transactions are on the Bitcoin testnet. 
            Click on any transaction ID to view it on <a href="https://mempool.space/testnet4" target="_blank" rel="noopener noreferrer">mempool.space</a>.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;

