# Flowboard

## What This Is

Flowboard is a local-only, single-user infinite-canvas workspace for AI media
workflows. It composes characters, products, scenes, and videos as a directed
graph and drives generation through a Chrome MV3 extension that proxies
requests to Google Flow (Veo 3.1 / GEM_PIX_2). The repo is public on GitHub.
As of v1.0 the frontend canvas is fully internationalized — English and Turkish
ship in-tree with a Settings-panel language picker, and community contributors
can add a new locale by dropping a single JSON file.

## Current State

**Shipped:** v1.0 (2026-06-10) — Frontend internationalization with English and
Turkish, 424 keys at parity, react-i18next 17 wired into Vite/React, three live
bugs fixed (Vietnamese in `formatRelativeTime`, dotted-i in
`humanizeBackendError`, static `html lang`), contributor onboarding doc, parity
CI script. See `.planning/milestones/v1.0-ROADMAP.md`.

**Active:** v1.1 — Character Creation Rework. Replace hardcoded preset system
(genders / countries / vibes) with a guided multi-step wizard producing
structured, reusable character configurations.

## Current Milestone: v1.1 Character Creation Rework

**Goal:** Replace the hardcoded character preset system (`CHARACTER_GENDERS` /
`CHARACTER_COUNTRIES` / `CHARACTER_VIBES`) with a guided multi-step wizard that
produces structured, reusable character configurations — overcoming the
narrowness of frozen Vietnamese-labelled presets that don't reflect the
diversity of characters users want to create.

**Target features:**
- Guided multi-step wizard for character creation (identity → appearance →
  styling → expression/lighting → review), replacing the dropdown-driven preset
  picker in `GenerationDialog`
- Structured data model — typed fields persisted on `node.data` (gender,
  ethnicity/origin, age, hair, outfit, vibe, expression, lighting); prompt
  assembled at dispatch from those fields, with the existing framing anchors
  preserved
- Reusable character library — user can save their own character
  configurations as named presets and reuse them across boards
- Removal + migration — delete the old presets module and strip / backfill
  existing nodes' `charCountry` / `charVibe` fields so v1.0 boards still load
  without console errors
- i18n coverage — add EN + TR strings for every new wizard surface, maintaining
  v1.0 parity discipline (`scripts/check-i18n-parity.mjs` stays green)

## Core Value

The frontend canvas — every visible UI string in `frontend/src/` — must be
usable end-to-end in a non-English language without losing any existing
generation, reference, or planner functionality.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Infinite-canvas board with reusable ref / image / video nodes — v1.2.20 (`frontend/src/canvas/Board.tsx`, `@xyflow/react`)
- ✓ Multi-source image-to-video generation via Google Flow (Veo 3.1) — v1.2.20 (`agent/flowboard/services/flow_sdk.py`)
- ✓ Chrome MV3 extension bridge proxying authenticated Flow requests over loopback WebSocket :9223 — v1.2.20 (`extension/`, `agent/flowboard/services/ws_server.py`)
- ✓ Swappable LLM CLI provider layer (Claude Code / Gemini / Codex) for auto-prompt / vision / planner — v1.2.20 (`agent/flowboard/services/llm/`)
- ✓ Single-consumer asyncio worker queue with per-type handlers — v1.2.20 (`agent/flowboard/worker/processor.py`)
- ✓ SQLite + SQLModel persistence with cascade deletes — v1.2.20 (`agent/flowboard/db/`)
- ✓ Cross-board reference library, board ↔ Flow project sync, activity feed, chat planner — v1.2.20 (`agent/flowboard/routes/`)
- ✓ All user-visible strings in `frontend/src/` extracted into a typed i18n catalog — v1.0 (`frontend/src/i18n/`)
- ✓ Pluggable i18n infrastructure wired into the React app (react-i18next 17 + i18next 26, typed keys via `CustomTypeOptions`, Zustand mirror) — v1.0
- ✓ English baseline catalog with complete coverage (424 keys, 20 area prefixes) — v1.0 (`frontend/src/i18n/locales/en.json`)
- ✓ Turkish catalog at full parity (424 keys, maintainer-quality first pass) — v1.0 (`frontend/src/i18n/locales/tr.json`)
- ✓ Browser-language auto-detect on first load with English fallback (`i18next-browser-languagedetector`) — v1.0
- ✓ Language override in Settings panel, persisted via `flowboard.i18n.locale` localStorage key — v1.0 (`frontend/src/components/SettingsPanel.tsx`)
- ✓ Contributor onboarding for adding new locales (`CONTRIBUTING-i18n.md` + `scripts/check-i18n-parity.mjs`) — v1.0
- ✓ Three live UI bugs fixed: Vietnamese strings in `formatRelativeTime` (BUGS-01), Turkish dotted-i in `humanizeBackendError` (BUGS-02), static `html lang` (BUGS-03) — v1.0

