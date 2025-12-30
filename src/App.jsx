import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Stats from './components/Stats';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Offers from './components/Offers';
import CreateOrder from './components/CreateOrder';
import Settings from './components/Settings';
import Swap from './components/Swap';
import ThemeToggle from './components/ThemeToggle';
import WalletConnect from './components/WalletConnect';
import { chainThemes } from './data';
import { OrderProvider } from './context/OrderContext';
import { useWallet } from './context/WalletContext';

function MainApp({ onBackToLanding }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { address, connected } = useWallet();

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard chainThemes={chainThemes} onNavigate={handleNavigate} />;
      case 'offers':
        return <Offers chainThemes={chainThemes} onNavigate={handleNavigate} />;
      case 'create':
        return <CreateOrder chainThemes={chainThemes} onNavigate={handleNavigate} />;
      case 'swap':
        return <Swap chainThemes={chainThemes} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard chainThemes={chainThemes} onNavigate={handleNavigate} />;
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return 'Connect Wallet';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <button 
          className="logo-mark" 
          aria-label="Back to home"
          onClick={onBackToLanding}
          type="button"
        >
          <img src="/logo.svg" alt="Liquid Nation" className="logo-image" />
        </button>
        <div className="top-bar-actions">
          <ThemeToggle className="top-bar-theme-toggle" />
          <button 
            className="wallet-pill" 
            onClick={() => !connected && setShowWalletModal(true)}
            type="button"
          >
            {connected ? formatAddress(address) : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {showWalletModal && (
        <WalletConnect onClose={() => setShowWalletModal(false)} />
      )}

      <main className="main-stage">
        {renderPage()}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        <button 
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavigate('dashboard')}
          type="button"
        >
          Dashboard
        </button>
        <button 
          className={`nav-item ${currentPage === 'offers' ? 'active' : ''}`}
          onClick={() => handleNavigate('offers')}
          type="button"
        >
          Offers
        </button>
        <button 
          className={`nav-item ${currentPage === 'swap' ? 'active' : ''}`}
          onClick={() => handleNavigate('swap')}
          type="button"
        >
          Swap
        </button>
        <button 
          className={`nav-item ${currentPage === 'create' ? 'active' : ''}`}
          onClick={() => handleNavigate('create')}
          type="button"
        >
          Create
        </button>
        <button 
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavigate('settings')}
          type="button"
        >
          Settings
        </button>
      </nav>
    </div>
  );
}

function LandingPage({ onLaunchApp }) {
  return (
    <div className="landing-page">
      <Navbar onLaunchApp={onLaunchApp} />
      <Hero onLaunchApp={onLaunchApp} />
      <Features />
      <HowItWorks />
      <Stats />
      <CTA onLaunchApp={onLaunchApp} />
      <Footer />
    </div>
  );
}

function App() {
  const [showApp, setShowApp] = useState(false);

  const handleLaunchApp = () => {
    setShowApp(true);
  };

  const handleBackToLanding = () => {
    setShowApp(false);
  };

  if (showApp) {
    return (
      <OrderProvider>
        <MainApp onBackToLanding={handleBackToLanding} />
      </OrderProvider>
    );
  }

  return <LandingPage onLaunchApp={handleLaunchApp} />;
}

export default App;
