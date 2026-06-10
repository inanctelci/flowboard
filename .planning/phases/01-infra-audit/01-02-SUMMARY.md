# Plan 01-02 — String Inventory: SUMMARY

**Plan:** 01-02-PLAN.md
**Status:** Complete
**Executor crashed:** Yes — context overflow ("Prompt is too long") after STRING-INVENTORY.md was fully written; SUMMARY.md was synthesized by the orchestrator from the on-disk inventory because the executor agent did not survive long enough to write it itself.

## What shipped

| Artifact | Path | Size |
|----------|------|------|
| String inventory | `.planning/phases/01-infra-audit/STRING-INVENTORY.md` | 670 lines, 46 KB, 428 table rows |
| This summary | `.planning/phases/01-infra-audit/01-02-SUMMARY.md` | this file |

## Coverage

- **Files audited:** ~30 source files under `frontend/src/` — canvas/, components/, components/activity/, components/settings/, store/, api/, lib/, constants/, App.tsx
- **Total translatable string rows:** ~186 (per the file's own String Density Summary)
- **Total do-not-translate rows:** ~65 (product names, model IDs, user-authored data, glyph icons, API parameter strings, LLM prompt templates)
- **Highest-density files (top extraction targets for Phase 2):**
  - `frontend/src/canvas/NodeCard.tsx` — 52 translatable rows
  - `frontend/src/components/GenerationDialog.tsx` — 42 rows
  - `frontend/src/components/ResultViewer.tsx` — 30 rows (includes BUGS-01 site)
  - `frontend/src/components/activity/activity-meta.ts` — 15 rows
  - `frontend/src/components/ReferencesPanel.tsx` — 10 rows

## Schema delivered

Inventory follows the RESEARCH.md §8 schema with one table per file:

| Column | Meaning |
|--------|---------|
| Line(s) | Source line number (best effort) |
| Current string | Verbatim, truncated at ~60 chars |
| Key proposal | Suggested `area.concept` dot-notation key |
| Kind | One of: text-node, aria-label, title-attr, placeholder, store-error, utility-fn, toaster-msg, activity-label, error-humanizer, do-not-translate |
| Notes | Context (interpolation, ambiguity, user-data flag, etc.) |

Plus a top-of-file **Negative list** and **Phase 2 Consumption Contract** explaining ordering, the `useTranslation()` vs headless `i18n.t()` rule, and the do-not-translate boundary.

## REQ-IDs satisfied

- **INFRA-07** — Catalog scope is now defined: the inventory enumerates every site that enters `en.json` and every site that must NOT.

## Surprises and notable findings

1. **`frontend/src/constants/character.ts` is partly Vietnamese.** The `CHARACTER_GENDERS`, `CHARACTER_COUNTRIES`, and `CHARACTER_VIBES` constants have `label` fields with Vietnamese display copy (e.g., `"Nam"`, `"Nữ"`). These are flagged `do-not-translate` (data enum rendering) but the labels themselves are Vietnamese strings still visible in pickers — Phase 2 must decide whether to (a) translate the labels via i18n keys, (b) leave them as Vietnamese-only display, or (c) replace them with English directly. **Maintainer decision needed before Phase 2.**

2. **`AddNodePalette.tsx` CHIPS values are ambiguous.** Strings like `"Character"`, `"Image"`, `"Storyboard"`, `"Video"`, `"Prompt"`, `"Note"` are both node-type identifiers (data — used as keys upstream) AND user-facing display labels. The inventory flags them `do-not-translate` for now, but Phase 2 may need a derived display map that gets translated while the underlying identifier stays.

3. **BUGS-01 site re-confirmed** — `frontend/src/components/ResultViewer.tsx:60-72` has Vietnamese hardcoded relative-time strings. Plan 01-01 will rewrite this; the inventory documents the i18n keys it should produce (`time.just_now`, `time.minutes_ago` etc.).

4. **`activity-meta.ts` has a SECOND `relativeTime()` utility** (lines 52-62) with similar Vietnamese-leaning structure but in English (`"just now"`, `"${sec}s ago"`, etc.). This is a different function from `formatRelativeTime` in ResultViewer.tsx — not a bug, just a parallel utility that Phase 2 will translate via the same `time.*` keys.

5. **`board.ts` TYPE_TITLE defaults** are data, not UI copy at render time — they're constants used as fallback `data.title` values when a user doesn't supply one. Phase 2 should be careful: translating these would change the default board state for new nodes.

## Why the executor crashed

The executor produced very high-quality output but accumulated too much context across ~30 file reads + extensive table generation. At 33 tool uses, it ran past the "Prompt is too long" threshold when attempting to write the SUMMARY.md, after STRING-INVENTORY.md was already on disk.

**Mitigation for Phase 2:** the Phase 2 executor will face a similar (larger) load. The plan should split extraction across multiple plans by directory chunk rather than running one mega-plan over all of `frontend/src/`. The String Density table at the bottom of STRING-INVENTORY.md is the natural decomposition guide.

## Deviations

- Executor crashed before writing SUMMARY.md. Orchestrator wrote this summary inline from the on-disk inventory.
- No code modifications (per the plan's read-only contract).

## Verification

- ✓ STRING-INVENTORY.md exists at the documented path
- ✓ 670 lines (well above any sensible floor)
- ✓ Negative list section present
- ✓ Phase 2 Consumption Contract section present
- ✓ Kind enum defined
- ✓ ~30 files audited (every source file with user-visible string density)
- ✓ String density summary at the bottom for Phase 2 decomposition
- ✓ No source files modified (read-only audit per plan contract)
