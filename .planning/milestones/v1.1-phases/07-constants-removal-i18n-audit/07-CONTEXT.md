# Phase 7: Constants Removal + i18n Audit - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** --auto (autonomous discuss; all gray areas resolved from REQUIREMENTS, ROADMAP, codebase audit, and Phase 5/6 outputs)

<domain>
## Phase Boundary

Phase 7 is the v1.1 release-gate cleanup phase. Deliverables:

1. Inline the legacy lookup data (`CHARACTER_COUNTRIES` 7-row tag map + `CHARACTER_VIBES` token arrays) into the `lib/character/` consumers, then **delete `frontend/src/constants/character.ts` entirely** (MIGRATE-02).
2. Update `frontend/src/components/ResultViewer.tsx` to render pills from the new structured fields (`charEthnicity` / `charVibe`) with a transient `charCountry` fallback shim verified against a v1.0 board (MIGRATE-03).
3. Verify a v1.0 board with `charCountry: "vn"` / `charVibe: "clean"` loads without console errors, the wizard opens with pre-filled fields, and dispatch produces a v1.0-equivalent prompt (MIGRATE-04 close — A/B parity anchor captured in 05-01-SUMMARY.md and 06-01-SUMMARY.md).
4. Remove the 15 stale legacy `character.country.*` / `character.vibe.*` / `character.gender.*` keys from `en.json` and `tr.json` in the SAME COMMIT as MIGRATE-02 (I18N-02).
5. Final EN+TR parity audit as the v1.1 release gate (I18N-01); confirm no dynamic key construction (I18N-04); confirm no `.toLowerCase()` on identifier strings (I18N-03); confirm no `useTranslation()` in `.ts` files (I18N-04).

**Not in scope:** New features; new components; backend; bumping zod / zustand; preset library or wizard changes (Phase 6 closed those).

**Requirements covered:** MIGRATE-02, MIGRATE-03, MIGRATE-04, I18N-01, I18N-02, I18N-03, I18N-04 (7 of 23 v1.1 requirements; the final 7).

</domain>

<decisions>
## Implementation Decisions

### Constants module replacement strategy (MIGRATE-02)

- **D-01:** Inline the `CHARACTER_COUNTRIES` legacy-country → ethnicity-tag map **directly into `frontend/src/lib/character/migrate.ts`** as a module-level `const LEGACY_COUNTRY_TO_ETHNICITY: Record<string, string>` literal. The map already exists at `migrate.ts:18` but is currently SOURCED from `CHARACTER_COUNTRIES`; Phase 7 makes it stand-alone. The 7 entries are stable and locked (no future flag-codes to add — that boat sailed in v1.0).
- **D-02:** Inline the `CHARACTER_VIBES` vibe-token arrays into a NEW file `frontend/src/lib/character/vibeTokens.ts` (NOT into `buildCharacterPrompt.ts` — keeping prompt assembly thin per existing pattern). Export `VIBE_TOKENS: Record<string, readonly string[]>` mapping vibe-key → token list. `buildCharacterPrompt.ts` imports from this new module. The 6 vibe keys (`clean`, `douyin`, `oldmoney`, `coldgirl`, `kpop`, `casual`) and their token arrays are copied verbatim from `constants/character.ts`.
- **D-03:** **Delete `frontend/src/constants/character.ts` in the same commit as I18N-02** (stale-key removal). Both are tightly coupled — the constants module was the i18n key SOURCE for the legacy display labels.
- **D-04:** Closed-enum string-union types (`GenderKey`, `CountryKey`, `VibeKey`) currently exported by `constants/character.ts` are NO LONGER NEEDED — the new schema-derived types from `lib/character/schema.ts` are authoritative. Phase 7 verifies no remaining importers of these types via grep (and removes any orphan declarations).
- **D-05:** Grep gate: after the constants module is deleted, `grep -rE "CHARACTER_GENDERS|CHARACTER_COUNTRIES|CHARACTER_VIBES|localizedCountryLabel|localizedVibeLabel" frontend/src/` returns ZERO results. Same for `from "../constants/character"` and `from "./constants/character"`. This is the canonical "are we done?" check.

### ResultViewer pill rendering (MIGRATE-03)

