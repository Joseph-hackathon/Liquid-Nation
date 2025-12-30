# WalletConnect SDK Setup

This document describes the dual wallet system implemented in Liquid Nation.

## Overview

Liquid Nation uses a dual wallet system:
- **Bitcoin Wallet**: For primary user authentication and Bitcoin transactions
- **EVM Wallet**: For cross-chain order fills on EVM-compatible chains

## Architecture

### Bitcoin Wallet (LaserEyes)
- Provider: `@omnisat/lasereyes-react`
- Supported wallets: Unisat, Leather, Magic Eden, OKX, Xverse, Wizz, Phantom, OYL
- Context: `WalletContext.jsx`

### EVM Wallet (WalletConnect + Wagmi)
- Provider: `@web3modal/wagmi`, `wagmi`, `viem`
- Supported chains: Ethereum, Base, Arbitrum, Polygon (MATIC), Celo
- Connectors: WalletConnect, Injected (MetaMask, etc.), Coinbase Wallet
- Context: `EVMWalletContext.jsx`
- Configuration: `config/wagmi.js`

## Configuration

### WalletConnect Project ID

You need to obtain a WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/):

1. Create an account at https://cloud.walletconnect.com/
2. Create a new project
3. Copy your Project ID
4. Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

5. Add your Project ID to the `.env` file:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_actual_project_id_here
```

**Note**: The `.env` file is gitignored and should never be committed to version control.

## User Flow

1. **Initial Connection**: Users connect their Bitcoin wallet first to access the platform
2. **Cross-Chain Orders**: When users want to fill cross-chain orders, they can connect their EVM wallet
3. **Dual Display**: Both wallets are displayed in the top bar when connected
4. **Additional Connections**: Users can click the "+" button to connect additional wallets

## UI Components

### WalletConnect Modal
- Tabs to switch between Bitcoin and EVM wallet options
- Lists available wallets for each type
- Handles connection errors gracefully

### Top Bar
- Shows Bitcoin wallet address with "BTC:" label
- Shows EVM wallet address with "EVM:" label
- "+" button to connect additional wallets
- "Connect Wallet" button when no wallets are connected

## Integration

The dual wallet system is integrated at the application root level in `main.jsx`:

```jsx
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <EVMWalletProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </EVMWalletProvider>
  </QueryClientProvider>
</WagmiProvider>
```

## Supported Chains

- **Ethereum (ETH)** - Chain ID: 1
- **Base** - Chain ID: 8453
- **Arbitrum (ARB)** - Chain ID: 42161
- **Polygon (MATIC)** - Chain ID: 137
- **Celo** - Chain ID: 42220

## Future Enhancements

- Add Solana wallet support
- Implement wallet-specific features for order matching
- Add chain switching UI
- Implement wallet disconnection
