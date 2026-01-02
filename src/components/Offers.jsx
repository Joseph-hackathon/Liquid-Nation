import { useState, useEffect, useRef } from 'react';
import { useOrders } from '../context/OrderContext';
import { useWallet } from '../context/WalletContext';
import { useEVMWallet } from '../context/EVMWalletContext';

function Avatar({ symbol, color }) {
  return (
    <div className="avatar" style={{ backgroundColor: color }}>
      <span>{symbol}</span>
    </div>
  );
}

function TokenBadge({ token, chainThemes }) {
  const theme = chainThemes[token] || chainThemes.ETH;
  return (
    <div className="token-badge" style={{ background: theme.background, color: theme.textColor }}>
      {theme.label}
    </div>
  );
}

function StatusCell({ percent }) {
  if (!percent) return <span className="status-zero">0%</span>;

  return (
    <div className="status-indicator" aria-label={`Status ${percent}%`}>
      <div
        className="status-ring"
        style={{ background: `conic-gradient(#5bc35b ${percent}%, #e8e8e8 ${percent}%)` }}
      >
        <span>{percent}%</span>
      </div>
    </div>
  );
}

function Offers({ chainThemes, onNavigate }) {
  const { orders, deleteOrder } = useOrders();
  const { address: btcAddress } = useWallet();
  const { address: evmAddress } = useEVMWallet();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuRef = useRef(null);

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showCreateMenu || showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCreateMenu, showDropdown]);

  // Calculate pagination values
  const totalOrders = orders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalOrders);
  const paginatedOrders = orders.slice(startIndex, endIndex);

  // Handle items per page change
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
    setShowDropdown(false);
  };

  // Handle page navigation
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleCreateOrderClick = () => {
    setShowCreateMenu(false);
    onNavigate('create');
  };

  // Check if an order belongs to the currently connected wallet
  const isUserOrder = (order) => {
    if (!btcAddress && !evmAddress) return false;
    return (btcAddress && order.btcWallet === btcAddress) || 
           (evmAddress && order.evmWallet === evmAddress);
  };

  const handleDeleteOrder = async (orderId) => {
    // Find the order to check ownership
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;
    
    // Verify the user owns this order (defensive check - button should be hidden for non-owned orders)
    if (!isUserOrder(order)) {
      console.error(`Unauthorized cancellation attempt for order ${orderId}. Order wallets: BTC=${order.btcWallet}, EVM=${order.evmWallet}. Connected wallets: BTC=${btcAddress}, EVM=${evmAddress}`);
      return;
    }
    
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await deleteOrder(orderId);
      } catch (err) {
        console.error('Failed to cancel order:', err);
        alert('Failed to cancel order. Please try again.');
      }
    }
  };

  return (
    <section className="offers-panel" aria-label="Open offers">
      <div className="panel-header">
        <h1>Open Offers</h1>
        <div className="create-order-wrapper" ref={menuRef}>
          <button 
            type="button" 
            className="btn-create-order"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            aria-expanded={showCreateMenu}
            aria-label="Create order menu"
          >
            Create Order
          </button>
          {showCreateMenu && (
            <div className="create-order-menu">
              <button type="button" className="menu-item" onClick={handleCreateOrderClick}>Create Buy Order</button>
              <button type="button" className="menu-item" onClick={handleCreateOrderClick}>Create Sell Order</button>
              <button type="button" className="menu-item" onClick={handleCreateOrderClick}>Create Swap Order</button>
            </div>
          )}
        </div>
      </div>

      <div className="table">
        <div className="table-row table-head">
          <div className="table-cell">Profile</div>
          <div className="table-cell">Asset</div>
          <div className="table-cell">Chain</div>
          <div className="table-cell">Accepts</div>
          <div className="table-cell">Partial</div>
          <div className="table-cell">Status</div>
          <div className="table-cell">Premium</div>
          <div className="table-cell">Actions</div>
        </div>

        {paginatedOrders.map((offer) => (
          <div className="table-row" key={`${offer.name}-${offer.orderId}`}>
            <div className="table-cell profile-cell">
              <Avatar symbol={offer.avatar} color={offer.avatarColor} />
              <span className="profile-name">{offer.name}</span>
            </div>
            <div className="table-cell text-strong">{offer.asset}</div>
            <div className="table-cell">
              <TokenBadge token={offer.chain} chainThemes={chainThemes} />
            </div>
            <div className="table-cell accepts-cell">
              {offer.accepts.map((token) => (
                <TokenBadge key={`${offer.orderId}-${token}`} token={token} chainThemes={chainThemes} />
              ))}
            </div>
            <div className="table-cell text-strong">{offer.partial ? 'Yes' : 'No'}</div>
            <div className="table-cell">
              <StatusCell percent={offer.status} />
            </div>
            <div className="table-cell text-strong">{offer.premium}</div>
            <div className="table-cell actions-cell">
              <div className="action-buttons-group">
                {isUserOrder(offer) && (
                  <button
                    type="button"
                    className="btn-delete-order"
                    onClick={() => handleDeleteOrder(offer.orderId)}
                    aria-label="Cancel order"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="btn-fill-order"
                  onClick={() => onNavigate('fill', offer.orderId)}
                  aria-label="Fill this order"
                  title={isUserOrder(offer) ? "View your order details" : "Fill this order"}
                >
                  {isUserOrder(offer) ? 'View' : 'Fill'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <div className="footer-actions" aria-label="Table actions">
          <button type="button" className="icon-button" aria-label="Resize">
            ☐
          </button>
          <button type="button" className="icon-button" aria-label="Refresh">
            ↻
          </button>
        </div>

        <div className="pagination">
          <div className="per-page">Orders Per Page:</div>
          <div className="dropdown" ref={dropdownRef}>
            <button 
              type="button" 
              onClick={() => setShowDropdown(!showDropdown)}
              aria-expanded={showDropdown}
              aria-label="Items per page"
            >
              {itemsPerPage} ▼
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
                {[10, 25, 50, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleItemsPerPageChange(value)}
                    className={itemsPerPage === value ? 'active' : ''}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="page-window">
            {totalOrders === 0 ? '0-0 of 0' : `${startIndex + 1}-${endIndex} of ${totalOrders}`}
          </div>
          <div className="pager-arrows">
            <button 
              type="button" 
              aria-label="Previous page"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            <button 
              type="button" 
              aria-label="Next page"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Offers;
