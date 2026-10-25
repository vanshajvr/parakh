/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable on phones and desktops without an app store (decision D-018).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Parakh: practise investing, honestly',
        short_name: 'Parakh',
        description: 'Practise investing on real past markets with fake money, and follow stock signals that show their track record.',
        lang: 'en-IN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F5F6F7',
        theme_color: '#1F2328',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Always try for fresh calls; offline, show the last ones we saw.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.endsWith('.csv'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 60, maxAgeSeconds: 3 * 24 * 60 * 60 },
            },
          },
          {
            // The time machine's prices (D-044): instant from the cache, refreshed in the background.
            urlPattern: ({ url }) => url.pathname === '/sim-prices.json',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'sim-prices', expiration: { maxEntries: 1 } },
          },
        ],
      },
    }),
  ],
  server: {
    // In development the API runs on :8000 (uvicorn); proxying avoids CORS.
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
