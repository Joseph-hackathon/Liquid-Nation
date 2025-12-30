import { http, createConfig } from 'wagmi';
import { mainnet, base, arbitrum, polygon, celo } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';

// WalletConnect Project ID from environment variable
// Get your project ID from https://cloud.walletconnect.com/
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';

if (projectId === 'YOUR_WALLETCONNECT_PROJECT_ID') {
  const message = 
    'WalletConnect Project ID not configured. Please set VITE_WALLETCONNECT_PROJECT_ID environment variable. ' +
    'Get your project ID from https://cloud.walletconnect.com/';
  
  if (import.meta.env.PROD) {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}

export const config = createConfig({
  chains: [mainnet, base, arbitrum, polygon, celo],
  connectors: [
    walletConnect({ projectId }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: 'Liquid Nation',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [celo.id]: http(),
  },
});
