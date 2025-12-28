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
    
    const newOrder = {
      ...orderData,
      orderId: `#${maxId + 1}`,
      status: 0, // New orders start at 0% filled
      name: '0xAB5....39c81', // Placeholder for current user
      avatar: '🛡️',
      avatarColor: '#ffe7d9',
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    return newOrder;
  };

  const deleteOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.filter(order => order.orderId !== orderId));
  };

  const value = {
    orders,
    createOrder,
    deleteOrder,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
