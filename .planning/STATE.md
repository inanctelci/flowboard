---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 1 — Infra + Audit
current_plan: None yet (awaiting `/gsd-plan-phase 1`)
status: Not started
last_updated: "2026-06-10T15:07:29.555Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 7
  completed_plans: 4
  percent: 25
---

# Project State — Flowboard i18n Milestone

**Last updated:** 2026-06-10
**Session:** Roadmap created; awaiting Phase 1 planning

---

## Project Reference

**Project:** Flowboard — Frontend i18n Milestone
**Core value:** Every visible UI string in `frontend/src/` usable end-to-end in Turkish (and any future community locale) without losing existing generation, reference, or planner functionality.
**Project file:** `.planning/PROJECT.md`
**Milestone mode:** MVP — app runs in English at every phase boundary

---

## Current Position

**Current phase:** 1 — Infra + Audit
**Current plan:** None yet (awaiting `/gsd-plan-phase 1`)
**Status:** Not started
**Phase goal:** Wire the i18n layer, fix live bugs, produce the extraction inventory

```
Progress: [██████░░░░] 57%
```

---

## Phase Summary

| Phase | Name | Status | Requirements |
|-------|------|--------|-------------|
| 1 | Infra + Audit | Not started | INFRA-01..07, BUGS-01..03 (10) |
| 2 | English Extraction | Not started | EXTRACT-01..07 (7) |
| 3 | Turkish + Switcher | Not started | TR-01..04, SWITCH-01..04 (8) |
| 4 | Polish + Verify | Not started | VERIFY-01..04, INFRA-08 (5) |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Total requirements (v1) | 30 |
| Requirements completed | 0 |
| Phases complete | 0/4 |
| Plans complete | 0/7 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| react-i18next@^17 + i18next@^26 | Locked from research — Lingui 6 disqualified (Vite >=6.3 peer dep); best DX for React 18 + TS strict |
| `flowboard.i18n.locale` localStorage key | Dedicated sibling key to `flowboard.settings.v1`; avoids nested-key lookup complexity |
| Flat `en.json` / `tr.json`, no namespace split | <300 keys; single namespace reduces OSS contributor friction |
| TypeScript typed keys via `CustomTypeOptions` | Only automated correctness gate without a frontend test runner |
| i18next as locale source of truth; Zustand mirrors | Prevents partial re-render on language switch (all `useTranslation()` consumers re-render together) |
| BUGS-01/02/03 fixed in Phase 1 | BUGS-01 (Vietnamese strings) must be rewritten before string keys can be assigned; BUGS-02 (dotted-i) blocks Turkish correctness; BUGS-03 (lang attr) is 3 lines and foundational |
| INFRA-08 (CONTRIBUTING-i18n.md) in Phase 4 | Contributor docs describe the final key shape — only accurate after `en.json` is frozen in Phase 3 |
| Product/model names stay in `constants/`, never in locale JSON | Brand identifiers (`Veo 3.1 Lite`, etc.) are not UI copy; EXTRACT-06 |
| No dynamic key construction | Breaks static analysis and typed-key enforcement; use explicit `t("key")` per value |
| No `useTranslation()` in `.ts` files | Hooks violation; use `i18n.t()` singleton in store actions and utility functions |

### Critical Risks

| Risk | Mitigation |
|------|-----------|
| Wrapping user-authored content (`data.title`, `data.prompt`, `ref.label`) in `t()` during extraction | Phase 1 produces user-data boundary checklist with comments in NodeCard.tsx and ReferencesPanel.tsx before any string is touched |
| Missing non-JSX strings (aria-labels, store errors, utility functions = "invisible 40%") | Phase 1 string inventory grep covers all non-JSX sites explicitly |
| Vietnamese strings in `formatRelativeTime` blocking key assignment | BUGS-01 rewrite happens in Phase 1, before any extraction in Phase 2 |

### Todos

- [ ] Start Phase 1 planning: `/gsd-plan-phase 1`

### Blockers

None.

---

## Session Continuity

To resume this project:

1. Read `.planning/PROJECT.md` for scope and constraints
2. Read `.planning/ROADMAP.md` for phase structure and success criteria
3. Read `.planning/REQUIREMENTS.md` for full requirement set with traceability
4. Check this file for current position and accumulated decisions
5. Next action: `/gsd-plan-phase 1`

### Files on disk

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Core value, scope, constraints, key decisions |
| `.planning/REQUIREMENTS.md` | 30 v1 requirements with category groupings and traceability |
| `.planning/ROADMAP.md` | Phase structure, success criteria, requirement mappings |
| `.planning/STATE.md` | This file — project memory and session continuity |
| `.planning/config.json` | Granularity (coarse), parallelization (true), mode (yolo) |
| `.planning/research/SUMMARY.md` | Locked technical decisions, phase skeleton, live bugs |
| `.planning/research/STACK.md` | Library choice rationale |
| `.planning/research/ARCHITECTURE.md` | Provider placement, data flow, file specs |
| `.planning/research/FEATURES.md` | Feature landscape |
| `.planning/research/PITFALLS.md` | 14 pitfalls with phase assignments |

---

*State initialized: 2026-06-10 after roadmap creation*
