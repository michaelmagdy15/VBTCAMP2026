# TODOS

This file tracks future development phases and deferred operational features.

## Phase 2: SaaS & Multi-Tenancy Platform
* **What:** Refactor the database structure and client routing to support a multi-tenant SaaS architecture.
* **Why:** To allow any church or sports camp organization to upload lists, configure stations, and deploy Service Mode for their own events.
* **Context:** Current collections under `/vbt_events/{eventCode}` must be routed dynamically based on a tenant parameter (e.g. `/:tenantId/vbt_events/{eventCode}`).
* **Effort:** M
* **Priority:** P2
* **Depends on:** Complete Phase 1 single-tenant deployment.

## SMS Alert Backup Trigger
* **What:** Implement a background listener checking for incoming automated SMS rotation triggers.
* **Why:** As a backup when internet drops completely on the field.
* **Context:** Allows chaperones to sync the active time-block state via SMS gateway signals.
* **Effort:** S
* **Priority:** P3
* **Depends on:** Phase 1 deployment.
