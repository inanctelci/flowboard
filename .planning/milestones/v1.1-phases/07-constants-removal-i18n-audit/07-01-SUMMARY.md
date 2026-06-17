---
phase: "07"
plan: "07-01"
subsystem: "frontend/i18n"
tags: [constants-removal, i18n-cleanup, migrate-02, migrate-03, migrate-04, i18n-01, i18n-02, i18n-03, i18n-04]
dependency_graph:
  requires: [05-01, 06-01]
  provides: [v1.1-milestone-close]
  affects: [frontend/src/constants, frontend/src/lib/character, frontend/src/components/ResultViewer.tsx, frontend/src/i18n]
tech_stack:
  added: []
  patterns:
    - constant-table i18n lookup (no dynamic key construction)
    - PHASE 7 SHIM pattern for backward-compat legacy data
key_files:
  created:
    - frontend/src/lib/character/vibeTokens.ts
  modified:
    - frontend/src/lib/character/buildCharacterPrompt.ts
    - frontend/src/lib/character/migrate.ts
    - frontend/src/components/ResultViewer.tsx
    - frontend/src/i18n/locales/en.json
    - frontend/src/i18n/locales/tr.json
  deleted:
    - frontend/src/constants/character.ts
decisions:
  - "Vibe tokens inlined verbatim into vibeTokens.ts (A/B parity load-bearing)"
  - "LEGACY_COUNTRY_TO_ETHNICITY made standalone literal in migrate.ts (7 entries, locked)"
  - "ResultViewer pills use constant-table i18n lookup pattern (no dynamic keys)"
  - "LEGACY_COUNTRY_LABELS shim retained in ResultViewer.tsx for v1.0 board safety"
  - "constants/character.ts deletion atomic with 15-key i18n removal (same commit)"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-17T00:33:23Z"
  tasks_completed: 5
  files_changed: 7
---

# Phase 7 Plan 07-01: Constants Removal + i18n Audit Summary

**One-liner:** Delete legacy constants/character.ts, inline lookup data, update ResultViewer to render pills from new structured fields with backward-compat shim, remove 15 stale i18n keys (EN+TR both at 511 keys). Closes v1.1 milestone.

---

## Per-Step Commit Hashes

| Step | Commit | Message |
|------|--------|---------|
| 1 | `7921a96` | feat(07): move vibe tokens to lib/character/vibeTokens.ts |
| 2 | `4ac9f1c` | feat(07): inline legacy country→ethnicity map into migrate.ts |
| 3 | `55283f6` | feat(07): ResultViewer renders pills from new structured fields with legacy shim |
| 4 | `795c334` | feat(07): delete constants/character.ts + remove 15 stale legacy i18n keys (EN+TR) |
| 5 | (this SUMMARY commit) | docs(07-01): final audit + grep gates + MIGRATE-04 close note |

---

## Final Gate Results

| Gate | Command / Check | Result | Notes |
|------|----------------|--------|-------|
| 1 — TS strict | `cd frontend && npm run lint` | PASS (exit 0) | Zero TS errors after all 4 feature commits |
| 2 — i18n parity | `node scripts/check-i18n-parity.mjs` | PASS (exit 0) | EN=511, TR=511, parity OK |
| 3 — Zero legacy refs | `grep -rE "CHARACTER_GENDERS|CHARACTER_COUNTRIES|CHARACTER_VIBES|localizedCountryLabel|localizedVibeLabel|GenderKey|CountryKey|VibeKey" frontend/src/` | PASS | Only comments remain (schema.ts GenderKey is NEW schema type; vibeTokens.ts/migrate.ts comments reference deleted source) |
| 4 — No dynamic i18n keys | `grep -rE "t\(\`" frontend/src/components/character/ frontend/src/store/characterPresets.ts frontend/src/lib/character/` | PASS (zero results) | Constant-table pattern used throughout |
| 5 — No useTranslation in .ts | `grep -rE "useTranslation" --include='*.ts' frontend/src/` | PASS* | Only match is JSDoc comment in i18n.ts (line 11); no actual hook calls or imports in .ts files |
| 6 — No toLowerCase/toUpperCase | `grep -rE "\.toLowerCase()\|\.toUpperCase()" frontend/src/components/character/ frontend/src/store/characterPresets.ts frontend/src/lib/character/` | PASS (zero results) | No new string-identifier lowercasing in Phase 6/7 code |
| 7 — Migration sites wrapped | `grep -cE "migrateCharacterNodeData\(" frontend/src/store/board.ts frontend/src/store/pipeline.ts` | PASS (count=3) | loadInitialBoard, switchBoard, refreshBoardState all wrap migrate |

