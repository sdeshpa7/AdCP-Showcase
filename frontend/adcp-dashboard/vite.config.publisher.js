import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'publisher',
  server: {
    port: 5174,
    proxy: {
      '/api/flipkart': {
        target: 'http://localhost:8001/mcp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/flipkart/, '')
      },
      '/api/amazon': {
        target: 'http://localhost:8002/mcp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/amazon/, '')
      },
      '/api/jio': {
        target: 'http://localhost:8003/mcp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jio/, '')
      },
      '/api/hul': {
        target: 'http://localhost:8004/mcp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hul/, '')
      },
      '/api/hdfc': {
        target: 'http://localhost:8005/mcp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hdfc/, '')
      }
    }
  },
  resolve: {
    alias: {
      '/src': resolve(__dirname, './src')
    }
  }
})
