# Project Research Summary

**Project:** Flowboard v1.1 — Character Creation Rework
**Domain:** Guided character-creation wizard + saveable preset library for AI image generation
**Researched:** 2026-06-16
**Confidence:** HIGH

## Executive Summary

Flowboard v1.1 replaces a frozen 3-axis character preset picker (2 genders, 7 Asian nationalities with Vietnamese labels, 6 vibe presets) with a guided multi-step wizard producing structured, reusable character configurations. The rework is frontend-only: all four research tracks confirm that zero backend schema changes are needed — structured fields land as flat `char*` keys on the existing `node.data` JSON column via the existing shallow-merge PATCH contract, and the character preset library is persisted via `zustand/middleware/persist` + `localStorage`, not the Reference table.

The recommended architecture is: wizard mounts inside the existing `GenerationDialog` by replacing the `{isCharacter && (...)}` block with a `<CharacterWizard>` component; transient wizard form state lives in local `useState` inside that component; the saved-preset library lives in a new `characterPresets.ts` Zustand slice with localStorage persistence; and data migration runs convert-on-read in the board hydration path (`charCountry → charEthnicity` via `CHARACTER_COUNTRIES[n].tag` mapping), never as a thundering-herd of PATCHes on startup. The sole new runtime dependency is Zod 4, added narrowly for runtime parsing of `CharacterConfig` blobs loaded from localStorage.

The top risks are (1) accidentally sending a full `node.data` blob from the wizard submit — this silently deletes `mediaId`, `aiBrief`, and every other non-character field on the node; (2) storing translated display labels as data values in `node.data` instead of stable English keys — this makes boards locale-sensitive and breaks the prompt assembler on non-English installs; and (3) letting `localizedCountryLabel` / `localizedVibeLabel` disappear before all their call sites are updated, making old boards show blank pills with no error. All three are fully preventable by following the established project patterns documented in `CLAUDE.md`.

## Key Findings

### Recommended Stack

The existing React 18.3 + TypeScript 5.6 strict + Vite 5.4 + Zustand 5 + react-i18next 17 stack requires only one new dependency. All wizard layout needs are met by the existing `styles.css` hand-rolled modal/chip-row patterns. The `zustand/middleware/persist` module ships bundled with Zustand 5 and requires no install. Zod 4 is added for one narrow purpose: runtime parsing of `CharacterConfig` blobs coming back from `localStorage` so corrupt or migration-mismatched data is caught rather than silently accepted as `unknown`.

**Core technologies:**
- `zustand/middleware/persist` (already bundled): preset library persistence to `localStorage` under a versioned key (`flowboard.character.presets.v1`) with `partialize` to exclude transient state
- `zod@4.4.3` (new, `npm install zod`): `CharacterConfigSchema` as single source of truth; derive the `CharacterConfig` TypeScript type via `z.infer<>` so type and runtime validator stay in sync
- Hand-rolled `useState` inside `CharacterWizard`: wizard step and form state — transient, discarded on close, not a Zustand slice
- `lib/character/buildCharacterPrompt.ts`: pure function module for prompt assembly, following the existing `lib/storyboardPrompt.ts` pattern

**Explicitly excluded:** React Hook Form, Formik, Yup, Valibot, idb-keyval, Radix UI, Headless UI, react-aria, any stepper library. Every exclusion is grounded in the project's established hand-rolled patterns and the fact that wizard fields are button chips (not `<input>` elements) with a fixed, short field set.

### Expected Features

**Must have (table stakes) — v1.1 launch:**
- Gender selector: 3 options (Male / Female / Non-binary), toggle-to-deselect
- Ethnicity: regional buckets (8–10 regions) + free-text override — replaces the 7-nationality `charCountry` picker
- Age range: 6 buckets (Teenager / Young Adult / Adult / Middle-aged / Mature / Senior) mapping to discrete prompt tokens
- Hair: two chip rows (color + style)
- Vibe / aesthetic: keep existing 6 named vibes, internationalize labels, make config-driven
- Expression: 5 options (Neutral / Soft smile / Confident / Thoughtful / Custom) — peeled out of vibe tokens to avoid duplication
- Extras textarea: preserved as freeform escape hatch (200 chars)
- Updated `buildCharacterPrompt` assembling from new field set with framing anchors preserved and expression decoupled from vibe token arrays
- Backfill migration: existing nodes with `charCountry` / `charVibe` load without console errors
- Named character library: "Save to library" action persists structured config as a named entry in localStorage-backed Zustand slice
- i18n: all new wizard strings in `en.json` + `tr.json` at parity; `check-i18n-parity.mjs` stays green

