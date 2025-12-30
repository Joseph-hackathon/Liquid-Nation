import { createContext, useContext, useState, useEffect } from 'react';
import { offers as initialOffers } from '../data/offers';
import * as api from '../services/api';

const OrderContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

// Convert API order to UI order format
const convertApiOrderToUI = (apiOrder) => {
  // Shorten address for display
  const displayName = apiOrder.maker_address 
    ? `${apiOrder.maker_address.slice(0, 6)}...${apiOrder.maker_address.slice(-4)}`
    : 'Unknown Wallet';
  
  // Calculate status percentage
  const filledAmount = parseFloat(apiOrder.filled_amount || '0');
  const offerAmount = parseFloat(apiOrder.offer_amount || '1');
  const statusPercent = offerAmount > 0 ? Math.round((filledAmount / offerAmount) * 100) : 0;
  
  return {
    orderId: apiOrder.id,
    name: displayName,
    avatar: '🛡️',
    avatarColor: '#ffe7d9',
    asset: `${apiOrder.offer_amount} ${apiOrder.offer_token}`,
    chain: apiOrder.source_chain === 'bitcoin' ? 'BTC' : apiOrder.source_chain.toUpperCase(),
    accepts: [apiOrder.want_token],
    partial: apiOrder.allow_partial,
    status: statusPercent,
    premium: '0%', // TODO: Calculate from order data
    btcWallet: apiOrder.maker_address,
    evmWallet: apiOrder.maker_address, // TODO: Handle cross-chain properly
    // API fields
    _apiOrder: apiOrder,
  };
};

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState(initialOffers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load orders from API on mount
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listOrders();
      
      if (response && response.orders) {
        const uiOrders = response.orders.map(convertApiOrderToUI);
        setOrders(uiOrders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError(err.message);
      // Keep initial offers as fallback
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);

      // Map UI order data to API format
      const apiOrderData = {
        makerAddress: orderData.btcWallet || orderData.evmWallet,
        offerToken: orderData.asset?.split(' ')[1] || 'BTC',
        offerAmount: orderData.asset?.split(' ')[0] || '0',
        wantToken: orderData.accepts?.[0] || 'ETH',
        wantAmount: '100', // TODO: Calculate from premium
        sourceChain: orderData.chain === 'BTC' ? 'bitcoin' : orderData.chain.toLowerCase(),
        destChain: orderData.chain === 'BTC' ? 'bitcoin' : orderData.chain.toLowerCase(),
        allowPartial: orderData.partial !== false,
        expiryBlocks: 144, // ~1 day on Bitcoin
        fundingUtxo: '', // TODO: Get from wallet
      };

      const response = await api.createOrder(apiOrderData);
      
      if (response && response.order) {
        const newOrder = convertApiOrderToUI(response.order);
        setOrders(prevOrders => [newOrder, ...prevOrders]);
        return newOrder;
      }
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.cancelOrder(orderId);
      
      setOrders(prevOrders => prevOrders.filter(order => order.orderId !== orderId));
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelAllOrders = async (userName) => {
    try {
      setLoading(true);
      setError(null);
      
      // Cancel all user orders
      const userOrders = orders.filter(order => order.name === userName);
      await Promise.all(userOrders.map(order => api.cancelOrder(order.orderId)));
      
      setOrders(prevOrders => prevOrders.filter(order => order.name !== userName));
    } catch (err) {
      console.error('Failed to cancel all orders:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fillOrder = async (orderId, fillData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.fillOrder(orderId, fillData);
      
      if (response && response.order) {
        const updatedOrder = convertApiOrderToUI(response.order);
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.orderId === orderId ? updatedOrder : order
          )
        );
        return updatedOrder;
      }
    } catch (err) {
      console.error('Failed to fill order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    orders,
    loading,
    error,
    createOrder,
    deleteOrder,
    cancelAllOrders,
    fillOrder,
    loadOrders,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
