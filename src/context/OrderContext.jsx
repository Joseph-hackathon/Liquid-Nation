import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

// Map frontend chain names to backend format
const mapChainToApi = (chain) => {
  if (!chain) return 'bitcoin';
  const normalized = chain.toLowerCase();
  if (normalized === 'btc' || normalized === 'bitcoin') return 'bitcoin';
  if (normalized === 'ada' || normalized === 'cardano') return 'cardano';
  if (normalized === 'eth' || normalized === 'ethereum') return 'ethereum';
  return 'bitcoin';
};

// Convert API order to UI format
const convertApiOrderToUI = (apiOrder) => ({
  orderId: `#${apiOrder.id.slice(0, 6)}`,
  id: apiOrder.id,
  name: api.shortenAddress(apiOrder.maker_address, 5),
  avatar: '🔷',
  avatarColor: '#e8f4f8',
  makerAddress: apiOrder.maker_address,
  asset: `${apiOrder.offer_amount} ${apiOrder.offer_token}`,
  accepts: [apiOrder.want_token],
  chain: apiOrder.source_chain?.toUpperCase() || 'BTC',
  premium: `${apiOrder.want_amount} ${apiOrder.want_token}`,
  status: apiOrder.filled_amount === '0' ? 0 : 
          apiOrder.status === 'filled' ? 100 : 
          parseInt(apiOrder.filled_amount) / parseInt(apiOrder.offer_amount) * 100,
  partial: apiOrder.allow_partial,
  expiryHeight: apiOrder.expiry_height,
  utxoId: apiOrder.utxo_id,
  rawStatus: apiOrder.status,
});