**Should have (competitive differentiators) — v1.x after validation:**
- Outfit as a distinct structured field: decouples aesthetic from clothing, enabling "K-Pop vibe + business formal" combinations the current system cannot express
- Rendered prompt preview toggle: collapsible read-only display of the assembled token string — unique transparency among comparable tools (OpenArt, Midjourney, Higgsfield all hide the prompt)

**Defer (v2+):**
- AI-assisted field inference from photo upload (vision service exists; connecting it to wizard is a separate milestone)
- Character variation system (lock/unlock per-field for batch variation)
- Lighting as a distinct user-facing field (currently encoded in vibe tokens; requires further vibe token refactoring)
- Expanded ethnicity multi-select (~20 named options); trigger: users report regional buckets are too coarse

**Anti-features confirmed by research (do not build):**
- 5+ step wizard with full-screen experience per step — claustrophobic inside the existing dialog; fields are not logically gated by prior answers
- 100+ country dropdown — any enumerated list will offend by omission; free-text + regional buckets is more expressive
- Real-time image preview on field change — consumes generation credits per interaction
- Per-field locking (Midjourney `--cw` style) — adds cognitive overhead; variants handle variation

### Architecture Approach

The wizard integrates into the existing `GenerationDialog` rather than as a second modal, replacing the `{isCharacter && (...)}` inline block with `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />`. This reuses the dialog's backdrop, focus trap, ESC handler, and the existing `generationStore.openGenerationDialog()` trigger path from `NodeCard.CharacterBody`. The wizard calls `dispatchGeneration()` and `closeGenerationDialog()` directly at the end — same boundary as the existing character branch. Preset library UI lives inside the wizard (not in `ReferencesPanel`) because presets are configuration, not media.

**Major components:**
1. `lib/character/buildCharacterPrompt.ts` — pure function; assembles prompt from `CharacterConfig`; owns framing anchors and negatives at fixed positions; never user-editable
2. `lib/character/migrate.ts` — pure function `migrateCharacterNodeData()`; maps `charCountry → charEthnicity` on read; called once per node in `loadInitialBoard`'s node-mapping step
3. `store/characterPresets.ts` — Zustand slice with `zustand/middleware/persist`; persists only `presets: CharacterPreset[]` (partialize excludes transient state); cap at 50 presets with error-slot warning
4. `components/character/CharacterWizard.tsx` — multi-step component; transient state in `useState`; steps: Identity → Appearance → Styling → Expression → Review; calls `buildCharacterPrompt` on Review for preview display
5. `components/character/PresetList.tsx` — preset select UI inside wizard Step 0; populates wizard fields from saved `CharacterPreset`

**Modified files (key):**
- `GenerationDialog.tsx`: swap the `{isCharacter && (...)}` block; remove `CHARACTER_COUNTRIES`, `CHARACTER_VIBES` imports and local `buildCharacterPrompt`
- `store/board.ts` (`FlowboardNodeData`): add flat `charEthnicity`, `charAge`, `charHair`, `charSkinTone`, `charOutfit`, `charExpression`, `charLighting` keys; add `charCountry` as deprecated-read-only; call `migrateCharacterNodeData` in hydration path
- `ResultViewer.tsx`: update country/vibe pill rendering to read `charEthnicity` (new) with `charCountry` fallback shim until migration completes

### Critical Pitfalls