- **D-06:** `ResultViewer.tsx:8` import line — REMOVE `localizedCountryLabel` and `localizedVibeLabel` imports.
- **D-07:** `ResultViewer.tsx:656-668` (the two pill render blocks) — replace with i18n-driven structured-field rendering:
  - **Ethnicity pill:** render when `data.charEthnicity` is set OR when `data.charCountry` is set (fallback shim). Display text:
    - If `charEthnicity` matches an ethnicity bucket key (e.g. `"eastAsian"`), display `t("wizard.field.ethnicity.bucket.${key}")` via constant-table lookup (NOT dynamic key construction).
    - If `charEthnicity` is free-text English (e.g. `"Vietnamese"`), display the raw value (English prose; locale-independent on storage; "good enough" for the pill — `ResultViewer` is a read-only viewer not a creator).
    - If only `charCountry` is set (unmigrated edge — defensive), display from a built-in `LEGACY_COUNTRY_LABELS` table inlined in `ResultViewer.tsx`.
  - **Vibe pill:** render when `data.charVibe` is set. Lookup `t("wizard.field.vibe.option.${key}")` via constant-table — same closed-enum keys as Phase 6 wizard (clean, douyin, oldmoney, coldgirl, kpop, casual).
- **D-08:** Backward-compat shim: the inline `LEGACY_COUNTRY_LABELS` map in `ResultViewer.tsx` is a defensive fallback covering the 7 legacy `charCountry` codes. It's a 7-row literal; tiny. Phase 7 keeps it; future phase may delete after all known v1.0 boards have been edited at least once (writes flush migrated fields).
- **D-09:** No new i18n keys for the pills — they reuse Phase 6's `wizard.field.ethnicity.bucket.*` and `wizard.field.vibe.option.*` namespaces. If a v1.0 free-text ethnicity value doesn't match a bucket key, fall through to raw-text rendering (no missing-key crash).

### Legacy i18n key cleanup (I18N-02)

- **D-10:** Remove 15 keys from `en.json` AND `tr.json` in the SAME commit:
  - `character.gender.male`, `character.gender.female` (2)
  - `character.country.vn`, `character.country.jp`, `character.country.kr`, `character.country.cn`, `character.country.th`, `character.country.us`, `character.country.fr` (7)
  - `character.vibe.clean`, `character.vibe.douyin`, `character.vibe.oldmoney`, `character.vibe.coldgirl`, `character.vibe.kpop`, `character.vibe.casual` (6)
- **D-11:** `frontend/src/i18n/i18n.ts` `CustomTypeOptions` typed-key declaration — no manual edit needed; types flow from `typeof en` automatically. After D-10, autocomplete for these keys disappears automatically.
- **D-12:** Confirm no remaining `t("character.gender|country|vibe.")` usages anywhere — grep gate before the commit. If any survive, fix them (they would be in code that should have already been migrated by Phase 6).

### Audit + grep gates (I18N-04, I18N-03)

- **D-13:** Grep `t(\`` (dynamic-key template-literal call) in `frontend/src/components/character/`, `frontend/src/store/characterPresets.ts`, `frontend/src/lib/character/` — expect ZERO. This was already a Phase 6 gate; Phase 7 re-runs it as the final discipline check.
- **D-14:** Grep `useTranslation` in `frontend/src/**/*.ts` files (NOT `.tsx`) — expect ZERO. Already a Phase 6 gate; Phase 7 confirms it remains green.
- **D-15:** Grep `.toLowerCase()` and `.toUpperCase()` in `frontend/src/` for any NEW Phase 6/7 string utilities — anywhere they appear on a stable identifier string they MUST be `.toLocaleLowerCase("en-US")` (prevents Turkish dotted-i regression class). Audit:
  - `frontend/src/api/client.ts:18-56` (humanizeBackendError, already audited in v1.0)
  - Any new wizard / preset code
- **D-16:** `node scripts/check-i18n-parity.mjs` MUST exit 0 with EN and TR at identical key counts. This is the FINAL release gate before milestone close.

### v1.0 regression-diff capture (MIGRATE-04 close)

- **D-17:** Capture a regression-diff note in `07-VERIFICATION.md` / `07-01-SUMMARY.md` confirming:
  - Phase 5 A/B parity: passing `{charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean"}` through `buildCharacterPrompt` produces a prompt string identical to v1.0's `buildCharacterPrompt("female", "vn", "clean", "")`. (Both prior SUMMARYs already confirmed; Phase 7 echoes for milestone close.)
  - Hydration path: v1.0 board with `charCountry: "vn"` / `charVibe: "clean"` loads cleanly (3 hydration sites — `loadInitialBoard`, `switchBoard`, `refreshBoardState` — all wrap `migrateCharacterNodeData`).
  - Wizard open: same v1.0 board node opens the wizard with pre-filled `charEthnicity: "Vietnamese"` + `charVibe: "clean"`.
  - ResultViewer: pills render correctly for both new (`charEthnicity` driven) and legacy-only (`charCountry` shim path) nodes.
  - i18n: EN+TR final key count after stale removal; parity script exits 0.

