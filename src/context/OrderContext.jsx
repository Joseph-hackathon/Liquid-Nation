import { createContext, useContext, useState } from 'react';
import { offers as initialOffers } from '../data/offers';

const OrderContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState(initialOffers);

  const createOrder = (orderData) => {
    // Generate a unique order ID
    const maxId = orders.reduce((max, order) => {
      const id = parseInt(order.orderId.replace('#', ''), 10);
      return !isNaN(id) && id > max ? id : max;
    }, 0);
    
    // Use wallet address as the display name (shortened version)
    // Prefer BTC wallet, fallback to EVM wallet, then to unknown
    let displayName = 'Unknown Wallet';
    if (orderData.btcWallet) {
      displayName = `${orderData.btcWallet.slice(0, 6)}...${orderData.btcWallet.slice(-4)}`;
    } else if (orderData.evmWallet) {
      displayName = `${orderData.evmWallet.slice(0, 6)}...${orderData.evmWallet.slice(-4)}`;
    }
    
    const newOrder = {
      ...orderData,
      orderId: `#${maxId + 1}`,
      status: 0, // New orders start at 0% filled
      name: displayName,
      avatar: '🛡️',
      avatarColor: '#ffe7d9',
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    return newOrder;
  };

  const deleteOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.filter(order => order.orderId !== orderId));
  };

  const cancelAllOrders = (userName) => {
    setOrders(prevOrders => prevOrders.filter(order => order.name !== userName));
  };

  const value = {
    orders,
    createOrder,
    deleteOrder,
    cancelAllOrders,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
