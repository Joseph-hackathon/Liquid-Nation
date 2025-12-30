/* eslint-disable react-refresh/only-export-components */
/* Disabling react-refresh/only-export-components because this file exports both 
   context utilities and provider components, which is a common pattern for context modules */
import { createContext, useContext } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const EVMWalletContext = createContext();

export const useEVMWallet = () => {
  const context = useContext(EVMWalletContext);
  if (!context) {
    throw new Error('useEVMWallet must be used within an EVMWalletProvider');
  }
  return context;
};

export const EVMWalletProvider = ({ children }) => {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const value = {
    address,
    connected: isConnected,
    chain,
    connect,
    disconnect,
    connectors,
  };

  return (
    <EVMWalletContext.Provider value={value}>
      {children}
    </EVMWalletContext.Provider>
  );
};
