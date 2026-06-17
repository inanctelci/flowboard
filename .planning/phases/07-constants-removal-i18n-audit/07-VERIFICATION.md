---
phase: 07-constants-removal-i18n-audit
verified: 2026-06-17T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a v1.0 board whose character nodes still carry charCountry: 'vn' and charVibe: 'clean' (pre-migration state — no charEthnicity populated) and open one such node in the ResultViewer"
    expected: "The ResultViewer renders a 'Vietnamese' ethnicity pill via the LEGACY_COUNTRY_LABELS shim (PHASE 7 SHIM code path) and a localized vibe pill (EN: 'Clean Girl'; TR: equivalent) — no console errors, no missing-key warnings"
    why_human: "The LEGACY_COUNTRY_LABELS shim is exercised only when charEthnicity is absent from the persisted row; grep cannot confirm live browser execution of that branch"
  - test: "Switch the app to Turkish locale (Settings → Language → Türkçe) and open a v1.1 character node with charEthnicity: 'eastAsian' and charVibe: 'clean' in the ResultViewer"
    expected: "The ethnicity pill renders the Turkish translation for 'East Asian' and the vibe pill renders the Turkish translation for 'Clean Girl'; both pulled from tr.json via the constant-table i18n lookup; no raw i18n key strings appear in the UI"
    why_human: "TR locale rendering requires a live browser with the language picker set to Turkish; grep cannot verify that the TR translations are semantically correct"
---

# Phase 7: Constants Removal + i18n Audit Verification Report

**Phase Goal:** Legacy character preset constants are deleted with zero call-site survivors, ResultViewer renders pills correctly for both old and new board nodes, and the full EN+TR key catalog is audited as the v1.1 release gate
**Verified:** 2026-06-17
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `grep` for CHARACTER_COUNTRIES / CHARACTER_VIBES / CHARACTER_GENDERS / localizedCountryLabel / localizedVibeLabel in `frontend/src/` returns zero live references | VERIFIED | Three matches found — all are JSDoc/comment lines inside `migrate.ts`, `schema.ts`, and `vibeTokens.ts`; zero executable import or call-site references |
| 2 | v1.0 board pill render path traces correctly for all three cases (charEthnicity bucket key → i18n, charEthnicity free-text → raw, charCountry only → LEGACY shim) | VERIFIED | Code trace confirmed in `ResultViewer.tsx` lines 47-71 and 719-741: `ethnicityLabel()` implements all three branches in correct priority order, wired via IIFE in JSX |
| 3 | `node scripts/check-i18n-parity.mjs` exits 0; EN=TR=511; no legacy `character.country.*` / `character.vibe.*` / `character.gender.*` keys remain | VERIFIED | Script run confirmed exit code 0, "511 keys, parity OK"; grep for `"character.(country|vibe|gender)\.` returns zero results in both locale files |
| 4 | Zero `t(\`...\`)` dynamic key construction in character/wizard/preset code; zero `useTranslation()` in `.ts` files | VERIFIED | Grep for dynamic template literals returns zero results in scoped paths; `useTranslation` in `.ts` files returns one match — a JSDoc comment in `i18n.ts:11`, not a live import or call |

**Score:** 4/4 truths verified

---

### Structural Checks

