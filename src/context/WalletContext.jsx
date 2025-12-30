/* eslint-disable react-refresh/only-export-components */
/* Disabling react-refresh/only-export-components because this file exports both 
   context utilities and provider components, which is a common pattern for context modules */
import { createContext, useContext } from 'react';
import { LaserEyesProvider, useLaserEyes, MAINNET } from '@omnisat/lasereyes-react';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Inner provider that uses the LaserEyes hooks
const WalletContextProvider = ({ children }) => {
  const laserEyes = useLaserEyes();
  
  return (
    <WalletContext.Provider value={laserEyes}>
      {children}
    </WalletContext.Provider>
  );
};

// Outer provider that wraps with LaserEyesProvider
export const WalletProvider = ({ children }) => {
  return (
    <LaserEyesProvider config={{ network: MAINNET }}>
      <WalletContextProvider>
        {children}
      </WalletContextProvider>
    </LaserEyesProvider>
  );
};
