import { useState, useRef, useEffect } from 'react';

function TokenSelector({ label, value, amount, onTokenChange, onAmountChange, chainThemes, disabled }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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

  const theme = chainThemes[value] || chainThemes.ETH;
  const tokens = Object.keys(chainThemes);

  return (
    <div className="swap-token-selector">
      <div className="swap-selector-header">
        <label>{label}</label>
        <span className="swap-balance">Balance: 0.00</span>
      </div>
      <div className="swap-selector-body">
        <input
          type="number"
          placeholder="0.0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          disabled={disabled}
          className="swap-amount-input"
        />
        <div className="swap-token-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="swap-token-button"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ background: theme.background, color: theme.textColor }}
          >
            {theme.label} ▼
          </button>
          {showDropdown && (
            <div className="swap-dropdown-menu">
              {tokens.map((token) => {
                const tokenTheme = chainThemes[token];
                return (
                  <button
                    key={token}
                    type="button"
                    className={`swap-dropdown-item ${value === token ? 'active' : ''}`}
                    onClick={() => {
                      onTokenChange(token);
                      setShowDropdown(false);
                    }}
                    style={{ background: tokenTheme.background, color: tokenTheme.textColor }}
                  >
                    {tokenTheme.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Swap({ chainThemes }) {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('BASE');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Simple exchange rate calculation (mock)
  const exchangeRate = 1.05;

  // Calculate toAmount based on fromAmount
  const toAmount = fromAmount && !isNaN(fromAmount) 
    ? (parseFloat(fromAmount) * exchangeRate).toFixed(6)
    : '';

  const handleSwapDirection = () => {
    const currentToAmount = toAmount;
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(currentToAmount);
  };

  const handleSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    alert(`Swapping ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`);
  };

  return (
    <section className="swap-panel" aria-label="Token Swap">
      <div className="swap-header">
        <h1>Swap</h1>
        <div className="swap-settings-wrapper" ref={settingsRef}>
          <button
            type="button"
            className="swap-settings-button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
          >
            ⚙
          </button>
          {showSettings && (
            <div className="swap-settings-menu">
              <div className="swap-settings-item">
                <label>Slippage Tolerance</label>
                <div className="swap-slippage-options">
                  {['0.1', '0.5', '1.0'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`swap-slippage-button ${slippage === value ? 'active' : ''}`}
                      onClick={() => setSlippage(value)}
                    >
                      {value}%
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Custom"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="swap-slippage-custom"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="swap-container">
        <TokenSelector
          label="You pay"
          value={fromToken}
          amount={fromAmount}
          onTokenChange={setFromToken}
          onAmountChange={setFromAmount}
          chainThemes={chainThemes}
        />
        
        <div className="swap-action-row">
          <button
            type="button"
            className="swap-direction-button"
            onClick={handleSwapDirection}
            aria-label="Reverse swap direction"
          >
            ⇅
          </button>
        </div>

        <TokenSelector
          label="You receive"
          value={toToken}
          amount={toAmount}
          onTokenChange={setToToken}
          onAmountChange={() => {}}
          chainThemes={chainThemes}
          disabled={true}
        />

        {fromAmount && toAmount && (
          <div className="swap-rate-info">
            <div className="swap-rate-row">
              <span>Rate</span>
              <span>1 {fromToken} = {exchangeRate.toFixed(6)} {toToken}</span>
            </div>
            <div className="swap-rate-row">
              <span>Slippage Tolerance</span>
              <span>{slippage}%</span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="swap-button"
          onClick={handleSwap}
          disabled={!fromAmount || parseFloat(fromAmount) <= 0}
        >
          {!fromAmount || parseFloat(fromAmount) <= 0 ? 'Enter an amount' : 'Swap'}
        </button>
      </div>
    </section>
  );
}

export default Swap;
