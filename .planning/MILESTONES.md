# Milestones

## v1.1 — Character Creation Rework (Shipped: 2026-06-17)

**Delivered:** Replaced Flowboard's hardcoded character preset system (2 genders, 7 Vietnamese-labelled nationalities, 6 baked-token vibes) with a guided 5-step wizard producing structured, reusable character configurations. Users can save their own characters as named presets via a localStorage-backed library and reuse them across boards. v1.0 boards keep loading without console errors via convert-on-read migration at three hydration sites.

**Phases completed:** 3 phases (numbered 5–7), 3 plans, 3 SUMMARYs, 37 commits in the milestone range.

**Stats:**

| Metric | Value |
|--------|-------|
| Commits in range (`855b092..44f0e31`) | 37 |
| Files changed | 51 (+10,082 / −1,723) |
| Locale catalog | 511 keys × 2 languages (+102 wizard, −15 stale legacy) |
| New runtime deps | `zod@^4.4.3` (single new dep) |
| Timeline | 2026-06-16 → 2026-06-17 (~1 day intensive) |
| Phase compression | 5 research-recommended phases collapsed to 3 (coarse granularity) |

**Key accomplishments:**

1. Shipped `frontend/src/lib/character/` (5 modules: schema.ts, buildCharacterPrompt.ts, toDataPatch.ts, migrate.ts, vibeTokens.ts) with Zod 4 as the only new runtime dependency. Pure functions, no React/Zustand imports; matches existing `lib/storyboardPrompt.ts` pattern.
2. Shipped the 5-step character wizard (Identity → Appearance → Styling → Expression → Review) mounted inside the existing `GenerationDialog` modal — reuses backdrop, focus trap, ESC handler. PresetList provides clone-then-edit prefill from a saveable localStorage-backed library (50-cap, quota & parse-failure error routing through Toaster).
3. Wired `migrateCharacterNodeData` (convert-on-read `charCountry` → `charEthnicity`) at all 3 hydration sites: `loadInitialBoard`, `switchBoard`, and `refreshBoardState`. Lazy migration on read — never PATCHes on startup.
4. Added 102 new wizard / preset / character-field i18n keys to `en.json` + `tr.json` at parity; removed 15 stale legacy `character.{gender,country,vibe}.*` keys in the same commit as constants deletion. `scripts/check-i18n-parity.mjs` exits 0 at every commit.
5. Deleted `frontend/src/constants/character.ts` entirely; inlined the 7-entry country→ethnicity map into `migrate.ts` and moved the 6 vibe token arrays to a new `lib/character/vibeTokens.ts`. Zero live `CHARACTER_*` / `localized*Label` references survive.
6. Fixed the Phase 5 INFO observation (`refreshBoardState` was a 3rd hydration site Phase 5 research missed) and the Phase 6 SC-5 gap (wizard not seeding from `node.data` on mount) — both inline during the autonomous run.

**Known deferred items at close:** 9 browser-UAT items (`UAT-V1.1-01..09`) + 3 phase verification statuses pending the same UAT pass. Documented in STATE.md "Deferred Items (From v1.1)". All implementation landed; verification requires maintainer manual browser-driven UAT. Same pattern as v1.0's deferred VERIFY items.

**Archived artifacts:**

- `.planning/milestones/v1.1-ROADMAP.md` — phase-level decomposition + key decisions
- `.planning/milestones/v1.1-REQUIREMENTS.md` — 23 REQ-IDs (all `[x]` satisfied) + Future + Out of Scope
- `.planning/v1.1-MILESTONE-AUDIT.md` — full audit (23/23 reqs, 3/3 phases, 4/4 E2E flows, 6/6 integration wires)

**Lessons captured:**

- Coarse granularity (3 phases) was the right call for this milestone — collapsing the research-recommended 5 phases caught the natural breakpoints between data foundation, UI+library, and cleanup+audit.
- The autonomous workflow's verifier caught a real implementation gap (Phase 6 SC-5 wizard not seeding from `node.data`) that lint and parity gates would have missed — the inline-fix-then-recheck loop closed it without a retry.
- Multiple subagent timeouts and 529 overloads during the run (planner timeout for Phase 6, integration-checker 529 for the audit) — the orchestrator-inline-fallback pattern kept the milestone moving without losing planning artifacts; explicit research/context/spec docs made the inline fallback cheap.
- PATTERNS research is load-bearing: revealed that the codebase hand-rolls localStorage persistence (`references.ts` analog) and DOES NOT use `zustand/middleware/persist`. The REQUIREMENTS.md spec named the middleware; the planner aligned to the codebase convention without losing functional outcome.

---

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
