import { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useWallet } from '../context/WalletContext';
import { useEVMWallet } from '../context/EVMWalletContext';

function CreateOrder({ chainThemes, onNavigate }) {
  const { createOrder } = useOrders();
  const { address: btcAddress, connected: btcConnected } = useWallet();
  const { address: evmAddress, connected: evmConnected } = useEVMWallet();
  
  const [orderType, setOrderType] = useState('limit-buy');
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [chain, setChain] = useState('ETH');
  const [acceptedTokens, setAcceptedTokens] = useState([]);
  const [partialFills, setPartialFills] = useState(true);
  const [premium, setPremium] = useState('');
  const [selectedBTCWallet, setSelectedBTCWallet] = useState('');
  const [selectedEVMWallet, setSelectedEVMWallet] = useState('');

  const chains = Object.keys(chainThemes);

  const formatWalletAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleTokenToggle = (token) => {
    if (acceptedTokens.includes(token)) {
      setAcceptedTokens(acceptedTokens.filter(t => t !== token));
    } else {
      setAcceptedTokens([...acceptedTokens, token]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create the order with all the form data including wallet selections
    const newOrder = {
      orderType,
      asset: `${amount} ${asset}`,
      chain,
      accepts: acceptedTokens,
      partial: partialFills,
      premium: `${premium}%`,
      btcWallet: selectedBTCWallet || btcAddress,
      evmWallet: selectedEVMWallet || evmAddress,
    };
    
    createOrder(newOrder);
    
    // Reset form
    setOrderType('limit-buy');
    setAsset('');
    setAmount('');
    setChain('ETH');
    setAcceptedTokens([]);
    setPartialFills(true);
    setPremium('');
    setSelectedBTCWallet('');
    setSelectedEVMWallet('');
    
    // Navigate back to dashboard to see the newly created order
    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  return (
    <section className="offers-panel" aria-label="Create order">
      <div className="panel-header">
        <h1>Create Order</h1>
      </div>

      <div className="create-order-form">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">Order Type</label>
            <div className="order-type-buttons">
              <button
                type="button"
                className={`order-type-btn ${orderType === 'limit-buy' ? 'active' : ''}`}
                onClick={() => setOrderType('limit-buy')}
              >
                Limit Buy Order
              </button>
              <button
                type="button"
                className={`order-type-btn ${orderType === 'limit-sell' ? 'active' : ''}`}
                onClick={() => setOrderType('limit-sell')}
              >
                Limit Sell Order
              </button>
              <button
                type="button"
                className={`order-type-btn ${orderType === 'market-buy' ? 'active' : ''}`}
                onClick={() => setOrderType('market-buy')}
              >
                Market Buy Order
              </button>
              <button
                type="button"
                className={`order-type-btn ${orderType === 'market-sell' ? 'active' : ''}`}
                onClick={() => setOrderType('market-sell')}
              >
                Market Sell Order
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="asset">Asset</label>
              <input
                type="text"
                id="asset"
                className="form-input"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="e.g., ETH, BTC, USDC"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">Amount</label>
              <input
                type="number"
                id="amount"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="chain">Chain</label>
              <select
                id="chain"
                className="form-select"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
              >
                {chains.map(chainName => (
                  <option key={chainName} value={chainName}>
                    {chainThemes[chainName].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="premium">Premium (%)</label>
              <input
                type="number"
                id="premium"
                className="form-input"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                placeholder="0.0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Wallet Selection</label>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="btcWallet">Bitcoin Wallet</label>
                <select
                  id="btcWallet"
                  className="form-select"
                  value={selectedBTCWallet}
                  onChange={(e) => setSelectedBTCWallet(e.target.value)}
                  disabled={!btcConnected}
                >
                  <option value="">
                    {btcConnected ? `Use connected: ${formatWalletAddress(btcAddress)}` : 'No Bitcoin wallet connected'}
                  </option>
                  {btcConnected && (
                    <option value={btcAddress}>
                      {formatWalletAddress(btcAddress)}
                    </option>
                  )}
                </select>
                {!btcConnected && (
                  <p className="form-help" style={{ color: 'orange' }}>
                    Please connect a Bitcoin wallet to create orders
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="evmWallet">EVM Wallet</label>
                <select
                  id="evmWallet"
                  className="form-select"
                  value={selectedEVMWallet}
                  onChange={(e) => setSelectedEVMWallet(e.target.value)}
                  disabled={!evmConnected}
                >
                  <option value="">
                    {evmConnected ? `Use connected: ${formatWalletAddress(evmAddress)}` : 'No EVM wallet connected'}
                  </option>
                  {evmConnected && (
                    <option value={evmAddress}>
                      {formatWalletAddress(evmAddress)}
                    </option>
                  )}
                </select>
                {!evmConnected && (
                  <p className="form-help" style={{ color: 'orange' }}>
                    Connect an EVM wallet for cross-chain orders
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Accepted Tokens</label>
            <div className="token-selector">
              {chains.map(token => (
                <button
                  key={token}
                  type="button"
                  className={`token-selector-btn ${acceptedTokens.includes(token) ? 'selected' : ''}`}
                  onClick={() => handleTokenToggle(token)}
                  style={{
                    background: acceptedTokens.includes(token) 
                      ? chainThemes[token].background 
                      : '#f0f0f0',
                    color: acceptedTokens.includes(token) 
                      ? chainThemes[token].textColor 
                      : '#666'
                  }}
                >
                  {chainThemes[token].label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={partialFills}
                onChange={(e) => setPartialFills(e.target.checked)}
              />
              <span>Allow partial fills</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit">
              Create Order
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default CreateOrder;