1. **Wholesale `node.data` replace from wizard submit** — Send only the wizard field delta (`{ charGender, charEthnicity, ... }`) via `patchNode`. Never reconstruct the full data blob. Verify after submit that `node.data.mediaId` is still present. (PITFALLS #1)

2. **Storing translated display labels as data values** — Store only stable English keys or user-typed English prose in `node.data`. The prompt assembler receives keys it resolves via an English-keyed map, or free-text the user typed. Never call `t("...")` and store the result in the node. (PITFALLS #15)

3. **`null` sentinel vs. `undefined` for cleared fields** — Map explicitly cleared wizard fields to `null` in the PATCH delta (triggers the backend delete-key behavior); fields the user never touched should be omitted entirely. Write a `toDataPatch(wizardState)` helper. (PITFALLS #2)

4. **`localizedCountryLabel` / `localizedVibeLabel` deleted before all call sites updated** — Before deleting any helper from `constants/character.ts`, `grep -r "localizedCountryLabel\|localizedVibeLabel\|charCountry\|charVibe" frontend/src/` and update every hit in the same commit. Keep a backward-compat shim for old nodes until verified. (PITFALLS #3, #12)

5. **i18n parity break — en.json wizard keys without tr.json** — The wizard is the largest single-PR key addition (estimated 40–60 keys). Always add both locale files in the same commit. Run `node scripts/check-i18n-parity.mjs` before every push. (PITFALLS #8)

## Implications for Roadmap

All four research tracks converge on the same build order. Dependencies are hard: the data model must stabilize before wizard UI is built; migration must run before constants are deleted; the preset library is independent of both but blocked by the data model.

### Phase 1: Data Model + Migration Foundation

**Rationale:** Every downstream phase depends on a stable field schema. `FlowboardNodeData`, the `toDataPatch` helper, and the migration function must ship before any wizard UI or library code is written — otherwise wizard UI authors will make ad-hoc field naming decisions that conflict.

**Delivers:** `FlowboardNodeData` extended with new flat `char*` keys; `lib/character/migrate.ts` (convert-on-read in `loadInitialBoard`); `lib/character/buildCharacterPrompt.ts` (pure function, A/B validated against old assembler output); `store/characterPresets.ts` (localStorage-backed Zustand slice); Zod schema for `CharacterConfig`; `npm install zod`

**Addresses:** Structured fields on node.data (P1), backfill migration (P1), prompt assembler update (P1)

**Avoids:** Pitfalls #1 (data replace), #2 (null sentinel), #7 (key collision), #15 (translated data fields)

**Research flag:** Standard patterns — flat key extension + shallow-merge contract is well-documented in existing codebase; no additional research needed

### Phase 2: Wizard UI

**Rationale:** With the data model stable, the wizard UI can be built confidently. The `CharacterWizard` component imports from Phase 1 and writes to `node.data` using the established field schema. Mounting inside `GenerationDialog` is the de-risked path: it reuses all existing modal infrastructure and avoids a second modal layer.

**Delivers:** `components/character/CharacterWizard.tsx` (steps: Identity → Appearance → Styling → Expression → Review); `GenerationDialog.tsx` swapped; existing character inline block deleted; Review step shows `buildCharacterPrompt` preview; wizard validates only minimum viable fields for submit

**Design note:** FEATURES research recommends a single scrollable pane over a strict step-routed wizard, arguing 8–10 independent fields don't benefit from step gating. The user-chosen model is "guided wizard." Reconcile: build a wizard that uses step headers for guidance but never hard-blocks navigation between optional steps. The exact UX (auto-advance, collapsible vs. paginated) is finalized during Phase 2 planning.

**Avoids:** Pitfalls #4 (framing anchors lost), #5 (wizard state lost on close), #6 (multi-step validation trap), #9 (dynamic key anti-pattern), #14 (partial fields in assembler)

**Research flag:** Standard patterns — wizard mount inside existing dialog is directly confirmed by code analysis; no additional research needed

### Phase 3: Preset Library

**Rationale:** The library store is unblocked after Phase 1. The library UI (PresetList, Save flow) requires the wizard shell from Phase 2. Store work can run in parallel with Phase 2; UI integration comes after.

**Delivers:** `components/character/PresetList.tsx` (preset select on wizard Step 0); "Save as preset" flow on Review step; preset rename / delete inside wizard; localStorage quota guard (try/catch → error slot → Toaster); 50-preset cap with warning toast

**Resolved tension:** FEATURES recommended persisting presets to the Reference table with a new `char_config` JSON column. ARCHITECTURE and PITFALLS both identify this as unsafe: the LLM vision service can silently overwrite `ai_brief` at any time (string scalar, no merge), and Reference rows are media-first (no thumbnail, not draggable, broken UX in ReferencesPanel). The milestone constraint "no backend Pydantic/DB schema changes" rules out the Reference table path for v1.1 regardless. **localStorage-backed Zustand slice is the locked decision.** The Reference table approach is the correct future path if cross-device preset sync ever becomes a requirement.

**Avoids:** Pitfalls #10 (library/Reference semantic collision), #11 (localStorage quota silent failure)

**Research flag:** Standard patterns — `zustand/middleware/persist` mirrors existing `references.ts` localStorage usage; no additional research needed

### Phase 4: Constants Removal + ResultViewer Update

**Rationale:** Deleting `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, and legacy label helpers cannot happen before migration is running (Phase 1), wizard UI is live (Phase 2), and all call sites have been updated. The ResultViewer update requires confirming old boards still render pills via the backward-compat shim before the shim is removed.

**Delivers:** `constants/character.ts` stripped of `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, and legacy label helpers; `ResultViewer.tsx` updated to read `charEthnicity` with `charCountry` fallback shim; grep verification checklist passes with zero results outside the migration shim

**Verification gate:** Open a v1.0 board with old `charCountry: "vn"` nodes → ResultViewer pills still render with correct localized labels. Only after this passes is the shim eligible for deletion.

**Avoids:** Pitfalls #3 (shipped board pills disappearing), #12 (variant-edge pill regression)

**Research flag:** Standard patterns — grep-and-update is a mechanical refactor; no research needed

### Phase 5: i18n Coverage

**Rationale:** i18n keys are added per-commit during Phases 2–4 (parity script enforces this), but a dedicated phase consolidates the final audit: remove stale keys from v1.0's `character.*` namespace, verify all new wizard strings have EN + TR entries, and run the full parity check as a release gate.

**Delivers:** `en.json` + `tr.json` extended with ~40–60 new wizard keys; stale `character.country.*` and legacy `character.vibe.*` keys removed; `check-i18n-parity.mjs` exits 0; new string utilities audited for `.toLocaleLowerCase("en-US")` correctness

**Avoids:** Pitfalls #8 (parity break), #9 (dynamic key construction), #13 (Turkish dotted-I regression in new string utilities)

**Research flag:** Established procedure from v1.0 — parity script + TypeScript typed keys is the known-good pattern; no additional research needed

### Phase Ordering Rationale

- **Phase 1 must be first:** `FlowboardNodeData` field names and the `toDataPatch` contract are the shared interface every other phase writes to. Defining them first prevents field-naming divergence between wizard UI and library authors working in parallel.
- **Phase 2 before Phase 3 (UI):** Preset library UI lives inside the wizard shell. The `characterPresets.ts` store (Phase 3) can start in parallel with Phase 2, but UI integration requires the wizard to exist.
- **Phase 4 after Phase 2:** ResultViewer must be updated before the old label helpers can be deleted. Deleting helpers before updating all call sites causes TypeScript errors and broken UI.
- **Phase 5 last:** Final audit of the total key delta across all prior phases. Keys are added incrementally (enforced by parity CI per-commit); Phase 5 is the cleanup and release gate.
- **Convert-on-read migration is locked:** Writing all old nodes on first load creates a thundering herd of requests and a false "board modified" signal. Lazy migration on next user-triggered write is the correct path per both ARCHITECTURE and PITFALLS research.

### Research Flags

Phases with standard patterns (no additional research needed):
- **Phase 1:** Data model extension + shallow-merge contract directly documented in `CLAUDE.md` and verified by ARCHITECTURE code analysis
- **Phase 2:** Dialog mount point confirmed by code analysis; wizard CSS patterns exist in `styles.css`
- **Phase 3:** `zustand/middleware/persist` pattern mirrors existing `references.ts` localStorage usage
- **Phase 4:** Mechanical grep-and-update refactor; no architectural decisions
- **Phase 5:** Established parity CI procedure from v1.0; no new infrastructure

No phases require a research sub-phase (`/gsd-plan-phase --research-phase`). All decisions are grounded in direct code analysis of the existing codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only one new dep (Zod); all other decisions grounded in direct `package.json` + `node_modules` analysis. `zustand/middleware/persist` confirmed to ship with Zustand 5. |
| Features | HIGH | Research grounded in competitor analysis (OpenArt, Midjourney, Higgsfield) and direct code analysis of existing `GenerationDialog` + `character.ts`. Feature boundary is clear and opinionated. |
| Architecture | HIGH | ARCHITECTURE research based on direct code reading of all 10 affected files. Mount point, persistence decision, data flow, and migration path confirmed against live code. |
| Pitfalls | HIGH | PITFALLS research grounded in live codebase reading, references specific line numbers of existing bugs, and connects to v1.0 retrospec patterns. All 15 pitfalls are actionable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Wizard step count UX:** FEATURES recommends a single scrollable pane; the project brief says "guided wizard." These are reconcilable — the roadmapper should spec a wizard with step headers for guidance but no hard-blocking navigation between optional steps. The exact UX (auto-advance, collapsible vs. paginated) should be decided during Phase 2 planning.

- **Expression / vibe token overlap:** Current vibe token arrays bake in expression descriptors. The exact list of expression tokens to strip from each of the 6 vibe arrays must be audited during Phase 2 planning before `buildCharacterPrompt` is finalized. This is a content decision, not an architectural one.

- **TR translations for new keys:** ~40–60 new wizard strings require Turkish translations. Machine-translated placeholders are acceptable as parity-CI-passing stubs at commit time (same model as the 4 deferred items from v1.0), with a native-speaker review pass deferred. This must be explicitly tracked in milestone completion criteria.

## Sources

### Primary (HIGH confidence — direct code analysis)

- `frontend/src/components/GenerationDialog.tsx` — character builder, `buildCharacterPrompt`, dispatch path, reset-on-open pattern
- `frontend/src/canvas/NodeCard.tsx` — `CharacterBody`, modal trigger, `openGenerate` flow
- `frontend/src/store/board.ts` — `FlowboardNodeData` interface, flat `char*` keys, hydration path
- `frontend/src/store/generation.ts` — `dispatchGeneration` signature, store boundary contract
- `frontend/src/store/references.ts` — localStorage persistence pattern (`loadPersistedPanelOpen`)
- `frontend/src/components/ReferencesPanel.tsx` — media-first UX, Reference kind semantics
- `agent/flowboard/routes/nodes.py` — shallow-merge PATCH contract, null-sentinel behavior (lines 76–121)
- `agent/flowboard/db/models.py` — `Reference.ai_brief` field type, `Node.data` JSON column
- `frontend/src/constants/character.ts` — `CHARACTER_COUNTRIES` tags for migration mapping, label helper call sites
- `frontend/src/api/client.ts` — `DataPatch` type, `patchNode` shallow-merge docblock (lines 196–219)
- `CLAUDE.md` — anti-patterns (wholesale replace), naming conventions, store patterns

### Secondary (HIGH confidence — official documentation)

- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — partialize, version, migrate options
- [Zod v4 release notes](https://www.infoq.com/news/2025/08/zod-v4-available) — bundle size, `zod/mini` vs. `zod` tradeoffs
- OpenArt Character Builder (March 2026) — competitor 4-step wizard structure
- Midjourney `--cref` workflows — character reference patterns
- Higgsfield Soul ID — persistent character asset model
- Eleken / UX Planet wizard pattern guides — step-count recommendations for field counts

### Tertiary (MEDIUM confidence — inferred)

- Estimated ~40–60 new i18n keys: derived from field count x string types (label, placeholder, option labels, CTA); actual count depends on wizard step structure finalized in Phase 2 planning

---
*Research completed: 2026-06-16*
*Ready for roadmap: yes*
