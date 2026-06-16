# Milestones

## v1.0 — Frontend i18n (English + Turkish) (Shipped: 2026-06-16)

**Delivered:** Full frontend internationalization for Flowboard. Every visible
UI string under `frontend/src/` flows through `react-i18next`. English and
Turkish ship in-tree at parity, with a Settings-panel language picker and
browser-language auto-detect. Community contributors can add a new locale by
dropping a single JSON file.

**Phases completed:** 4 phases, 7 executed plans (5 in Phase 2), 10 plan
SUMMARY artifacts, 86 commits in the milestone range.

**Stats:**

| Metric | Value |
|--------|-------|
| Commits in range (`cce5ea4..f81cf3b`) | 86 |
| Files changed | 74 (+10,191 / −626) |
| Locale catalog | 424 keys × 2 languages, 20 area prefixes |
| Bundle size delta | 539 KB → 580 KB (+41 KB) |
| Timeline | 2026-06-10 (single-day intensive) |
| Stack added | `react-i18next@^17`, `i18next@^26`, `i18next-browser-languagedetector@^8` |

**Key accomplishments:**

1. Wired `react-i18next 17` + `i18next 26` into Vite/React/TypeScript-strict with
   typed keys via `CustomTypeOptions` declaration merging — the only automated
   correctness gate available without a frontend test runner.
2. Audited 30 frontend source files producing `STRING-INVENTORY.md` (670 lines,
   428 rows) as the per-file extraction checklist with explicit user-data and
   brand-name boundaries.
3. Extracted 414 English keys across 20 area prefixes (`canvas.`, `dialog.`,
   `panel.`, `activity.`, etc.) across 90+ files; rewrote all Vietnamese
   hardcoded strings to English as part of BUGS-01.
4. Shipped Turkish translation at full parity (424 keys, all non-empty,
   maintainer-quality first pass) plus a SettingsPanel `<select>` language
   picker that switches the whole app in-place without a page reload.
5. Authored `CONTRIBUTING-i18n.md` (community translator onboarding) and
   `scripts/check-i18n-parity.mjs` (drift detection between locale catalogs) so
   future locale PRs are trivial to review.
6. Fixed 3 live UI bugs uncovered during the audit: Vietnamese strings in
   `formatRelativeTime` (BUGS-01), Turkish dotted-i breaking `startsWith` in
   `humanizeBackendError` (BUGS-02), static `html lang` attribute (BUGS-03).

**Known deferred items at close:** 4 (see STATE.md "Deferred Items"). The
implementation is complete; verification of these items requires a maintainer
to drive the browser manually and do a native-speaker Turkish pass.

**Archived artifacts:**

- `.planning/milestones/v1.0-ROADMAP.md` — phase-level decomposition
- `.planning/milestones/v1.0-REQUIREMENTS.md` — 30 REQ-IDs with final outcomes

**Lessons captured** (also in `RETROSPECTIVE.md`):

- Worktree-isolated executor agents survive Anthropic session resets — work
  lives in git and is recoverable.
- When launching N parallel plans, launch the heaviest plan **first** — the
  last-spawned agent hits the session-limit ceiling first.
- Shared catalog files (`en.json`) cause guaranteed merge conflicts even when
  area prefixes are disjoint — resolve programmatically (Python union), not by
  hand.

---