### Discretion delegations

- Whether to keep the legacy `charCountry` / `charVibe` / `charGender` fields on `FlowboardNodeData` (interface side) — RECOMMENDATION: KEEP `charCountry` (still on persisted v1.0 board rows; migrate-on-read populates `charEthnicity` but `charCountry` survives on the backend forever unless the user triggers a write). KEEP `charVibe` and `charGender` as live fields — they are part of the new schema (didn't change names). Phase 7 only deletes the legacy LOOKUP DATA (constants module), not the data model field names.
- Inlining `LEGACY_COUNTRY_LABELS` into `ResultViewer.tsx` vs. moving to a new `lib/character/legacyLabels.ts` — RECOMMENDATION: inline (7 rows, only one consumer); future scope can move it out if a second consumer surfaces.
- Whether to remove the entire `defer to native-speaker review` TR-02 v1.0 deferred item from PROJECT.md as part of Phase 7's audit pass — DEFER (separate concern; v1.1 doesn't promise this).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / requirements
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md` — MIGRATE-02..04, I18N-01..04 + Out of Scope
- `.planning/ROADMAP.md` §"Phase 7" — 4 success criteria load-bearing

### Phase 5 + 6 outputs (Phase 7 builds on)
- `.planning/phases/05-data-model-migration-foundation/05-01-SUMMARY.md` — A/B parity note (anchor for D-17)
- `.planning/phases/06-wizard-ui-preset-library/06-01-SUMMARY.md` — wizard, preset library, refreshBoardState wrap, 102 i18n keys added (final EN/TR 526 each)
- `.planning/phases/06-wizard-ui-preset-library/06-VERIFICATION.md` — Phase 6 inline gap fix (CharacterWizard seeding, commit 685d810)

### Research outputs
- `.planning/research/SUMMARY.md`
- `.planning/research/PITFALLS.md` #3 (label helpers deleted before all call sites updated), #12 (variant-edge pill regression), #8 (i18n parity break), #13 (Turkish dotted-I regression)

### Codebase canonical files
- `frontend/src/constants/character.ts` — DELETE TARGET
- `frontend/src/components/ResultViewer.tsx` — line 8 import, lines 656–668 pill render blocks
- `frontend/src/lib/character/migrate.ts` — inline `LEGACY_COUNTRY_TO_ETHNICITY` map (already in shape)
- `frontend/src/lib/character/buildCharacterPrompt.ts` — switch to `vibeTokens.ts` import
- `frontend/src/i18n/locales/en.json` — remove 15 keys (lines 176–190 approx)
- `frontend/src/i18n/locales/tr.json` — remove 15 keys at parity
- `frontend/src/i18n/i18n.ts` — typed-key declaration (read; no manual edit needed)
- `scripts/check-i18n-parity.mjs` — final release gate
- `CLAUDE.md` §"Anti-Patterns", §"i18n"

</canonical_refs>

<code_context>
## Existing Code Insights

### Surviving legacy call sites (audited)
- `frontend/src/constants/character.ts` (the module itself)
- `frontend/src/components/ResultViewer.tsx:8,656-668` (pill rendering)
- `frontend/src/lib/character/migrate.ts:9,18` (CHARACTER_COUNTRIES import — to be inlined)
- `frontend/src/lib/character/buildCharacterPrompt.ts:13,43` (CHARACTER_VIBES import — to be moved to vibeTokens.ts)
- `frontend/src/lib/character/schema.ts:75` — COMMENT ONLY referencing CHARACTER_VIBES; harmless but tidy in passing.

### What's NOT a legacy call site (despite name match)
- `frontend/src/store/board.ts` line 87-89 — legacy `charCountry`/`charVibe`/`charGender` fields on FlowboardNodeData interface (keep — backward compat for persisted v1.0 board rows)
- `frontend/src/store/board.ts` lines 299-301, 365-367, 462-464 — hydration casts of those legacy fields (keep — migrateCharacterNodeData reads them)
- Wizard files referencing `charGender` / `charVibe` as live schema fields (these names survived into Phase 6's schema — they are NOT being renamed)

### i18n state after Phase 6
- EN: 526 keys
- TR: 526 keys
- Stale legacy keys: 15 (`character.country.*` 7, `character.vibe.*` 6, `character.gender.*` 2)
- After Phase 7: expected EN: 511, TR: 511 (526 − 15)
- Parity must hold AT EVERY COMMIT through Phase 7.

### Patterns to follow
- `vibeTokens.ts` — single named export `VIBE_TOKENS: Record<string, readonly string[]>` (or stricter typed-key map). Module-level, frozen, no side effects.
- ResultViewer i18n call sites — constant-table lookup pattern (e.g. `const ETHNICITY_LABELS: Record<string, string> = { eastAsian: "wizard.field.ethnicity.bucket.eastAsian", ... }`). NO dynamic key construction.
- Backward-compat shim documented inline with a `// PHASE 7 SHIM:` comment so a future cleanup can grep-and-remove.

