# VBT Camp 2026 - Development Session Memory File
**Last Updated:** July 5th, 2026, 2:45 AM (Local Time)

This memory file encapsulates the context, configurations, completed tasks, and architectural details implemented during the recent development sessions over the past 15 hours.

---

## 1. Key Features & Work Accomplished

### 🔒 Schedule View Locking & Access Control
- **Forced View Lock:** Team leaders and Game leaders (referees) are now strictly gated to their own team/station schedule data by default.
- **Confirmation Protection:** Added a `"Check Other Teams"` button. Clicking this triggers a native confirmation dialog (`window.confirm`) to prevent accidental reveals. Once confirmed, full schedule filters and all matchups become visible.
- **Lock-back Option:** Added a `"Show My Schedule Only"` button to easily lock the view back to their assigned team or station.
- **Roster & Controls Visibility:** Coordinator tools and sensitive schedule modification controls are hidden from non-admin users.

### 🔄 Role & Assignment Switcher
- Added a **Switch Assignment** dropdown and button inside the **Assignment Hero Card** for leaders and referees.
- Team leaders can switch their active team (e.g., Red 1, White 2), and Game leaders can switch their active station (e.g., Station 1 to Station 6) dynamically.
- Triggers a warning warning confirmation dialog before applying: `Warning: You are about to switch from X to Y. Are you sure?`
- Updates the local state, resets filters, and persists the new selection to `localStorage` under the key ``vbt_user_${currentEventCode}``.

### 🎯 Dynamic Schedule Filters & Mode-Awareness
- **Dynamic Chips:** The "All", "Today", "Tomorrow", "This Week" filter chips are now dynamically hidden on 1-day events (when `daysCount <= 1` or `eventType === 'service'`).
- **Dynamic Day Selector:** The Day 1/2 selector is hidden when `daysCount <= 1`.
- **Roster Badges:** Improved Roster details rendering to format team/station names cleanly and dynamically.

### 📱 Viewport, Layout & Scroll Optimization
- **Address Bar Scroll Fix:** Switched the main wrapper container's height constraint from `minHeight: '100vh'` to `minHeight: '100dvh'` (dynamic viewport height) in `App.jsx`. This stops mobile browser address bars/toolbars from adding extra phantom scroll height.
- **Scroll Containment:** Added `flex: 1` to `.content-area` in `index.css`. If content is very short (e.g., Roster filtered to a few entries), the content area fills the viewport, preventing the user from scrolling down into a black empty void.

### ⏰ Live Countdown Banner
- Integrated the `ServiceCountdown` component at the top of the schedule page.
- Shows a live countdown to the service start time, active shift progress (e.g., Shift 1/6), and live countdown to the service end once started.

### 🔑 Authentication & Servant Configuration
- Added **Michel Ghobrial** as the Service Day Leader with passcode `vbtadmin` (role: `service_day_leader`, teamCode: `SERVICE`).
- Configured Firestore connectivity for named database `db-vbt` under registry key `july6`.

---

## 2. Technical Context & Database Architecture
- **Named Database:** Firebase Firestore uses a named instance `db-vbt` (not the `(default)` instance).
- **Event Registry:** All event configuration (stations, matchups, team names, servant assignments) is stored in the `vbt_event_registry` collection.
- **Vite Build:** Build warning size limits are expected and non-blocking. Build outputs are validated and PWA generation completes successfully (`dist/sw.js`).

---

## 3. Outstanding / Future Tasks
- Monitor live sync stability during peak usage.
- Expand test coverage for real-time Firestore database listener fallbacks on weak cellular networks.
