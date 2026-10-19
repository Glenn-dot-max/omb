import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // L'application Vue est servie sous /app/ (l'ancien frontend garde le reste du site)
  base: '/app/',
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Autorise l'import du CSS de l'ancien frontend (../frontend/css), partagé pendant la migration
    fs: { allow: ['..'] },
    // En local, tout ce qui n'est pas /app/ est l'ancien frontend (python3 -m http.server 8080) :
    // une seule adresse (localhost:5173) => même localStorage => la connexion est partagée, comme en production
    proxy: {
      '^/(?!app)': 'http://localhost:8080',
    },
  },
})
