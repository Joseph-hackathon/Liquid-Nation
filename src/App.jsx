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
import FillOrder from './components/FillOrder';
import Settings from './components/Settings';
import Swap from './components/Swap';
import ThemeToggle from './components/ThemeToggle';
import WalletConnect from './components/WalletConnect';
import SigningModal from './components/SigningModal';
import { chainThemes } from './data';
import { OrderProvider, useOrders } from './context/OrderContext';
import { useWallet } from './context/WalletContext';
import { useEVMWallet } from './context/EVMWalletContext';

function MainApp({ onBackToLanding }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [fillOrderId, setFillOrderId] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { address: btcAddress, connected: btcConnected } = useWallet();
  const { address: evmAddress, connected: evmConnected } = useEVMWallet();
  const { 
    signingModalOpen, 
    signingData, 
    closeSigningModal, 
    onSigningSuccess, 
    onSigningError 
  } = useOrders();

  const handleNavigate = (page, orderId = null) => {
    if (page === 'fill' && orderId) {
      setFillOrderId(orderId);
    }
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
      case 'fill':
        return <FillOrder orderId={fillOrderId} chainThemes={chainThemes} onNavigate={handleNavigate} />;
      case 'swap':
        return <Swap chainThemes={chainThemes} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard chainThemes={chainThemes} onNavigate={handleNavigate} />;
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
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
          <div className="wallet-group">
            {btcConnected && (
              <div className="wallet-pill connected" title="Bitcoin Wallet">
                <span className="wallet-label">BTC:</span> {formatAddress(btcAddress)}
              </div>
            )}
            {evmConnected && (
              <div className="wallet-pill connected" title="EVM Wallet">
                <span className="wallet-label">EVM:</span> {formatAddress(evmAddress)}
              </div>
            )}
            {!btcConnected && !evmConnected && (
              <button 
                className="wallet-pill" 
                onClick={() => setShowWalletModal(true)}
                type="button"
              >
                Connect Wallet
              </button>
            )}
            {(btcConnected || evmConnected) && (
              <button 
                className="wallet-pill secondary" 
                onClick={() => setShowWalletModal(true)}
                type="button"
              >
                +
              </button>
            )}
          </div>
        </div>
      </header>

      {showWalletModal && (
        <WalletConnect onClose={() => setShowWalletModal(false)} />
      )}

      {/* Transaction Signing Modal */}
      <SigningModal
        isOpen={signingModalOpen}
        onClose={closeSigningModal}
        orderId={signingData.orderId}
        unsignedTxs={signingData.unsignedTxs}
        signingInstructions={signingData.signingInstructions}
        spell={signingData.spell}
        onSuccess={onSigningSuccess}
        onError={onSigningError}
      />

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
