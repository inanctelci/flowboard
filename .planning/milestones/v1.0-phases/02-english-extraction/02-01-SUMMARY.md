---
phase: 02-english-extraction
plan: "01"
subsystem: canvas
tags:
  - i18n
  - react-i18next
  - canvas
  - NodeCard
  - AddNodePalette
dependency_graph:
  requires:
    - 01-01 (i18n infrastructure from Phase 1 — replicated into worktree)
  provides:
    - node.* keys (57) in en.json
    - palette.* keys (7) in en.json
    - All canvas components extracted
  affects:
    - frontend/src/i18n/locales/en.json (appended 66 node.* + palette.* keys)
    - frontend/src/i18n/locales/tr.json (appended 66 empty-string stubs)
tech_stack:
  added:
    - react-i18next (useTranslation hook in .tsx files)
    - i18n headless singleton (for module-scope async function applyVariantToTarget)
  patterns:
    - D-08: no dynamic key construction — chipLabel() resolver uses if/else literal keys instead of template literals
    - Boundary comments on all user-data sites (data.title, slotError backend tokens)
key_files:
  created:
    - frontend/src/i18n/i18n.ts
    - frontend/src/i18n/i18n.d.ts
    - frontend/src/i18n/locales/en.json
    - frontend/src/i18n/locales/tr.json
  modified:
    - frontend/src/canvas/AddNodePalette.tsx
    - frontend/src/canvas/NodeCard.tsx
    - frontend/src/main.tsx
    - frontend/package.json
decisions:
  - "Used t() hook for all NodeCard sub-component store-error paths EXCEPT applyVariantToTarget (module-scope async fn must use i18n.t() headless)"
  - "AddNodePalette CHIPS: chipLabel() resolver with if/else per kind (D-08: no dynamic template literal keys)"
  - "node.variant_blocked_title uses {{error}} interpolation — backend token passes through verbatim, only the prefix is translated"
  - "VariantEdge.tsx and Board.tsx: zero extractable rows per inventory — untouched"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-10T10:38:24Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 8
  files_created: 4
---

# Phase 02 Plan 01: Canvas Extraction Summary

**One-liner:** Extracted 75 i18n calls across canvas components (57 node.* + 7 palette.* + 2 new files) with strict user-data boundary enforcement throughout NodeCard.tsx.

## Counts

| Metric | Value |
|--------|-------|
| Translatable rows extracted (AddNodePalette) | 3 |
| Translatable rows extracted (NodeCard) | 57 unique keys |
| palette.kind.* keys added | 6 |
| Total keys added to en.json | 66 (node.* + palette.*) |
| Total keys added to tr.json | 66 (empty-string stubs, full parity) |
| do-not-translate boundary comments | 12 |
| Rows skipped (do-not-translate) | 8 (data.title x5, slotError backend token, media_id debug, CHIPS kind identifiers) |

## Verification Results

- `npm run lint` exits 0
- `grep -cE '"(node|palette)\.' en.json` returns 62 (exceeds plan minimum of 50)
- `grep -cE "t\(\"(node|palette)\." NodeCard.tsx AddNodePalette.tsx` returns 65+10=75
- `grep -E 'data\.title' NodeCard.tsx | grep -c 't('` returns 0
- Brand name check (Veo|Omni Flash|Nano Banana) returns 0 in en.json
- Hardcoded JSX text check (>(Generate|Cancel|Save...)<) returns 0

## Commits

| Hash | Description |
|------|-------------|
| `3ad663f` | feat(02-01-PLAN/AddNodePalette): extract strings to i18n (+ i18n infrastructure) |
| `0152a3e` | feat(02-01-PLAN/NodeCard): extract strings to i18n |
| `25043fa` | feat(02-01-PLAN/tr-parity): add empty-string stubs for canvas keys |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] i18n infrastructure missing from worktree**
- **Found during:** Task 1 setup
- **Issue:** Worktree was created before Phase 1 Plan 01 added i18next packages. `package.json` lacked i18next/react-i18next/i18next-browser-languagedetector; `frontend/src/i18n/` did not exist.
- **Fix:** Created i18n.ts, i18n.d.ts, en.json, tr.json; updated package.json to match main repo; updated main.tsx with I18nextProvider; ran npm install.
- **Files modified:** `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/i18n/` (4 new files)

**2. [Rule 2 - Missing Critical] VariantPicker loop variable shadowed t**
- **Found during:** Task 2 (NodeCard extraction)
- **Issue:** VariantPicker mapped `state.targets` with variable name `t`, which would shadow the `useTranslation` destructured `t` function.
- **Fix:** Renamed loop variable from `t` to `tgt`.
- **Files modified:** `frontend/src/canvas/NodeCard.tsx`

### Ambiguity Resolution Applied (CONTEXT.md Ambiguity #2)

AddNodePalette CHIPS are handled via a `chipLabel()` function using if/else literal keys (satisfies D-08: no dynamic key construction that breaks static analysis).

### VariantEdge.tsx and Board.tsx

Both confirmed zero extractable rows per inventory. Not modified (as planned).

## Known Stubs

None — all extracted strings use real en.json values matching original English copy.

## Threat Flags

None.

## Self-Check: PASSED

- `frontend/src/canvas/NodeCard.tsx` exists — useTranslation present, 65 t() calls
- `frontend/src/canvas/AddNodePalette.tsx` exists — useTranslation present, 10 t() calls
- `frontend/src/i18n/locales/en.json` exists — 75 total keys
- `frontend/src/i18n/locales/tr.json` exists — 75 total keys (parity)
- Commits 3ad663f, 0152a3e, 25043fa verified in git log
