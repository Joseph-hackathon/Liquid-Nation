import { useState } from 'react';
import { useOrders } from '../context/OrderContext';

function CreateOrder({ chainThemes, onNavigate }) {
  const { createOrder } = useOrders();
  const [orderType, setOrderType] = useState('limit-buy');
  const [asset, setAsset] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [chain, setChain] = useState('ETH');
  const [acceptedTokens, setAcceptedTokens] = useState([]);
  const [partialFills, setPartialFills] = useState(true);
  const [premium, setPremium] = useState('');

  const chains = Object.keys(chainThemes);
  const availableAssets = chains; // Use the same chains/tokens as available assets

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
      orderType,
      asset: `${amount} ${asset}`,
      chain,
      accepts: acceptedTokens,
      partial: partialFills,
      premium: `${premium}%`,
    };
    
    createOrder(newOrder);
    
    // Reset form
    setOrderType('limit-buy');
    setAsset('BTC');
    setAmount('');
    setChain('ETH');
    setAcceptedTokens([]);
    setPartialFills(true);
    setPremium('');
    
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
              <select
                id="asset"
                className="form-select"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                required
              >
                {availableAssets.map(assetName => (
                  <option key={assetName} value={assetName}>
                    {chainThemes[assetName].label}
                  </option>
                ))}
              </select>
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
