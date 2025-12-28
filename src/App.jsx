const offers = [
  {
    name: 'NiftyBruh.eth',
    avatar: '🌀',
    avatarColor: '#d8e8ff',
    asset: '1 ETH',
    chain: 'BASE',
    accepts: ['ETH', 'ARB', 'BTC', 'CELO'],
    partial: true,
    status: 0,
    premium: '1%',
    orderId: '#33',
  },
  {
    name: 'HanweChang.eth',
    avatar: '🧠',
    avatarColor: '#ffe2c6',
    asset: '10 BTC',
    chain: 'BTC',
    accepts: ['BTC', 'SOL', 'CELO', 'ARB'],
    partial: true,
    status: 50,
    premium: '3.5%',
    orderId: '#52',
  },
  {
    name: 'Tacoman.eth',
    avatar: '🌮',
    avatarColor: '#ffeac2',
    asset: '1 NFT',
    chain: 'ARB',
    accepts: ['ARB', 'BTC', 'CELO'],
    partial: false,
    status: 0,
    premium: '5%',
    orderId: '#123',
  },
  {
    name: '0xAB5....39c81',
    avatar: '🛡️',
    avatarColor: '#ffe7d9',
    asset: '1000 USDC',
    chain: 'ARB',
    accepts: ['ARB', 'ETH', 'CELO', 'SOL'],
    partial: false,
    status: 25,
    premium: '2%',
    orderId: '#187',
  },
  {
    name: 'HunterBeast.eth',
    avatar: '🐾',
    avatarColor: '#d9ecff',
    asset: '123 Matic',
    chain: 'MATIC',
    accepts: ['ARB', 'SOL', 'BTC'],
    partial: true,
    status: 75,
    premium: '.05%',
    orderId: '#321',
  },
  {
    name: 'HunterBeast.eth',
    avatar: '🐾',
    avatarColor: '#d9ecff',
    asset: '33k CELO',
    chain: 'CELO',
    accepts: ['CELO', 'SOL', 'ETH'],
    partial: true,
    status: 0,
    premium: '.25%',
    orderId: '#222',
  },
  {
    name: '0xE66....330EA',
    avatar: '✨',
    avatarColor: '#fff4d9',
    asset: '50k USDC',
    chain: 'MATIC',
    accepts: ['ARB', 'SOL', 'ETH'],
    partial: false,
    status: 50,
    premium: '2.2%',
    orderId: '#333',
  },
  {
    name: 'CryptoBabe.eth',
    avatar: '🧜‍♀️',
    avatarColor: '#d9f2ff',
    asset: '101 CELO',
    chain: 'CELO',
    accepts: ['CELO', 'ARB', 'BTC'],
    partial: false,
    status: 0,
    premium: '.03%',
    orderId: '#69',
  },
  {
    name: 'Domo.eth',
    avatar: '🤖',
    avatarColor: '#f2f2f2',
    asset: '20 ETH',
    chain: 'ETH',
    accepts: ['BTC', 'ARB', 'SOL'],
    partial: true,
    status: 75,
    premium: '.11%',
    orderId: '#1111',
  },
  {
    name: 'Frogger.eth',
    avatar: '🐸',
    avatarColor: '#dff7d1',
    asset: '50 Matic',
    chain: 'MATIC',
    accepts: ['CELO', 'ARB'],
    partial: true,
    status: 0,
    premium: '.01%',
    orderId: '#1234',
  },
];

const chainThemes = {
  BASE: { label: 'BASE', background: 'linear-gradient(135deg, #1dd3d7, #0b6c8e)', textColor: '#f6fbff' },
  BTC: { label: 'BTC', background: 'linear-gradient(135deg, #f59a2e, #c86a12)', textColor: '#3b2000' },
  ARB: { label: 'ARB', background: 'linear-gradient(135deg, #0b6c8e, #0b4f72)', textColor: '#e4f6ff' },
  CELO: { label: 'CELO', background: 'linear-gradient(135deg, #1dd3d7, #0f92b4)', textColor: '#083142' },
  SOL: { label: 'SOL', background: 'linear-gradient(135deg, #0b4f72, #0f92b4)', textColor: '#e2f4ff' },
  MATIC: { label: 'MATIC', background: 'linear-gradient(135deg, #0f92b4, #1dd3d7)', textColor: '#083142' },
  ETH: { label: 'ETH', background: 'linear-gradient(135deg, #e9f6ff, #c9e9f7)', textColor: '#0b3c54' },
};

function Avatar({ symbol, color }) {
  return (
    <div className="avatar" style={{ backgroundColor: color }}>
      <span>{symbol}</span>
    </div>
  );
}

function TokenBadge({ token }) {
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

function App() {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="logo-mark" aria-label="Liquid Nation logo">
          <img src="/logo.svg" alt="Liquid Nation" />
        </div>
        <div className="wallet-pill">0x123...</div>
      </header>

      <main className="main-stage">
        <section className="offers-panel" aria-label="Open offers">
          <div className="panel-header">
            <h1>Open Offers</h1>
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
              <div className="table-cell">Order ID</div>
            </div>

            {offers.map((offer) => (
              <div className="table-row" key={`${offer.name}-${offer.orderId}`}>
                <div className="table-cell profile-cell">
                  <Avatar symbol={offer.avatar} color={offer.avatarColor} />
                  <span className="profile-name">{offer.name}</span>
                </div>
                <div className="table-cell text-strong">{offer.asset}</div>
                <div className="table-cell">
                  <TokenBadge token={offer.chain} />
                </div>
                <div className="table-cell accepts-cell">
                  {offer.accepts.map((token) => (
                    <TokenBadge key={`${offer.orderId}-${token}`} token={token} />
                  ))}
                </div>
                <div className="table-cell text-strong">{offer.partial ? 'Yes' : 'No'}</div>
                <div className="table-cell">
                  <StatusCell percent={offer.status} />
                </div>
                <div className="table-cell text-strong">{offer.premium}</div>
                <div className="table-cell order-id">{offer.orderId}</div>
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
              <div className="page-window">1-10 of 92</div>
              <div className="pager-arrows">
                <button type="button" aria-label="Previous page">‹</button>
                <button type="button" aria-label="Next page">›</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <a className="nav-item" href="#">Dashboard</a>
        <a className="nav-item active" href="#">Offers</a>
        <a className="nav-item" href="#">Create</a>
        <a className="nav-item" href="#">Settings</a>
      </nav>
    </div>
  );
}

export default App;
