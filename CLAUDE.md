# VBT Sports Camp Web App Guidelines

## Build & Development Commands
- **Run dev server (HTTP)**: `env NO_HTTPS=true npm run dev` (bypasses HTTPS basicSsl requirement for browse/test tools)
- **Run dev server (HTTPS)**: `npm run dev`
- **Build production bundle**: `npm run build`
- **Preview local build**: `npm run preview`
- **Deploy Firestore rules (workaround)**:
  1. Temporarily modify `firebase.json` to change `firestore` to a single object:
     `"firestore": { "database": "db-vbt", "rules": "firestore.rules", "indexes": "firestore.indexes.json" }`
  2. Deploy: `firebase deploy --only firestore:rules --project faa-test-guide-v2`
  3. Revert `firebase.json` back to multi-database array configuration.

## Key Directories & Files
- [src/App.jsx](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/src/App.jsx) — Main controller, routing, and preloader setup.
- [src/components/DumbDashboard.jsx](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/src/components/DumbDashboard.jsx) — Live Service Mode user interface for Referees and Leaders.
- [src/components/RoleLogin.jsx](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/src/components/RoleLogin.jsx) — Login portal for walk-in self-registration and check-ins.
- [src/firebase.js](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/src/firebase.js) — Firebase connection (target named database: `db-vbt`), event config check, and NTP synchronization.
- [firestore.rules](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/firestore.rules) — Security rules for all database collections (e.g. `vbt_servants`, `vbt_uid_map`, and subcollections under `vbt_events`).

## Design System Guidelines
- Always read [DESIGN.md](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/DESIGN.md) before making any visual or UI decisions.
- Default theme uses HSL colors, Space Navy background (`#0a1020`), and comfortable unit grid spacing.
- High-contrast pure white/black layout is activated automatically in Outdoor Mode for better readability under sunlight.
