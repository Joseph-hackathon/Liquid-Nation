import { useState, useEffect, useRef } from 'react';
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

function Offers({ chainThemes, onNavigate }) {
  const { orders, deleteOrder } = useOrders();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
    };

    if (showCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCreateMenu]);

  const handleCreateOrderClick = () => {
    setShowCreateMenu(false);
    onNavigate('create');
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      deleteOrder(orderId);
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

        {orders.map((offer) => (
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
                className="btn-delete-order"
                onClick={() => handleDeleteOrder(offer.orderId)}
                aria-label="Cancel order"
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
          <div className="dropdown">10 ▼</div>
          <div className="page-window">1-{Math.min(10, orders.length)} of {orders.length}</div>
          <div className="pager-arrows">
            <button type="button" aria-label="Previous page">‹</button>
            <button type="button" aria-label="Next page">›</button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Offers;
