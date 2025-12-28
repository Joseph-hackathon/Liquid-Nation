import { offers } from '../data';

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

function Dashboard({ chainThemes }) {
  // Filter for user's orders (for demo, we'll show orders from HunterBeast.eth)
  const userOrders = offers.filter(offer => offer.name === 'HunterBeast.eth');

  return (
    <section className="offers-panel" aria-label="Your orders">
      <div className="panel-header">
        <h1>My Orders</h1>
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
            </div>

            {userOrders.map((offer) => (
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
              <div className="page-window">1-{userOrders.length} of {userOrders.length}</div>
              <div className="pager-arrows">
                <button type="button" aria-label="Previous page">‹</button>
                <button type="button" aria-label="Next page">›</button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Dashboard;
