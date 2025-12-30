import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ensure proper module resolution
    },
  },
  optimizeDeps: {
    include: [
      'wagmi',
      'viem',
      '@tanstack/react-query',
      '@omnisat/lasereyes-react',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
