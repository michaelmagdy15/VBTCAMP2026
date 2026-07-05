import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    nodePolyfills(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        importScripts: ['sw-push.js'], // ← injects our push/notificationclick handlers
        // Cache all app assets including audio files for offline use
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp3,wav,webm,ogg,woff,woff2,bin}'],
        maximumFileSizeToCacheInBytes: 100000000, // 100MB — covers all sound files and offline assets
        // Range request support for audio scrubbing on iOS
        runtimeCaching: [
          {
            urlPattern: /\/sounds\/.+\.(mp3|wav|webm|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vbt-audio-cache',
              rangeRequests: true, // Required for iOS audio seeking
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.+/i,
            handler: 'NetworkFirst', // Walkie-talkie voice messages — always fresh
            options: { cacheName: 'vbt-voice-cache', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https:\/\/[a-d]\.basemaps\.cartocdn\.com\/rastertiles\/.+/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cartodb-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\/.+/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'arcgis-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: false // Use existing public/manifest.json
    })
  ],
})
