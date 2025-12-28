const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/logo.svg" alt="Liquid Nation" className="logo-image" />
              <span>Liquid Nation</span>
            </div>
            <p className="footer-description">
              The premier decentralized protocol for collateralized lending and borrowing.
            </p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#stats">Statistics</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="#docs">Documentation</a></li>
              <li><a href="#api">API</a></li>
              <li><a href="#github">GitHub</a></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <ul>
              <li><a href="#twitter">Twitter</a></li>
              <li><a href="#discord">Discord</a></li>
              <li><a href="#telegram">Telegram</a></li>
              <li><a href="#forum">Forum</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Liquid Nation. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
