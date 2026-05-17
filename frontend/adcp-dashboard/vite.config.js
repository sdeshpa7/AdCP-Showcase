import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
  }
})
