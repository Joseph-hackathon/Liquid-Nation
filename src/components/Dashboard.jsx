import { useState, useRef, useEffect } from 'react';
import { useOrders } from '../context/OrderContext';

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

function Dashboard({ chainThemes, onNavigate }) {
  const { orders, deleteOrder } = useOrders();
  
  // Filter for user's orders (orders created by the current user)
  // For demo purposes, we identify user orders by the placeholder name used in OrderContext
  const userOrders = orders.filter(order => order.name === '0xAB5....39c81');
  
  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Calculate pagination values
  const totalOrders = userOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalOrders);
  const paginatedOrders = userOrders.slice(startIndex, endIndex);

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

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      deleteOrder(orderId);
      // If we're on a page that becomes empty after deletion, go back a page
      if (paginatedOrders.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  return (
    <section className="offers-panel" aria-label="Your orders">
      <div className="panel-header">
        <h1>My Orders</h1>
        <button
          type="button"
          className="btn-create-order"
          onClick={() => onNavigate('create')}
          aria-label="Create new order"
        >
          Create Order
        </button>
      </div>

      {userOrders.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any open orders yet.</p>
          <p>Click "Create" to get started!</p>
        </div>
      ) : (
        <>
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
                <div className="table-cell">
                  <button
                    type="button"
                    className="btn-cancel-order"
                    onClick={() => handleCancelOrder(offer.orderId)}
                    aria-label={`Cancel order ${offer.orderId}`}
                  >
                    Cancel
                  </button>
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
        </>
      )}
    </section>
  );
}

export default Dashboard;
