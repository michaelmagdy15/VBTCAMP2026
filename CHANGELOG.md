# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-07-09

### Added
- Added `CLAUDE.md` and `DESIGN.md` establishing the new Utility Sport design system guidelines.
- Added `vbt_uid_map` collection to map anonymous Firebase Auth UIDs to user phone numbers.
- Added native wake lock functionality to prevent screen sleep during camp execution.

### Fixed
- Fixed critical Firestore security rules validation path matching issue by using the UID-to-phone mapping helper in `firestore.rules`.
- Fixed token handshake silent refresh and namespaced Agora channels in `WalkieTalkie.jsx`.
