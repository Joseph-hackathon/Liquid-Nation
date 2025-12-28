import { useState } from 'react';
import { useOrders } from '../context/OrderContext';

function CreateOrder({ chainThemes, onNavigate }) {
  const { createOrder } = useOrders();
  const [orderType, setOrderType] = useState('buy');
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [chain, setChain] = useState('ETH');
  const [acceptedTokens, setAcceptedTokens] = useState([]);
  const [partialFills, setPartialFills] = useState(true);
  const [premium, setPremium] = useState('');

  const chains = Object.keys(chainThemes);

  const handleTokenToggle = (token) => {
    if (acceptedTokens.includes(token)) {
      setAcceptedTokens(acceptedTokens.filter(t => t !== token));
    } else {
      setAcceptedTokens([...acceptedTokens, token]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create the order with all the form data
    const newOrder = {
      asset: `${amount} ${asset}`,
      chain,
      accepts: acceptedTokens,
      partial: partialFills,
      premium: `${premium}%`,
    };
    
    createOrder(newOrder);
    
    // Reset form
    setAsset('');
    setAmount('');
    setChain('ETH');
    setAcceptedTokens([]);
    setPartialFills(true);
    setPremium('');
    
    // Navigate back to offers page if onNavigate is provided
    if (onNavigate) {
      onNavigate('offers');
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
                className={`order-type-btn ${orderType === 'buy' ? 'active' : ''}`}
                onClick={() => setOrderType('buy')}
              >
                Buy Order
              </button>
              <button
                type="button"
                className={`order-type-btn ${orderType === 'sell' ? 'active' : ''}`}
                onClick={() => setOrderType('sell')}
              >
                Sell Order
              </button>
              <button
                type="button"
                className={`order-type-btn ${orderType === 'swap' ? 'active' : ''}`}
                onClick={() => setOrderType('swap')}
              >
                Swap Order
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
