# VBT Sports Camp Web App

Welcome to the **VBT Sports Camp Web App**! This is a mobile-first web interface designed to coordinate real-time youth sports and Bible reflection stations. 

The application runs as a hybrid web wrapper (packaged via Capacitor for iOS deployment) to support chaperones and referees working on the field.

---

## ⚡ Key Features

### 🔒 Access Control & Dynamic Routing
- Volunteers, Game Leaders, and Team Leaders are locked to **Live Service Mode** (the minimal "Dumb Dashboard").
- Coordinators and admins have access to full detailed analytics, scoring overrides, and roster configurations.
- Switch assignments dynamically through verification prompts.

### 🔄 Walk-In Registration & frictionless Login
- New leads can self-register instantly with just their first name and phone number.
- Returning users check in with automatic mapping between Firebase Auth anonymous UIDs and servant phone numbers.

### 🔊 Background VoIP Walkie-Talkie
- Fully integrated with Agora RTC for low-latency voice communications.
- Dynamically namespaced channels: `walkie_talkie_{eventCode}_{activeChannel}`.
- Silent background token refresh every 30 minutes to prevent VoIP dropouts.

### ☀️ High-Contrast Outdoor Mode
- Highly legible pure white background with thick black borders, optimized for bright sunlight glare on the field.

### ⏰ NTP Clock Synchronization & Countdown Timer
- Synchronizes local client clocks against NTP servers to guarantee that time-block timers are identical across all devices.

---

## 🚀 Getting Started

### 1. Run Locally
To run the project in local development mode:
```bash
# Start Vite development server (HTTPS enabled by default)
npm run dev

# Start dev server with HTTP (required for playwright/automation testing tools)
env NO_HTTPS=true npm run dev
```

### 2. Build the Application
```bash
npm run build
```

---

## 📂 Documentation Links
- **[Design System Guidelines (DESIGN.md)](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/DESIGN.md)** — Core design tokens, layout scaling, typography, and color palettes.
- **[iOS Deployment Guide (IOS_DEPLOYMENT_GUIDE.md)](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/IOS_DEPLOYMENT_GUIDE.md)** — Steps to build, package, and upload builds to TestFlight/App Store via Ionic Appflow.
- **[Development Memory (VBTCAMP2026_MEMORY.md)](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/VBTCAMP2026_MEMORY.md)** — Session notes, database configurations, and outstanding items.
- **[Tasks & Roadmap (TODOS.md)](file:///c:/Users/Mi5a/Documents/VBT%20SPORTS%20CAMP%20WEB%20APP/TODOS.md)** — Future enhancements and backlog.
