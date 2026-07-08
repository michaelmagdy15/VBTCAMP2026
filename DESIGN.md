# Design System — VBT Sports Camp App (Service Mode)

## Product Context
- **What this is:** An ultra-minimal volunteer remote interface that removes scheduling and scoring complexity from chaotic camp days.
- **Who it's for:** Chaperones (Team Leaders) and Referees (Game Leaders) operating in outdoor environments.
- **Space/industry:** Youth Sports Camps / Church Events.
- **Project type:** Mobile-First Web App wrapper (Capacitor for iOS).

## Aesthetic Direction
- **Direction:** Utility Sport
- **Decoration level:** Minimal
- **Mood:** Clean, function-first, high contrast, and highly legible under bright glare.

## Typography
- **Display/Hero:** Outfit — Modern geometric sans with high-impact character.
- **Body:** Plus Jakarta Sans — High legibility at smaller sizes.
- **UI/Labels:** Plus Jakarta Sans
- **Data/Tables:** Geist Mono — Displays scoring numbers, timers, and timestamps in perfect tabular monospace alignment.
- **Code:** Geist Mono
- **Scale:**
  - `h1`: 28px (Bold)
  - `h2`: 22px (Bold)
  - `h3`: 18px (Bold)
  - `body`: 15px (Regular)
  - `caption`: 12px (Medium)

## Color
- **Approach:** Restrained
- **Primary:** `#3B82F6` (VBT Blue)
- **Secondary:** `#60A5FA` (VBT Sky Blue)
- **Neutrals:**
  - `#000000` (Deepest Shadow)
  - `#0a1020` (Space Navy Background)
  - `#1C1C1E` (iOS Dark Surface)
  - `#f8fafc` (Light Mode background)
- **Semantic:**
  - Red Team: `#ef4444` (VBT Red)
  - White Team: `#f8fafc` / `#e2e8f0` (VBT White)

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 
  - `xs`: 4px
  - `sm`: 8px
  - `md`: 16px
  - `lg`: 24px
  - `xl`: 32px
  - `xxl`: 48px

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 1 column on mobile, max 480px width constraint.
- **Border radius:** 12px (comfort rounded).

## Motion
- **Approach:** Snappy-functional
- **Easing:** ease-out (enter), ease-in (exit), ease-in-out (move)
- **Duration:** 150ms micro-interactions.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-09 | Initial design system created | Created by /design-consultation to secure sunlight glare legibility and touch target safety. |
