import { useWallet } from '../context/WalletContext';
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
  const { connect } = useWallet();

  const wallets = [
    { name: 'Unisat', provider: UNISAT },
    { name: 'Leather', provider: LEATHER },
    { name: 'Magic Eden', provider: MAGIC_EDEN },
    { name: 'OKX', provider: OKX },
    { name: 'Xverse', provider: XVERSE },
    { name: 'Wizz', provider: WIZZ },
    { name: 'Phantom', provider: PHANTOM },
    { name: 'OYL', provider: OYL },
  ];

  const handleConnect = async (provider) => {
    try {
      await connect(provider);
      onClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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
          <p className="wallet-connect-description">
            Connect your Bitcoin wallet to use Liquid Nation
          </p>
          <div className="wallet-list">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                className="wallet-button"
                onClick={() => handleConnect(wallet.provider)}
                type="button"
              >
                {wallet.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;