### Active

<!-- v1.1 Character Creation Rework requirements are tracked in
     .planning/REQUIREMENTS.md. The 4 items below were deferred at v1.0 close
     and still need maintainer manual verification before they can be ticked
     off in the validated list — they do not block v1.1. -->

- [ ] **VERIFY-01** (deferred from v1.0): Manual end-to-end Turkish drive of a full generation flow with no console errors
- [ ] **VERIFY-02** (deferred from v1.0): Layout review at Turkish string lengths at 1280×800 (no clipping)
- [ ] **VERIFY-04** (deferred from v1.0): DevTools `tr-TR` locale override exercises the BUGS-02 dotted-i fix in `humanizeBackendError`
- [ ] **TR-02** (deferred from v1.0): Native-speaker refinement pass on `frontend/src/i18n/locales/tr.json`

### Out of Scope

- Backend / agent error strings and activity feed messages — kept English-only; users see them rarely and translating them complicates server-side log analysis
- Chrome extension popup UI — touched by few users (one-time setup); revisit if it becomes a friction point
- LLM-generated content (auto-prompts, vision aiBriefs, planner replies) — output language is the LLM's concern, not the UI shell's; user can ask the LLM in their own language
- User data (node labels, prompts, board titles, ref names) — translating user-authored content is wrong by definition
- Right-to-left language support — not in v1; Turkish is LTR. Revisit when an RTL locale is contributed
- Pluralization / ICU MessageFormat complexity beyond what the chosen library gives for free — keep keys flat and human-readable
- Translation memory / TMS integration — locale JSONs live in the repo, edited by hand or by community PR
- Locale-aware date / number / currency formatting — Flowboard barely shows formatted dates today; defer until it does
- Backend `Accept-Language` content negotiation — backend stays English; the locale lives entirely in the frontend

## Context

- The product remains at **v1.2.20** for agent features and has just shipped
  **v1.0** for the frontend i18n surface. Existing tests (333 passing on the
  agent) and existing flows keep working — i18n was a pure additive layer to UI
  text.
- The repo is public and the README explicitly courts sponsors and the
  open-source community. Adding Turkish first was a maintainer-language choice;
  the i18n infrastructure now makes any community-contributed locale a JSON drop
  (see `CONTRIBUTING-i18n.md` and `scripts/check-i18n-parity.mjs`).
- Frontend is **React 18 + TypeScript strict + Vite 5** with **Zustand** for
  state. After v1.0: **react-i18next 17 + i18next 26** wired in, all
  user-visible strings under `frontend/src/` flow through `t()`, and the
  TypeScript compiler enforces key existence via `CustomTypeOptions`
  declaration merging.
- No frontend test framework is configured (`package.json` has no `test`
  script). Verification of i18n is manual / type-driven; the i18n parity check
  script provides automated drift detection between locale catalogs.
