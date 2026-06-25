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
        // Cache all app assets including audio files for offline use
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp3,wav,webm,ogg}'],
        maximumFileSizeToCacheInBytes: 15000000, // 15MB — covers all sound files
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
        ],
      },
      manifest: false // Use existing public/manifest.json
    })
  ],
})
