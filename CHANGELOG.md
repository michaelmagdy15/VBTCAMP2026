# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-07-09

### Added
- **Frictionless Login & Self-Registration**: Walk-in servants can now register instantly using only their name and phone number.
- **Utility Sport Design System**: Introduced [DESIGN.md](DESIGN.md) and [CLAUDE.md](CLAUDE.md) defining structural layout, grid scales, and outdoor legibility palettes.
- **Background VoIP Walkie-Talkie**: Integrated namespaced Agora voice channels with silent background token refresh.
- **Device Sleep Prevention**: Integrated wake-lock support to lock volunteer screens during active camp shifts.

### Fixed
- **React Hook Order Mismatch**: Resolved startup hook rendering violations in the preloader screen.
- **Temporal Dead Zone (TDZ) Crashes**: Resolved ReferenceError crash when determining active schedule breaks.
- **Firestore Authorization Rules**: Re-ordered check-in write sequences and expanded security policies with recursive subcollection wildcards to prevent permission errors.
- **Registry Cold Start Sync**: Increased event registry fetch timeout to 8 seconds to avoid false offline timeouts.
