import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@monaco-editor/react', 'monaco-editor'],
          charts: ['echarts', 'echarts-for-react'],
          diagrams: ['mermaid', '@terrastruct/d2'],
          pivot: ['react-pivottable', 'papaparse'],
          crypto: ['crypto-js'],
          icons: ['lucide-react', 'react-icons'],
          utils: ['date-fns', 'json5', 'jsqr', 'qrcode.react'],
          analytics: ['react-ga4', 'react-helmet-async']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
