import { useState } from 'react';

function Settings() {
  const [username, setUsername] = useState('HunterBeast.eth');
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Settings saved!');
  };

  return (
    <section className="offers-panel" aria-label="Settings">
      <div className="panel-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h2 className="settings-section-title">Profile</h2>
            
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email (optional)</label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Wallet Address</label>
              <div className="wallet-display">0x123...456</div>
              <button type="button" className="btn-secondary-small">Disconnect</button>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Preferences</h2>
            
            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <span>Enable notifications</span>
              </label>
              <p className="form-help">Get notified when your orders are filled or matched</p>
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span>Dark mode</span>
              </label>
              <p className="form-help">Use dark theme for the interface</p>
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>Auto-refresh orders</span>
              </label>
              <p className="form-help">Automatically refresh order list every 30 seconds</p>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-section-title">Security</h2>
            
            <div className="form-group">
              <label className="form-label">Two-Factor Authentication</label>
              <p className="form-help">Add an extra layer of security to your account</p>
              <button type="button" className="btn-secondary-small">Enable 2FA</button>
            </div>

            <div className="form-group">
              <label className="form-label">Session Timeout</label>
              <select className="form-select" defaultValue="60">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Settings;