// Convert UI order to API format
const convertUIOrderToApi = (uiOrder) => ({
  makerAddress: uiOrder.btcWallet || uiOrder.evmWallet || uiOrder.makerAddress || '',
  makerPubkey: uiOrder.btcWallet || uiOrder.makerAddress,
  offerToken: uiOrder.asset?.split(' ')[1] || uiOrder.token || 'BTC',
  offerAmount: uiOrder.asset?.split(' ')[0] || uiOrder.amount || '0',
  wantToken: uiOrder.accepts?.[0] || uiOrder.wantToken || 'ETH',
  wantAmount: uiOrder.wantAmount || '100',
  sourceChain: mapChainToApi(uiOrder.chain),
  destChain: mapChainToApi(uiOrder.chain),
  allowPartial: uiOrder.partial !== false,
  expiryBlocks: uiOrder.expiryBlocks || 144,
  fundingUtxo: uiOrder.fundingUtxo || '',
  fundingUtxoValue: uiOrder.fundingUtxoValue || 10000,
  destAddress: uiOrder.destAddress || uiOrder.btcWallet || '',
});

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState(initialOffers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Signing modal state
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [signingData, setSigningData] = useState({
    orderId: null,
    unsignedTxs: [],
    signingInstructions: {},
    spell: {},
  });

  // Load orders from backend on mount
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listOrders();
      
      if (response.orders && response.orders.length > 0) {
        const apiOrders = response.orders.map(convertApiOrderToUI);
        // Merge with local orders (keep local ones that don't exist in API)
        setOrders(prev => {
          const apiIds = new Set(apiOrders.map(o => o.id));
          const localOnly = prev.filter(o => !o.id || !apiIds.has(o.id));
          return [...apiOrders, ...localOnly];
        });
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      // Keep local orders on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /**
   * Create a new order
   * Returns the created order and opens signing modal
   */
  const createOrder = async (orderData) => {
    try {
      setLoading(true);
      setError(null);

      // Convert to API format
      const apiOrderData = convertUIOrderToApi(orderData);

      // Call backend API
      const response = await api.createOrder(apiOrderData);

      console.log('Create order response:', response);
      console.log('unsigned_txs from API:', response.unsigned_txs);

      // Create local order representation
      const maxId = orders.reduce((max, order) => {
        const id = parseInt(order.orderId?.replace('#', ''), 10);
        return !isNaN(id) && id > max ? id : max;
      }, 0);

      // Ensure unsigned_txs is an array
      const unsignedTxs = Array.isArray(response.unsigned_txs) 
        ? response.unsigned_txs 
        : response.unsigned_txs 
          ? [response.unsigned_txs] 
          : [];

      console.log('Processed unsignedTxs:', unsignedTxs);

      const newOrder = {
        ...orderData,
        orderId: `#${maxId + 1}`,
        id: response.order.id,
        status: 0,
        name: api.shortenAddress(orderData.btcWallet || orderData.evmWallet, 5),
        avatar: '🛡️',
        avatarColor: '#ffe7d9',
        rawStatus: 'pending_signature',
        txid: unsignedTxs[0]?.txid || null,
        _apiOrder: response.order,
      };

      // Store pending order
      setPendingOrder(newOrder);

      // Set signing data for the modal
      setSigningData({
        orderId: response.order.id,
        unsignedTxs: unsignedTxs,
        signingInstructions: response.signing_instructions || {},
        spell: response.spell || {},
      });

      // Open signing modal
      setSigningModalOpen(true);

      return { order: newOrder, response };
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle successful signing and broadcast
   */
  const onSigningSuccess = useCallback((result) => {
    if (pendingOrder) {
      // Update order status
      const confirmedOrder = {
        ...pendingOrder,
        rawStatus: 'open',
        txid: result.txid,
      };

      setOrders(prev => [confirmedOrder, ...prev]);
      setPendingOrder(null);
    }
    setSigningModalOpen(false);
  }, [pendingOrder]);

  /**
   * Handle signing error
   */
  const onSigningError = useCallback((err) => {
    setError(err.message);
  }, []);

  /**
   * Close signing modal
   */
  const closeSigningModal = useCallback(() => {
    setSigningModalOpen(false);
    setPendingOrder(null);
    setSigningData({
      orderId: null,
      unsignedTxs: [],
      signingInstructions: {},
      spell: {},
    });
  }, []);

  /**
   * Fill an order
   */
  const fillOrder = async (orderId, fillData) => {
    try {
      setLoading(true);
      setError(null);

      const order = orders.find(o => o.id === orderId || o.orderId === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const response = await api.fillOrder(order.id, {
        takerAddress: fillData.takerAddress,
        takerUtxo: fillData.takerUtxo,
        fillAmount: fillData.fillAmount,
      });

      // Set signing data for fill
      setSigningData({
        orderId: order.id,
        unsignedTxs: response.unsigned_txs || [],
        signingInstructions: response.signing_instructions || {},
        spell: response.spell || {},
      });

      setSigningModalOpen(true);

      return response;
    } catch (err) {
      console.error('Failed to fill order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel/delete an order
   */
  const deleteOrder = async (orderId) => {
    try {
      setLoading(true);
      setError(null);

      const order = orders.find(o => o.id === orderId || o.orderId === orderId);
      
      if (order?.id) {
        // Call backend cancel
        const response = await api.cancelOrder(order.id);
        
        // If there are transactions to sign, open modal
        if (response.unsigned_txs?.length > 0) {
          setSigningData({
            orderId: order.id,
            unsignedTxs: response.unsigned_txs,
            signingInstructions: response.signing_instructions || {},
            spell: response.spell || {},
          });
          setSigningModalOpen(true);
          return;
        }
      }

      // Remove from local state
      setOrders(prev => prev.filter(o => 
        o.orderId !== orderId && o.id !== orderId
      ));
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh orders from backend
   */
  const refreshOrders = () => {
    loadOrders();
  };

  const value = {
    orders,
    loading,
    error,
    createOrder,
    deleteOrder,
    fillOrder,
    refreshOrders,
    
    // Signing modal state
    signingModalOpen,
    signingData,
    closeSigningModal,
    onSigningSuccess,
    onSigningError,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
