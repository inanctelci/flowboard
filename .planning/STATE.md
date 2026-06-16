---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Character Creation Rework
status: roadmapped
last_updated: "2026-06-16T00:00:00.000Z"
last_activity: 2026-06-16
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State — Flowboard

**Last updated:** 2026-06-16
**Session:** v1.1 milestone roadmap created — 3 phases, 23 requirements mapped

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-16)

**Core value:** Local-only, single-user infinite-canvas workspace for AI media workflows — composing characters, products, scenes, and videos as a directed graph and driving generation through a Chrome MV3 extension that proxies Google Flow.

**Current focus:** v1.1 — Character Creation Rework. Replace the hardcoded 3-axis preset picker (charCountry / charVibe / charGender) with a guided multi-step wizard producing structured, reusable character configurations persisted as localStorage-backed presets.

---

## Current Position

Phase: Phase 5 (not yet started — roadmap complete, awaiting /gsd-plan-phase 5)
Plan: —
Status: Roadmapped
Last activity: 2026-06-16 — v1.1 roadmap created

**Progress bar:** [----------] 0% (0/3 phases)

---

## Milestone Guardrails

These constraints apply to every phase in v1.1. Verify at each phase boundary:

| Guardrail | Verification |
|-----------|-------------|
| No backend Pydantic/DB schema changes | Grep: no edits to agent/flowboard/db/models.py or routes/ |
| Shallow-merge PATCH contract — no wholesale node.data replace | After any wizard submit: node.data.mediaId still present |
| Stable English keys in node.data — never translated display labels | Switch locale to TR, save character node, switch to EN: same prompt produced |
| scripts/check-i18n-parity.mjs exits 0 at every phase boundary | node scripts/check-i18n-parity.mjs (local run) |
| v1.0 boards with charCountry / charVibe load without console errors | Open a pre-v1.1 board throughout Phases 5, 6, and 7 |

---

## Deferred Items

Items carried over from v1.0 (see MILESTONES.md). These do not block v1.1.

| Category | Item | Status | Source |
|----------|------|--------|--------|
| verification_gap | Phase 01 `01-VERIFICATION.md` | human_needed | Pre-close audit `audit-open` |
| verification_gap | Phase 04 `04-VERIFICATION.md` | human_needed | Pre-close audit `audit-open` |
| requirement_open | `VERIFY-01` — manual end-to-end Turkish flow | human_needed | Phase 4 MAINTAINER-CHECKLIST |
| requirement_open | `VERIFY-02` — layout review at Turkish string lengths (1280×800) | human_needed | Phase 4 MAINTAINER-CHECKLIST |
| requirement_open | `VERIFY-04` — DevTools `tr-TR` locale exercises BUGS-02 dotted-i fix | human_needed | Phase 4 MAINTAINER-CHECKLIST |
| requirement_open | `TR-02` — native-speaker refinement pass on `tr.json` | human_needed | Phase 4 MAINTAINER-CHECKLIST |

---

## Accumulated Context

### Carried-Over Decisions (from v1.0)

| Decision | Rationale |
|----------|-----------|
| Product/model names stay in `constants/`, never in locale JSON | Brand identifiers are not UI copy |
| No dynamic key construction; no `useTranslation()` in `.ts` files | Breaks static analysis / hooks contract |
| i18next as locale source of truth; Zustand mirrors | Prevents partial re-render on language switch |
| Flat single-namespace `en.json` / `tr.json` | <500 keys total; namespace splitting adds OSS contributor friction |
| TypeScript typed keys via `CustomTypeOptions` | Only automated correctness gate without a frontend test runner |

### New Decisions (v1.1)

| Decision | Rationale |
|----------|-----------|
| Flat `char*` keys on node.data (no nested character: {} object) | Shallow-merge PATCH contract requires top-level keys; nested object would be wholesale-replaced |
| Wizard state in useState (not a Zustand slice) | Transient — discarded on submit or cancel; not persisted mid-step |
| Preset library in localStorage via zustand/middleware/persist | No backend schema changes in scope; single-user local app; Reference table is media-first (wrong semantic) |
| Convert-on-read migration (charCountry → charEthnicity) — no startup PATCHes | Thundering herd of PATCHes on load creates a false "board modified" signal; lazy migration is the correct pattern |
| Zod 4 added as the only new runtime dependency | Runtime parse of localStorage CharacterConfig blobs; prevents corrupt state from blocking the app |
| 3 phases (coarse granularity) collapsing the research-recommended 5 | Phase 3 (preset store) merged into Phase 6 with wizard UI (store is unblocked after Phase 5; UI requires wizard shell); Phase 4 (constants removal) merged into Phase 7 with i18n audit (both are cleanup/verification work) |

### Blockers

None.

---

## Session Continuity

To resume this project:

1. Read `.planning/PROJECT.md` for current scope, constraints, and validated requirements
2. Read `.planning/MILESTONES.md` for what shipped
3. Read `.planning/ROADMAP.md` for phase decomposition (Phases 5–7)
4. Read `.planning/REQUIREMENTS.md` for v1.1 REQ-IDs with phase assignments
5. Check this file for guardrails, decisions, and deferred items
6. Next action: `/gsd-plan-phase 5`

### Files on disk

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Core value, validated requirements, key decisions, current state |
| `.planning/MILESTONES.md` | Shipped milestone log (v1.0) |
| `.planning/ROADMAP.md` | Milestone-grouped phase view (Phases 1–7) |
| `.planning/STATE.md` | This file — current state, decisions, deferred items |
| `.planning/REQUIREMENTS.md` | v1.1 REQ-IDs with phase traceability |
| `.planning/config.json` | Granularity (coarse), parallelization (true), mode (yolo) |
| `.planning/research/SUMMARY.md` | v1.1 architecture + phase recommendations |
| `.planning/research/PITFALLS.md` | 15 critical pitfalls with prevention patterns |
| `.planning/milestones/v1.0-ROADMAP.md` | Archived v1.0 phase decomposition |
| `.planning/milestones/v1.0-REQUIREMENTS.md` | Archived v1.0 REQ-IDs with outcomes |

---

*v1.0 shipped: 2026-06-10. Archived: 2026-06-16.*
*v1.1 roadmap created: 2026-06-16.*
