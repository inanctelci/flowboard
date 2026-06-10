# Flowboard

## What This Is

Flowboard is a local-only, single-user infinite-canvas workspace for AI media
workflows. It composes characters, products, scenes, and videos as a directed
graph and drives generation through a Chrome MV3 extension that proxies
requests to Google Flow (Veo 3.1 / GEM_PIX_2). The repo is public on GitHub and
the current milestone adds internationalization so non-English users (starting
with Turkish) can use the canvas in their own language.

## Core Value

The frontend canvas — every visible UI string in `frontend/src/` — must be
usable end-to-end in a non-English language without losing any existing
generation, reference, or planner functionality.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase at v1.2.20. -->

- ✓ Infinite-canvas board with reusable ref / image / video nodes — v1.2.20 (`frontend/src/canvas/Board.tsx`, `@xyflow/react`)
- ✓ Multi-source image-to-video generation via Google Flow (Veo 3.1) — v1.2.20 (`agent/flowboard/services/flow_sdk.py`)
- ✓ Chrome MV3 extension bridge proxying authenticated Flow requests over loopback WebSocket :9223 — v1.2.20 (`extension/`, `agent/flowboard/services/ws_server.py`)
- ✓ Swappable LLM CLI provider layer (Claude Code / Gemini / Codex) for auto-prompt / vision / planner — v1.2.20 (`agent/flowboard/services/llm/`)
- ✓ Single-consumer asyncio worker queue with per-type handlers — v1.2.20 (`agent/flowboard/worker/processor.py`)
- ✓ SQLite + SQLModel persistence with cascade deletes — v1.2.20 (`agent/flowboard/db/`)
- ✓ Cross-board reference library, board ↔ Flow project sync, activity feed, chat planner — v1.2.20 (`agent/flowboard/routes/`)

### Active

<!-- Current milestone: frontend i18n with English + Turkish at v1. -->

- [ ] All user-visible strings in `frontend/src/` extracted from JSX/TS into a translation catalog
- [ ] Pluggable i18n infrastructure wired into the React app (locale loading, namespace, fallback)
- [ ] English (`en`) baseline catalog — complete coverage of extracted strings
- [ ] Turkish (`tr`) catalog — complete coverage at parity with English
- [ ] Browser-language auto-detect on first load, falling back to English
- [ ] Language override in the existing Settings panel, persisted across reloads
- [ ] End-to-end manual verification: switch to Turkish, drive a full generation flow, switch back

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

- The product is at **v1.2.20** and works end-to-end for the maintainer. This
  is a feature-add milestone on top of a mature codebase, not a build-from-zero
  effort. Existing tests (333 passing on the agent) and existing flows must
  keep working.
- The repo is public and the README explicitly courts sponsors and the
  open-source community (Vietnam / Korea audience hints, multiple sponsor QR
  codes). Adding Turkish first is a maintainer-language choice; the
  infrastructure should make any community-contributed locale a JSON drop.
- Frontend is **React 18 + TypeScript strict + Vite 5** with **Zustand** for
  state. No existing i18n library. Strings are currently hardcoded inline in
  JSX across `frontend/src/canvas/`, `frontend/src/components/`, dialogs, the
  Settings panel, and inline error / empty-state copy.
- No frontend test framework is configured (`package.json` has no `test`
  script). Verification of i18n will be manual / type-driven, with the
  TypeScript compiler enforcing key existence if the chosen library has TS
  support.
- The codebase is already mapped under `.planning/codebase/` (analysis date
  2026-06-10) — `STACK.md`, `ARCHITECTURE.md`, `STRUCTURE.md` are current.

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
| Frontend UI only — no backend/extension/LLM-output translation | Smallest believable slice that delivers user value; keeps server logs in one language; LLM output is its own concern | — Pending |
| Ship English + Turkish at v1 (not just plumbing + sample) | Maintainer is Turkish; a real second locale forces the plumbing to be honest about parity, plural forms, and string-key shape | — Pending |
| Auto-detect from browser + override in existing Settings panel | Settings panel already exists; no new UI chrome needed; users who want override get it without a top-bar redesign | — Pending |
| Pluggable infra so community can add locales by dropping a JSON | Open-source repo; lowers contribution barrier; matches react-i18next / similar library norms | — Pending |
| Library choice deferred to research phase | Default expectation is react-i18next, but i18next vs FormatJS vs Lingui has real tradeoffs in Vite + TS-strict; let research decide | — Pending |

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
*Last updated: 2026-06-10 after initialization (i18n milestone)*
