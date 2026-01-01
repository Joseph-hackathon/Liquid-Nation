/**
 * SigningModal Component
 * 
 * Handles the transaction signing flow for order creation, filling, and cancellation.
 * Displays unsigned transactions and guides users through the signing process.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLaserEyes } from '@omnisat/lasereyes-react';
import { broadcastOrder } from '../services/api';
import './SigningModal.css';

const SigningModal = ({ 
  isOpen, 
  onClose, 
  orderId,
  unsignedTxs = [],
  signingInstructions = {},
  spell = {},
  onSuccess,
  onError,
}) => {
  const [step, setStep] = useState(1);
  const [signedTxHex, setSignedTxHex] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txResult, setTxResult] = useState(null);
  
  const { connected, signPsbt, address } = useLaserEyes();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSignedTxHex('');
      setError(null);
      setTxResult(null);
    }
  }, [isOpen]);

  // Sign the transaction with wallet
  const handleSign = useCallback(async () => {
    if (!connected) {
      setError('Please connect your Bitcoin wallet first');
      return;
    }

    if (unsignedTxs.length === 0) {
      setError('No transaction to sign');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const unsignedTx = unsignedTxs[0];
      
      // Try to sign with wallet
      // Different wallets have different signing methods
      if (signPsbt) {
        // LaserEyes PSBT signing
        const signedPsbt = await signPsbt(unsignedTx.hex, {
          finalize: true,
          broadcast: false,
        });
        setSignedTxHex(signedPsbt);
        setStep(2);
      } else {
        // Fallback - ask user to sign manually
        setStep(2);
        setError('Automatic signing not available. Please sign manually.');
      }
    } catch (err) {
      console.error('Signing error:', err);
      setError(`Failed to sign transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [connected, signPsbt, unsignedTxs]);

  // Broadcast the signed transaction
  const handleBroadcast = useCallback(async () => {
    if (!signedTxHex) {
      setError('No signed transaction to broadcast');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await broadcastOrder(orderId, signedTxHex);
      
      if (result.status === 'confirmed' || result.status === 'success') {
        setTxResult(result);
        setStep(3);
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        throw new Error(result.message || 'Broadcast failed');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      setError(`Failed to broadcast: ${err.message}`);
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [signedTxHex, orderId, onSuccess, onError]);

  // Handle manual transaction input
  const handleManualInput = (e) => {
    setSignedTxHex(e.target.value);
    if (e.target.value) {
      setStep(2);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="signing-modal-overlay" onClick={onClose}>
      <div className="signing-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>🔐 Sign Transaction</h2>
          <p className="modal-subtitle">
            {signingInstructions.message || 'Complete the transaction signing process'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="signing-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <span>Review</span>
          </div>
          <div className="step-connector" />
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <span>Sign</span>
          </div>
          <div className="step-connector" />
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Broadcast</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Step 1: Review Transaction */}
        {step === 1 && (
          <div className="step-content">
            <h3>📋 Transaction Details</h3>
            
            {unsignedTxs.length > 0 ? (
              <div className="tx-details">
                <div className="tx-info-row">
                  <span className="label">Transaction ID:</span>
                  <span className="value mono">{unsignedTxs[0]?.txid}</span>
                </div>
                <div className="tx-info-row">
                  <span className="label">Inputs to sign:</span>
                  <span className="value">{unsignedTxs[0]?.inputs_to_sign?.length || 1}</span>
                </div>
                
                <details className="tx-hex-details">
                  <summary>View Transaction Hex</summary>
                  <pre className="tx-hex">{unsignedTxs[0]?.hex}</pre>
                </details>
              </div>
            ) : (
              <p className="no-tx">No transaction data available</p>
            )}

            {/* Instructions */}
            {signingInstructions.steps?.length > 0 && (
              <div className="instructions">
                <h4>Instructions:</h4>
                <ol>
                  {signingInstructions.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="modal-actions">
              {connected ? (
                <button 
                  className="btn-primary"
                  onClick={handleSign}
                  disabled={isLoading || unsignedTxs.length === 0}
                >
                  {isLoading ? '⏳ Signing...' : '✍️ Sign with Wallet'}
                </button>
              ) : (
                <div className="wallet-not-connected">
                  <p>Please connect your Bitcoin wallet to sign</p>
                  <button className="btn-secondary" onClick={onClose}>
                    Connect Wallet
                  </button>
                </div>
              )}
            </div>

            {/* Manual signing option */}
            <details className="manual-sign">
              <summary>Sign manually (advanced)</summary>
              <div className="manual-sign-content">
                <p>Copy the transaction hex above, sign it with your wallet, and paste the signed transaction below:</p>
                <textarea
                  placeholder="Paste signed transaction hex here..."
                  value={signedTxHex}
                  onChange={handleManualInput}
                  rows={4}
                />
              </div>
            </details>
          </div>
        )}

        {/* Step 2: Confirm and Broadcast */}
        {step === 2 && (
          <div className="step-content">
            <h3>✅ Transaction Signed</h3>
            
            <div className="signed-status">
              <div className="success-icon">✓</div>
              <p>Your transaction has been signed successfully!</p>
            </div>

            <div className="tx-details">
              <div className="tx-info-row">
                <span className="label">Signed Transaction:</span>
                <span className="value truncated mono">{signedTxHex.slice(0, 32)}...</span>
              </div>
            </div>

            <div className="broadcast-warning">
              <span>⚡</span>
              <p>Broadcasting will lock your tokens in the escrow contract. This action cannot be undone.</p>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button 
                className="btn-primary"
                onClick={handleBroadcast}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Broadcasting...' : '📡 Broadcast Transaction'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && txResult && (
          <div className="step-content">
            <h3>🎉 Transaction Confirmed!</h3>
            
            <div className="success-status">
              <div className="success-icon large">✓</div>
              <p>Your tokens are now locked in escrow</p>
            </div>

            <div className="tx-details">
              <div className="tx-info-row">
                <span className="label">Transaction ID:</span>
                <a 
                  href={`https://mempool.space/testnet4/tx/${txResult.txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="value link mono"
                >
                  {txResult.txid}
                </a>
              </div>
              <div className="tx-info-row">
                <span className="label">Status:</span>
                <span className="value status-confirmed">{txResult.status}</span>
              </div>
            </div>

            <p className="success-message">{txResult.message}</p>

            <div className="modal-actions">
              <button className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SigningModal;

