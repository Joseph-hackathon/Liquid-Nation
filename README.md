# Liquid Nation

A decentralized P2P cross-chain exchange protocol for seamless asset trading.

## Overview

Liquid Nation is a modern DeFi protocol built with React that enables users to trade digital assets directly with each other across multiple blockchains. Built on blockchain technology, it provides a secure, transparent, and efficient platform for peer-to-peer cross-chain exchanges.

## Features

- **Instant Swaps**: Execute cross-chain trades in seconds with our streamlined exchange protocol
- **Multi-Chain Support**: Trade assets across multiple blockchain networks seamlessly
- **Decentralized**: Non-custodial protocol with full user control over assets
- **Fair Market Prices**: Competitive rates driven by real-time market dynamics
- **Secure Smart Contracts**: Audited by leading security firms for maximum protection
- **Protected Trades**: Escrow mechanism to protect both parties in every transaction

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- WalletConnect Project ID (get from https://cloud.walletconnect.com/)

### Installation

```bash
# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env

# Edit .env and add your WalletConnect Project ID
# VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Development

```bash
# Run the development server
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build

```bash
# Build for production
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
# Preview the production build locally
npm run preview
```

## Project Structure

```
.
├── public/             # Static assets
│   └── favicon.svg     # Site favicon
├── src/
│   ├── components/     # React components
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Features.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── Stats.jsx
│   │   ├── CTA.jsx
│   │   └── Footer.jsx
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## Technology Stack

- **React** 19.2.0 - UI library
- **Vite** 7.2.4 - Build tool and dev server
- **LaserEyes React** 0.0.79 - Bitcoin wallet integration
- **WalletConnect + Wagmi** - EVM wallet integration
- **CSS3** - Styling (with CSS Variables and Grid/Flexbox)
- **SVG Graphics** - Icons and logos

## Wallet Integration

Liquid Nation uses a dual wallet system to support cross-chain trading:

- **Bitcoin Wallet**: Primary authentication using LaserEyes (supports Unisat, Leather, Magic Eden, OKX, Xverse, Wizz, Phantom, OYL)
- **EVM Wallet**: For cross-chain orders using WalletConnect (supports MetaMask, Coinbase Wallet, WalletConnect, and more)

See [WALLETCONNECT_SETUP.md](./WALLETCONNECT_SETUP.md) for detailed setup instructions.

## Features Implemented

- Responsive design for mobile, tablet, and desktop
- Smooth scrolling navigation
- Interactive feature cards
- Modern gradient design system
- Mobile-friendly navigation menu with toggle
- Component-based architecture
- Dual wallet system (Bitcoin + EVM)
- Cross-chain order management

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2024 Liquid Nation. All rights reserved.
