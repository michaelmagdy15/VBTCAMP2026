import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Force immediate takeover
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });

  // Force page reload once the new service worker activates (only if there was an active controller before)
  const hasController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasController && !refreshing) {
      refreshing = true;
      console.log('[PWA] New service worker activated, reloading page...');
      window.location.reload();
    }
  });
}

// Disable pinch zoom on iOS Safari
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Disable double-tap zoom on iOS Safari
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = new Date().getTime();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

