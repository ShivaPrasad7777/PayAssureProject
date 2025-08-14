import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'node:dns'

dns.setDefaultResultOrder('verbatim')

export default defineConfig({
  server: {
    host: '0.0.0.0' // or host: true
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',  // Optional: for easier imports like import Login from '@/components/Login'
    },
  },
});
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
// vite.config.js