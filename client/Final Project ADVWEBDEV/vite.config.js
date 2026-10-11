import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import process from 'node:process'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': { target: process.env.API_TARGET || 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})
