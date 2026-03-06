import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Proxy API routes to mgo-scanner-backend (port 3002 to avoid atlas-gs on 3000)
      '/api': {
        target: 'http://localhost:3002',
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