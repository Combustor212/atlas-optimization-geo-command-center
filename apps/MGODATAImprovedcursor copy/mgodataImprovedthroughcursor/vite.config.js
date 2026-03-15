import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Proxy /api to Geo Command Center (port 3000) - scan + leads work without MGO backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy admin console to backend
      '/admin': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      // Proxy API docs to backend
      '/docs': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      // Proxy OpenAPI JSON to backend
      '/openapi.json': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}) 