*Gate 5 note: `grep -rE "useTranslation" --include='*.ts'` matches the JSDoc comment `* - In React components: const { t } = useTranslation()` at `i18n.ts:11`. This is documentation text, not a hook call. Refined grep for actual imports/calls returns zero results.

---

## Final EN/TR Key Counts

| Locale | Count | Delta from Phase 6 |
|--------|-------|-------------------|
| en.json | 511 | −15 (removed stale character.* keys) |
| tr.json | 511 | −15 (matching removal) |
| Parity | OK | EN == TR |

Stale keys removed (15 total):
- `character.gender.male`, `character.gender.female` (2)
- `character.country.vn`, `character.country.jp`, `character.country.kr`, `character.country.cn`, `character.country.th`, `character.country.us`, `character.country.fr` (7)
- `character.vibe.clean`, `character.vibe.douyin`, `character.vibe.oldmoney`, `character.vibe.coldgirl`, `character.vibe.kpop`, `character.vibe.casual` (6)

---

## MIGRATE-04 Close Note

### A/B Parity (restated from Phase 5 + 6 SUMMARYs)

`buildCharacterPrompt({ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" })` produces byte-identical output to v1.0's `buildCharacterPrompt("female", "vn", "clean", "")`. The vibe tokens in `VIBE_TOKENS["clean"]` were copied verbatim from the deleted `CHARACTER_VIBES[0].tokens`. Token order is frozen (D-10). The `resolveVibeTokens()` function now uses `VIBE_TOKENS[vibe] ?? []` instead of the former array `.find().tokens` — same result for all 6 known vibe keys.

### Hydration Sites Still Wrapped

All 3 hydration sites confirmed wrapped (Gate 7: count=3):
1. `board.ts:loadInitialBoard` — wraps `migrateCharacterNodeData()` on every node
2. `board.ts:switchBoard` — wraps `migrateCharacterNodeData()` on every node
3. `pipeline.ts:refreshBoardState` — wraps `migrateCharacterNodeData()` on every node

### Migration Logic (hand-walked check, Step 2)

Passing `{ charCountry: "vn" }` through `migrateCharacterNodeData()`:
- `charEthnicity` is undefined → migration executes
- `LEGACY_COUNTRY_TO_ETHNICITY["vn"]` = `"Vietnamese"`
- Returns `{ charCountry: "vn", charEthnicity: "Vietnamese" }`

`charCountry` preserved on returned object (backend row still carries it; D-22 constraint).

### ResultViewer Pills — Render Coverage

Three render paths verified via code trace:

1. **New v1.1 node with `charEthnicity: "eastAsian"`**
   - `ETHNICITY_BUCKET_I18N["eastAsian"]` = `"wizard.field.ethnicity.bucket.eastAsian"`
   - `ethnicityLabel(t, "eastAsian", undefined)` → `t("wizard.field.ethnicity.bucket.eastAsian")`
   - EN: "East Asian", TR: localized

2. **New v1.1 node with `charEthnicity: "Vietnamese"` (free-text)**
   - Not in `ETHNICITY_BUCKET_I18N` map
   - `charEthnicity.trim().length > 0` → returns `"Vietnamese"` raw string
   - Language-independent (English prose stored on node.data)

3. **Legacy v1.0 node with `charCountry: "vn"` only (not yet hydrated)**
   - `charEthnicity` is undefined → falls through both checks
   - `LEGACY_COUNTRY_LABELS["vn"]` = `"Vietnamese"`
   - Renders `"Vietnamese"` via PHASE 7 SHIM path

Vibe pill: `vibeLabel(t, "clean")` → `t("wizard.field.vibe.option.clean")` (EN: "Clean Girl"; TR: localized).

### i18n Parity

EN+TR both at 511 keys. `node scripts/check-i18n-parity.mjs` exits 0. Release gate passed.

---

## Deviations from Plan

None — plan executed exactly as written.

Step 3 note: The plan cited ResultViewer lines 656-668 for the pill blocks. After Step 3's constant-table additions were inserted above the `ICON` constant (adding ~62 lines), the actual pill block location shifted to lines 719-734. The edit was made using exact string matching rather than line numbers, so the shift caused no issues.

---

## Known Stubs

None. All data sources wired. `LEGACY_COUNTRY_LABELS` shim is intentional (documented as PHASE 7 SHIM; deferred removal per CONTEXT.md deferred section).

---

## Threat Flags

None. Phase 7 is a pure deletion + audit phase — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

---

## Self-Check

Checking created files and commits...

- vibeTokens.ts: FOUND
- constants/character.ts: DELETED (expected)
- commit 7921a96 (Step 1): FOUND
- commit 4ac9f1c (Step 2): FOUND
- commit 55283f6 (Step 3): FOUND
- commit 795c334 (Step 4): FOUND

## Self-Check: PASSED
