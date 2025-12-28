import { useState } from 'react';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLinkClick = (e) => {
    e.preventDefault();
    const target = document.querySelector(e.target.getAttribute('href'));
    if (target) {
      const offsetTop = target.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <div className="logo">
          <img src="/logo.svg" alt="Liquidnation" className="logo-image" />
          <span className="logo-text">Liquidnation</span>
        </div>
        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <a href="#features" onClick={handleLinkClick}>Features</a>
          <a href="#how-it-works" onClick={handleLinkClick}>How It Works</a>
          <a href="#stats" onClick={handleLinkClick}>Stats</a>
          <a href="#docs" onClick={handleLinkClick}>Docs</a>
          <button className="btn-primary">Launch App</button>
        </div>
        <div 
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