| Check | Status | Evidence |
|-------|--------|----------|
| `frontend/src/constants/character.ts` does not exist | VERIFIED | `test -f` returns FILE_DELETED; `ls frontend/src/constants/` returns empty directory |
| `vibeTokens.ts` exists; exports `VIBE_TOKENS` with 6 keys (clean, douyin, oldmoney, coldgirl, kpop, casual) | VERIFIED | File exists at `frontend/src/lib/character/vibeTokens.ts`; 6 keys confirmed; each has exactly 4 token strings |
| `buildCharacterPrompt.ts` imports `VIBE_TOKENS` from `./vibeTokens`; no import from `../../constants/character` | VERIFIED | Line 13: `import { VIBE_TOKENS } from "./vibeTokens"`. Zero imports from constants/character anywhere in frontend/src/ |
| `migrate.ts` has standalone `LEGACY_COUNTRY_TO_ETHNICITY` (7 entries); no CHARACTER_COUNTRIES import | VERIFIED | Lines 17-25 show the 7-entry literal (vn/jp/kr/cn/th/us/fr); no import from constants/character |
| `ResultViewer.tsx` has `LEGACY_COUNTRY_LABELS` (7 entries) + `ETHNICITY_BUCKET_I18N` (10 entries) + `VIBE_OPTION_I18N` (6 entries) | VERIFIED | Lines 11-45 of ResultViewer.tsx; all three tables present with correct entry counts |
| `FlowboardNodeData` in `board.ts` retains `charCountry?`, `charVibe?`, `charGender?` | VERIFIED | Lines 87-89 of board.ts; all three optional fields present per CONTEXT.md deferred decision |
| All 3 hydration sites wrap `migrateCharacterNodeData` | VERIFIED | board.ts lines 284, 350, 447 (`loadInitialBoard`, `switchBoard`, `refreshBoardState`); pipeline.ts delegates through `refreshBoardState()` — count=3 in board.ts is correct |
| `grep -rn 'from.*constants/character' frontend/src/` returns zero | VERIFIED | Only comment-text matches in migrate.ts and vibeTokens.ts (JSDoc); zero executable imports |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/lib/character/vibeTokens.ts` | NEW file; exports VIBE_TOKENS 6-key map | VERIFIED | Exists; 6 keys with 4 token strings each; `as const` export |
| `frontend/src/lib/character/buildCharacterPrompt.ts` | Imports from ./vibeTokens, not constants/character | VERIFIED | Line 13 import confirmed; uses `VIBE_TOKENS[vibe] ?? []` |
| `frontend/src/lib/character/migrate.ts` | Standalone LEGACY_COUNTRY_TO_ETHNICITY (7 entries) | VERIFIED | Lines 17-25; no constants/character import |
| `frontend/src/components/ResultViewer.tsx` | Three constant tables + two helper functions + pill IIFE render | VERIFIED | All present; lines 9-71 (tables + helpers); lines 719-741 (pill render) |
| `frontend/src/i18n/locales/en.json` | 511 keys; 15 stale keys removed | VERIFIED | 511 keys confirmed by parity script and direct grep count |
| `frontend/src/i18n/locales/tr.json` | 511 keys; parity with EN | VERIFIED | 511 keys confirmed; parity script exits 0 |
| `frontend/src/constants/character.ts` | DELETED | VERIFIED | File does not exist; constants/ directory empty |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `buildCharacterPrompt.ts` | `vibeTokens.ts` | `import { VIBE_TOKENS }` | WIRED | Line 13; `resolveVibeTokens()` uses `VIBE_TOKENS[vibe] ?? []` |
| `migrate.ts` | standalone literal | inlined `LEGACY_COUNTRY_TO_ETHNICITY` | WIRED | No external dependency; literal at lines 17-25 |
| `ResultViewer.tsx` | `en.json`/`tr.json` | `t(ETHNICITY_BUCKET_I18N[key])` + `t(VIBE_OPTION_I18N[key])` | WIRED | Constant-table lookup pattern; no dynamic key construction |
| `ResultViewer.tsx` | `migrate.ts` shim | `LEGACY_COUNTRY_LABELS` (inline) | WIRED | Inline 7-entry table in ResultViewer; used in `ethnicityLabel()` fallback |
| `board.ts` + `pipeline.ts` | `migrate.ts` | `migrateCharacterNodeData()` | WIRED | 3 call sites in board.ts; pipeline.ts delegates via `refreshBoardState()` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `ResultViewer.tsx` pill render | `data.charEthnicity` / `data.charCountry` / `data.charVibe` | `useBoardStore` → `useGenerationStore` via `openViewer` | Real node.data from backend; migrated on hydration | FLOWING |
| `ethnicityLabel()` | `ETHNICITY_BUCKET_I18N[charEthnicity]` | Constant table → `t()` → i18next | Real i18n string from locale JSON | FLOWING |
| `vibeLabel()` | `VIBE_OPTION_I18N[charVibe]` | Constant table → `t()` → i18next | Real i18n string from locale JSON | FLOWING |
| LEGACY_COUNTRY_LABELS fallback | `charCountry` (v1.0 node) | Hardcoded English labels (intentional shim — not a stub) | English label for the 7 legacy country codes | FLOWING (by design) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TS strict mode compiles clean | `cd frontend && npm run lint` | exit 0; zero errors | PASS |
| i18n parity script | `node scripts/check-i18n-parity.mjs` | exit 0; EN=511, TR=511 | PASS |
| No legacy symbol references (live) | `grep -rE "CHARACTER_COUNTRIES|CHARACTER_VIBES|CHARACTER_GENDERS|localizedCountryLabel|localizedVibeLabel" frontend/src/` | 3 comment-only matches | PASS |
| No constants/character imports | `grep -rn 'from.*constants/character' frontend/src/` | 2 JSDoc comment matches only | PASS |
| No stale character.* locale keys | `grep -E '"character\.(country|vibe|gender)\.' frontend/src/i18n/locales/*.json` | ZERO results | PASS |
| No dynamic t() key construction (character scope) | `grep -rE "t\(\x60" frontend/src/components/character/ frontend/src/store/characterPresets.ts frontend/src/lib/character/` | ZERO results | PASS |
| No useTranslation in .ts files (live) | `grep -rE "useTranslation" --include='*.ts' frontend/src/` | 1 match: JSDoc comment in i18n.ts:11 — not a live call | PASS |
| No toLowerCase/toUpperCase in new character code | `grep -rE "\.toLowerCase\(\)|\.toUpperCase\(\)" frontend/src/components/character/ frontend/src/store/characterPresets.ts frontend/src/lib/character/` | ZERO results | PASS |
| Hydration sites still wrapped | `grep -cE "migrateCharacterNodeData\(" frontend/src/store/board.ts frontend/src/store/pipeline.ts` | board.ts: 3, pipeline.ts: 0 (delegates via refreshBoardState) | PASS |
| constants/character.ts deleted | `test -f frontend/src/constants/character.ts` | FILE_DELETED | PASS |
| All 5 Phase 7 commits present | `git log --oneline 7921a96 4ac9f1c 55283f6 795c334 b2196fb` | All 5 returned | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MIGRATE-02 | 07-01 | Legacy constants deleted; grep gate passes | SATISFIED | constants/character.ts absent; grep returns zero live references |
| MIGRATE-03 | 07-01 | ResultViewer reads pills from new structured fields with charCountry fallback shim | SATISFIED | Code trace confirms 3-branch ethnicityLabel() + vibeLabel() wired in JSX |
| MIGRATE-04 | 07-01 | v1.0 board loads cleanly; wizard prefill; A/B parity captured | SATISFIED (with human caveat) | Code paths verified; A/B parity captured in SUMMARY; browser run is the human UAT item |
| I18N-01 | 07-01 | EN+TR parity at 511 keys; parity script exits 0 | SATISFIED | Script confirmed exit 0; EN=TR=511 |
| I18N-02 | 07-01 | 15 stale keys removed atomically with MIGRATE-02 (same commit 795c334) | SATISFIED | grep confirms zero character.country/vibe/gender keys in both locale files |
| I18N-03 | 07-01 | No toLowerCase/toUpperCase on identifier strings in new code | SATISFIED | grep returns ZERO results in character/wizard/preset scope |
| I18N-04 | 07-01 | No dynamic key construction; no useTranslation() in .ts files | SATISFIED | Zero dynamic template literal matches in scoped paths; useTranslation match is a JSDoc comment |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/i18n/locales/en.json` | 124 | `"node.note_placeholder": "Note, TODO, label…"` | Info | The string "TODO" is part of a UI placeholder label value (shown to user), not a code debt marker. The key name includes "placeholder" — this is an intentional UX copy string, not a developer debt marker. Not a blocker. |

No BLOCKER debt markers found. The single "TODO" match is inside a locale JSON string value that is user-facing copy, not a code comment.

---

### Probe Execution

Step 7c: SKIPPED — no probe scripts defined for Phase 7 (deletion + audit phase; no runnable probes declared in PLAN or conventional scripts/tests/probe-*.sh path).

---

### Human Verification Required

#### 1. v1.0 Legacy Board Pill Rendering (LEGACY_COUNTRY_LABELS shim path)

**Test:** Open a character node that was created under v1.0 (i.e. it has `charCountry: "vn"` in node.data but no `charEthnicity` field) in the ResultViewer. This requires either a real pre-migration board from a SQLite snapshot or temporarily patching a node to remove its `charEthnicity`.
**Expected:** The ResultViewer renders "Vietnamese" in the ethnicity pill via the LEGACY_COUNTRY_LABELS shim path. No console errors. No i18n missing-key warnings. The vibe pill renders correctly for `charVibe: "clean"` (EN: "Clean Girl").
**Why human:** The LEGACY_COUNTRY_LABELS shim executes only when `charEthnicity` is absent. After migration runs in `loadInitialBoard`, most nodes will have `charEthnicity` populated — the shim branch may never fire in normal testing unless the test specifically exercises the pre-migration code path. Grep cannot verify live execution of this branch.

#### 2. Turkish Locale Character Pill Spot-Check

**Test:** Switch the app to Turkish locale via Settings → Language → Türkçe. Open a v1.1 character node with `charEthnicity: "eastAsian"` and `charVibe: "clean"` in the ResultViewer.
**Expected:** Ethnicity pill shows the Turkish translation for "East Asian" and vibe pill shows the Turkish translation for "Clean Girl". No raw i18n key strings appear in the UI. Pill content is semantically accurate Turkish.
**Why human:** TR locale rendering requires live browser execution with the language picker set to Turkish. Grep can confirm TR keys exist in tr.json (confirmed: 511 keys at parity) but cannot verify that translations are semantically correct or that the locale-switcher correctly propagates to the ResultViewer pill render path at runtime.

---

### Gaps Summary

No automated gaps. All 4 observable truths VERIFIED. All 7 requirements SATISFIED by static analysis. The 2 human verification items concern live browser rendering of (a) the LEGACY_COUNTRY_LABELS shim path and (b) TR locale pills — both are read-only UAT checks that cannot fail the TypeScript build or parity script.

---

### Note on Gate 7 Interpretation

The SUMMARY's Gate 7 grep command (`grep -cE "migrateCharacterNodeData\(" frontend/src/store/board.ts frontend/src/store/pipeline.ts`) reported "count=3". Verification confirmed board.ts has 3 direct calls (lines 284, 350, 447: `loadInitialBoard`, `switchBoard`, `refreshBoardState`). `pipeline.ts` has 0 direct calls — it delegates to `refreshBoardState()` via `useBoardStore.getState().refreshBoardState()` (pipeline.ts lines 30 and 59). The 3-site coverage claim is correct; the pipeline.ts count=0 is expected because it is an indirect caller.

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