### Constraints to honor
- TS strict (`tsc -b --noEmit`)
- `node scripts/check-i18n-parity.mjs` exit 0 at every commit, hardest gate at phase close
- No backend changes
- No new dependencies
- No regression in v1.0 board loading (3 hydration sites STILL wrapped; migration STILL active)
- No new component files (Phase 7 is a deletion + audit phase)

</code_context>

<specifics>
## Specific Ideas

- The `LEGACY_COUNTRY_LABELS` shim in ResultViewer should use ENGLISH labels (the i18n-keyed pill is for migrated nodes; the shim is the safety net). Concrete list: `{ vn: "Vietnamese", jp: "Japanese", kr: "Korean", cn: "Chinese", th: "Thai", us: "American", fr: "French" }` — matches the 7-entry migration map.
- Phase 7 commits should be atomic per task:
  1. `feat(07): move vibe tokens to lib/character/vibeTokens.ts` — buildCharacterPrompt imports from new file
  2. `feat(07): inline legacy country→ethnicity map into migrate.ts` — migrate.ts no longer imports CHARACTER_COUNTRIES
  3. `feat(07): update ResultViewer to render pills from new structured fields with legacy shim` — imports gone, new i18n keys used
  4. `feat(07): delete constants/character.ts and 15 legacy i18n keys` — atomic delete + key cleanup in same commit (MIGRATE-02 + I18N-02 coupled)
  5. `docs(07): summary + grep gates + final parity audit`
- The verification rubric for MIGRATE-04 close requires a 5-line bash script run + capture in SUMMARY:
  ```bash
  grep -rE "CHARACTER_GENDERS|CHARACTER_COUNTRIES|CHARACTER_VIBES|localizedCountryLabel|localizedVibeLabel" frontend/src/
  grep -rE 'from "(.\.\.\/)*constants/character"' frontend/src/
  grep -rE "t\(\`" frontend/src/components/character/ frontend/src/store/characterPresets.ts frontend/src/lib/character/
  grep -rE "useTranslation" --include='*.ts' frontend/src/
  node scripts/check-i18n-parity.mjs
  ```
  All five expect 0 / empty / exit 0.

</specifics>

<deferred>
## Deferred Ideas

- Removing legacy `charCountry` / `charVibe` / `charGender` fields from `FlowboardNodeData` interface — defer to a future cleanup phase only AFTER known v1.0 boards are confirmed migrated and there's no reachable read path. Risk is too high to do in v1.1.
- Native-speaker Turkish refinement pass (v1.0 TR-02) — separate concern, carried in PROJECT.md.
- The 4 browser-UAT items from Phase 5 (VERIFY-01..04-style) + Phase 6 UAT (preset save/reload/rename/delete + 51-cap + corrupt blob + ESC discard + v1.0 prefill) — these accumulate in VERIFICATION.md as the milestone close artifact. Maintainer manual pass.
- Deleting the `LEGACY_COUNTRY_LABELS` ResultViewer shim — defer until next milestone after observed zero hits in production telemetry (which we don't have — it's a local app, so defer by time/judgment).
- Renaming or restructuring the wizard's i18n key namespace — out of scope; freeze.

</deferred>

---

*Phase: 7-constants-removal-i18n-audit*
*Context gathered: 2026-06-17*
*Mode: --auto (one-pass autonomous)*