- The codebase map under `.planning/codebase/` (analysis date 2026-06-10) is
  still current — `STACK.md`, `ARCHITECTURE.md`, `STRUCTURE.md` reflect post-v1.0
  state minus the i18n module additions.
- **Bundle size after v1.0:** 539 KB → 580 KB (+41 KB for i18next runtime +
  424 keys × 2 locales).

## Constraints

- **Tech stack**: React 18.3 + TypeScript 5.6 strict + Vite 5.4 — i18n choice must integrate cleanly with this trio. No ejecting from Vite, no switching bundlers.
- **Tech stack**: Zustand 5 for state — locale state lives in a Zustand slice (or the i18n library's own provider), not in React Context indirection.
- **Tech stack**: No frontend test runner today — don't make i18n the reason one has to be added; if tests are valuable here, gate that as a separate concern.
- **Scope**: Frontend only (`frontend/src/`). Do not touch `agent/flowboard/` or `extension/` for translation strings in this milestone.
- **Compatibility**: All existing flows (generation, references, planner, chat, settings, board CRUD) must work identically in English after the migration — i18n is a pure additive layer to UI text, not a refactor of behavior.
- **Compatibility**: Build size matters less than maintainability — the repo is local-only and not bandwidth-constrained, so a slightly heavier i18n library with good DX is acceptable.
- **Audience**: Repo is public — choose patterns the open-source community will recognize (react-i18next is the default expectation for React/TS projects unless there's a reason against it; will confirm in research).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Frontend UI only — no backend/extension/LLM-output translation | Smallest believable slice that delivers user value; keeps server logs in one language; LLM output is its own concern | ✓ Good — v1.0 shipped without touching backend logs; LLM output stayed user's concern |
| Ship English + Turkish at v1 (not just plumbing + sample) | Maintainer is Turkish; a real second locale forces the plumbing to be honest about parity, plural forms, and string-key shape | ✓ Good — forced 30+ string-shape decisions that a stub locale would have hidden |
| Auto-detect from browser + override in existing Settings panel | Settings panel already exists; no new UI chrome needed; users who want override get it without a top-bar redesign | ✓ Good — `<select>` in existing section pattern; ~80 LOC of new UI total |
| Pluggable infra so community can add locales by dropping a JSON | Open-source repo; lowers contribution barrier; matches react-i18next / similar library norms | ✓ Good — `CONTRIBUTING-i18n.md` + `check-i18n-parity.mjs` deliver this; awaiting first community PR |
| `react-i18next@^17` + `i18next@^26` over Lingui/FormatJS | Lingui 6 disqualified (Vite >=6.3 peer dep mismatch); FormatJS overkill for <300 keys; react-i18next is OSS-recognizable | ✓ Good — locked in research; no surprises through execution |
| Flat single-namespace `en.json` / `tr.json` (no namespace split) | <300 keys at v1; namespace splitting adds friction for OSS contributors | ✓ Good — ended at 424 keys, still well within single-namespace ergonomics |
| TypeScript typed keys via `CustomTypeOptions` declaration merging | Only automated correctness gate without a frontend test runner | ✓ Good — caught 7 invalid key references during extraction; lint = CI |
| i18next as locale source of truth; Zustand mirrors for UI | Prevents partial re-render on language switch (all `useTranslation()` consumers re-render together) | ✓ Good — no flicker on switch; persistence handled via dedicated `flowboard.i18n.locale` key |
| Product/model names stay in `constants/`, never in locale JSON | Brand identifiers (`Veo 3.1 Lite`, `Nano Banana Pro`, etc.) are not UI copy | ✓ Good — zero brand strings leaked into locale files |
| Defer `VERIFY-01/02/04` and `TR-02` to maintainer manual pass | Browser-driven UAT and native-speaker review cannot be automated; explicit deferral is cleaner than fake ticks | ⚠ Revisit — 4 items still open; track until closed in a future patch |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-16 — v1.1 milestone (Character Creation Rework) opened*
