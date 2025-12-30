import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useEVMWallet } from '../context/EVMWalletContext';
import { 
  UNISAT, 
  LEATHER, 
  MAGIC_EDEN, 
  OKX, 
  XVERSE,
  WIZZ,
  PHANTOM,
  OYL
} from '@omnisat/lasereyes-react';

function WalletConnect({ onClose }) {
  const { connect: connectBTC } = useWallet();
  const { connect: connectEVM, connectors } = useEVMWallet();
  const [walletType, setWalletType] = useState('bitcoin');

  const bitcoinWallets = [
    { name: 'Unisat', provider: UNISAT },
    { name: 'Leather', provider: LEATHER },
    { name: 'Magic Eden', provider: MAGIC_EDEN },
    { name: 'OKX', provider: OKX },
    { name: 'Xverse', provider: XVERSE },
    { name: 'Wizz', provider: WIZZ },
    { name: 'Phantom', provider: PHANTOM },
    { name: 'OYL', provider: OYL },
  ];

  const handleBitcoinConnect = async (provider) => {
    try {
      await connectBTC(provider);
      onClose();
    } catch (error) {
      console.error('Failed to connect Bitcoin wallet:', error);
      let errorMessage = 'Failed to connect Bitcoin wallet. ';
      if (error.message?.includes('not found') || error.message?.includes('not installed')) {
        errorMessage += 'Please make sure the wallet extension is installed.';
      } else if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        errorMessage += 'Connection was rejected by user.';
      } else {
        errorMessage += 'Please try again or select a different wallet.';
      }
      alert(errorMessage);
    }
  };

  const handleEVMConnect = async (connector) => {
    try {
      await connectEVM({ connector });
      onClose();
    } catch (error) {
      console.error('Failed to connect EVM wallet:', error);
      let errorMessage = 'Failed to connect EVM wallet. ';
      if (error.message?.includes('not found') || error.message?.includes('not installed')) {
        errorMessage += 'Please make sure the wallet extension is installed.';
      } else if (error.message?.includes('rejected') || error.message?.includes('denied')) {
        errorMessage += 'Connection was rejected by user.';
      } else {
        errorMessage += 'Please try again or select a different wallet.';
      }
      alert(errorMessage);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect Wallet</h2>
          <button 
            className="modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="wallet-type-tabs">
            <button
              className={`wallet-type-tab ${walletType === 'bitcoin' ? 'active' : ''}`}
              onClick={() => setWalletType('bitcoin')}
              type="button"
            >
              Bitcoin Wallet
            </button>
            <button
              className={`wallet-type-tab ${walletType === 'evm' ? 'active' : ''}`}
              onClick={() => setWalletType('evm')}
              type="button"
            >
              EVM Wallet
            </button>
          </div>

          {walletType === 'bitcoin' ? (
            <>
              <p className="wallet-connect-description">
                Connect your Bitcoin wallet to use Liquid Nation
              </p>
              <div className="wallet-list">
                {bitcoinWallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    className="wallet-button"
                    onClick={() => handleBitcoinConnect(wallet.provider)}
                    type="button"
                  >
                    {wallet.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="wallet-connect-description">
                Connect your EVM wallet to fill cross-chain orders
              </p>
              <div className="wallet-list">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    className="wallet-button"
                    onClick={() => handleEVMConnect(connector)}
                    type="button"
                  >
                    {connector.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;
