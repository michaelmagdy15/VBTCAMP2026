import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);

        // NOTE: We intentionally do NOT send SKIP_WAITING here.
        // Sending it mid-session causes a controllerchange event which triggers a page reload,
        // breaking whatever the user is currently doing (e.g. joining a service, submitting a score).
        // The new SW will take over naturally when the user closes and reopens the tab.
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });

  // Reload once if the SW controller changes (i.e. an intentional admin-triggered clear or first SW activation).
  // The refreshing flag ensures we only reload once per session, not in a loop.
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

