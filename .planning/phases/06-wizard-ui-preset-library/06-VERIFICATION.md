---
phase: 06-wizard-ui-preset-library
plan: 06-01
verified: 2026-06-17T12:00:00Z
status: gaps_found
score: 4/5
overrides_applied: 0
gaps:
  - truth: "A v1.0 board node with old charCountry / charVibe opens the wizard with fields pre-filled from the converted values (ROADMAP SC-5, WIZARD-05 second clause)"
    status: failed
    reason: "CharacterWizard initialises config with useState<Partial<CharacterConfig>>({}) — no lazy initialiser, no useEffect, no seeding from board store node data on mount. Every wizard open starts with empty fields regardless of what the node already contains. The PLAN spec for CharacterWizard Step 2.2 says explicitly 'On mount: seed config from board store node data using the keys defined in CharacterConfigSchema.' This was not implemented."
    artifacts:
      - path: "frontend/src/components/character/CharacterWizard.tsx"
        issue: "Line 45: const [config, setConfig] = useState<Partial<CharacterConfig>>({}); — hardcoded empty init. No useEffect or lazy function initialiser reads rfId → board store node → CharacterConfig fields."
    missing:
      - "Add a lazy useState initialiser: useState<Partial<CharacterConfig>>(() => { const node = useBoardStore.getState().nodes.find((n) => n.id === rfId); if (!node?.data) return {}; return { charGender: node.data.charGender, charEthnicity: node.data.charEthnicity, charAge: node.data.charAge, charHair: node.data.charHair, charHairColor: node.data.charHairColor, charHairStyle: node.data.charHairStyle, charSkinTone: node.data.charSkinTone, charVibe: node.data.charVibe, charOutfit: node.data.charOutfit, charExpression: node.data.charExpression, charLighting: node.data.charLighting, charExtras: node.data.charExtras }; })"
      - "The discard-on-cancel requirement (WIZARD-05) is still satisfied by React unmounting the component on ESC/close — no module-level cache is needed. Seeding from node data on first mount does not conflict with WIZARD-05."
human_verification:
  - test: "Open character wizard from a fresh (no prior field values) character node. Confirm all fields appear blank."
    expected: "All chip rows show no selection; text fields empty."
    why_human: "Programmatic state check requires running the React app."
  - test: "Open character wizard, select Gender=Female, Vibe=Clean, then press ESC. Reopen the same node. Confirm wizard fields are blank."
    expected: "All fields blank — discard-on-cancel behavior verified (WIZARD-05)."
    why_human: "Requires browser interaction to confirm state discard on unmount."
  - test: "Once SC-5 seeding gap is fixed: open a v1.0 board node that has charCountry='vn' / charVibe='clean' stored on node.data. Open wizard. Confirm StepIdentity shows Ethnicity chip 'Vietnamese' selected (or free-text) and StepStyling shows Vibe chip 'Clean' selected."
    expected: "Pre-fill from node.data (after migration runs at hydration) visible in wizard fields."
    why_human: "Requires browser + a real v1.0-style board fixture."
  - test: "Navigate through all 5 step tabs (Identity, Appearance, Styling, Expression, Review) without selecting any fields. Confirm no hard-blocking validation, only the Generate button disabled state."
    expected: "All tabs clickable; Generate button disabled until at least one of charEthnicity/charVibe/charExtras is set."
    why_human: "Requires browser interaction to verify step navigation."
  - test: "On StepReview: type a name in Save input, press Save as preset. Reload page. Open wizard. Confirm preset appears in preset shelf."
    expected: "Preset persists across page reload and appears in PresetList."
    why_human: "Requires browser interaction + page reload."
  - test: "Save 50 presets. Attempt to save a 51st. Confirm Toaster shows wizard.error.preset_cap message."
    expected: "Toaster displays 'Preset library is full (50 max)...' and new preset is not saved."
    why_human: "Requires creating 50 presets — not automatable without running the app."
  - test: "Manually corrupt localStorage key 'flowboard.character.presets.v1' to an invalid JSON blob. Reload page and open wizard. Confirm Toaster shows wizard.error.preset_load_corrupt message and preset shelf is empty (no crash)."
    expected: "Error message appears via Toaster; app does not crash."
    why_human: "Requires browser localStorage manipulation."
  - test: "Rename a preset inline: open kebab menu, click Rename, edit name, press Enter. Confirm name updates in the preset card."
    expected: "Preset card shows new name; rename persists across page reload."
    why_human: "Requires browser interaction."
  - test: "Delete a preset inline: open kebab menu, click Delete, confirm in the inline confirmation. Confirm preset is removed."
    expected: "Preset removed from shelf; deletion persists across page reload."
    why_human: "Requires browser interaction."
---

# Phase 6: Wizard UI + Preset Library Verification Report

**Phase Goal:** Users can create and reuse structured character configurations through a guided wizard with a named-preset library, replacing the old dropdown preset picker.
**Verified:** 2026-06-17
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Wizard opens from GenerationDialog replacing old picker; 5 steps navigable; soft step gating | VERIFIED | `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />` at line 809 of GenerationDialog.tsx. Step tabs in CharacterWizard.tsx are all clickable buttons with no blocking guards; only Generate button has `disabled={!canGenerate}`. |
| 2 | Review step shows read-only assembled prompt preview via buildCharacterPrompt; submit dispatches via existing dispatchGeneration path | VERIFIED | StepReview.tsx calls `buildCharacterPrompt(config)` and renders result in `.char-wizard__prompt-preview`. CharacterWizard.tsx `handleSubmit()` calls `toCharacterDataPatch → patchNode → dispatchGeneration → onDone()`. |
| 3 | User can save a named preset from Review; preset appears in library list; loading preset pre-fills wizard fields | VERIFIED (partial — runtime UAT needed) | StepReview.tsx calls `addPreset(saveName, config)`. PresetList.tsx reads `useCharacterPresetsStore(s => s.presets)` and calls `onLoad({ ...preset.config })` on card click. Load jumps to step 5 via `handleLoadPreset`. Mechanical wiring is present; runtime save/load/reload flow is human_needed. |
| 4 | Rename + delete work inline; 51st preset shows warning; corrupt localStorage routes to Toaster | VERIFIED (partial — runtime UAT needed) | PresetList.tsx has kebab menu with inline rename (input + Enter) and two-step delete-confirm. `characterPresets.ts` checks `current.length >= MAX_PRESETS` (50) and sets `wizard.error.preset_cap`. `loadPersisted()` routes `safeParse` failure to `wizard.error.preset_load_corrupt`. Toaster.tsx priority chain includes `presetsErrorKey` at lowest priority. Error keys exist in both en.json and tr.json. |
| 5 | Cancel/ESC discards transient state; v1.0 board node with charCountry/charVibe opens wizard with pre-filled fields | FAILED | ESC discard: verified — CharacterWizard is unmounted by `closeGenerationDialog()` triggered from ESC handler (GenerationDialog.tsx:431-441) and close button. No module-level draft cache exists (confirmed by grep). Pre-fill: FAILED — CharacterWizard `config` always initialises as `useState<Partial<CharacterConfig>>({})` with no seeding from node data. v1.0 node fields are never read on wizard open. See gap below. |

**Score:** 4/5 truths verified (SC-5 partially fails — discard behavior correct, pre-fill absent)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/components/character/CharacterWizard.tsx` | 5-step wizard shell | VERIFIED | 211 lines; 5 step components wired; submit path via toCharacterDataPatch |
| `frontend/src/components/character/PresetList.tsx` | Preset shelf + CRUD | VERIFIED | 251 lines; kebab rename/delete; collapsible; isSelected highlight via selectedPresetId |
| `frontend/src/components/character/steps/StepIdentity.tsx` | Gender + Ethnicity chips + free-text | VERIFIED | 129 lines; ETHNICITY_BUCKET_KEYS as ReadonlySet<string> |
| `frontend/src/components/character/steps/StepAppearance.tsx` | Age + HairColor + HairStyle + SkinTone chips | VERIFIED | 160 lines |
| `frontend/src/components/character/steps/StepStyling.tsx` | Vibe chip + Outfit free-text | VERIFIED | 66 lines |
| `frontend/src/components/character/steps/StepExpression.tsx` | Expression chips + custom input + Extras textarea | VERIFIED | 115 lines; 200-char cap on Extras |
| `frontend/src/components/character/steps/StepReview.tsx` | buildCharacterPrompt preview + save-preset form | VERIFIED | 100 lines; calls `addPreset(saveName, config)` |
| `frontend/src/store/characterPresets.ts` | Hand-rolled localStorage Zustand slice | VERIFIED | 105 lines; STORAGE_KEY = "flowboard.character.presets.v1"; MAX_PRESETS = 50; all 4 error keys correct |
| `frontend/src/lib/character/schema.ts` | CharacterPresetSchema + PersistedPresetsSchema exported | VERIFIED | Both schemas present at lines 93-107 |
| `frontend/src/lib/character/migrate.ts` | Hair decomposition step added | VERIFIED | Step 2 (charHair → charHairColor + charHairStyle) at lines 46-57; accumulating pattern (no early returns) |
| `frontend/src/lib/character/buildCharacterPrompt.ts` | Hair token split with legacy fallback | VERIFIED | Lines 71-76: prefers charHairColor+charHairStyle, falls back to charHair; truth table in file header |
| `frontend/src/store/board.ts` | charHairColor/charHairStyle/charExtras added; refreshBoardState wrapped | VERIFIED | charHairColor appears 4 times (interface + 3 hydration sites: loadInitialBoard, switchBoard, refreshBoardState) |
| `frontend/src/components/GenerationDialog.tsx` | CharacterWizard mounted; outer footer hidden | VERIFIED | Line 808-810: `{isCharacter && <CharacterWizard .../>}`; Line 1221: `{!isCharacter && <div class="gen-dialog__footer">}` |
| `frontend/src/components/Toaster.tsx` | characterPresets error slot at lowest priority | VERIFIED | Lines 7, 21-24, 27: presetsErrorKey read; translated via `t(presetsErrorKey as any)` at render time; priority order chat > pipeline > generation > board > characterPresets |
| `frontend/src/i18n/locales/en.json` | 102 new wizard.* keys | VERIFIED | 528 lines; grep counts 102 "wizard" keys; all 4 error keys present |
| `frontend/src/i18n/locales/tr.json` | 102 keys at parity | VERIFIED | 528 lines (identical to EN); all wizard error keys have non-empty Turkish values |

---

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| GenerationDialog.tsx | CharacterWizard.tsx | `{isCharacter && <CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />}` | WIRED | Line 808-810 |
| CharacterWizard.tsx | toCharacterDataPatch | `toCharacterDataPatch(config as CharacterConfig, prevData)` | WIRED | Line 84 |
| CharacterWizard.tsx | patchNode (delta only) | `patchNode(dbId, { data: delta }).catch(() => {})` | WIRED | Line 90; no wholesale node.data replacement |
| CharacterWizard.tsx | dispatchGeneration | `dispatchGeneration(rfId, { prompt: promptString, ... })` | WIRED | Line 95 |
| StepReview.tsx | addPreset | `addPreset(saveName, config as CharacterConfig)` | WIRED | Line 35 |
| PresetList.tsx | onLoad callback | `onLoad({ ...preset.config })` → CharacterWizard `handleLoadPreset` | WIRED | Lines 244, 109-113 |
| characterPresets.ts | Toaster.tsx | `presetsErrorKey` + `t(presetsErrorKey)` | WIRED | Toaster.tsx lines 21-24 |
| characterPresets.ts | localStorage | `loadPersisted()` / `persist()` hand-rolled helpers | WIRED | Lines 27-51 |
| migrate.ts | board.ts refreshBoardState | `migrateCharacterNodeData(...)` wrap in all 3 hydration sites | WIRED | Confirmed: grep count = 4 (import + 3 call sites) |
| CharacterWizard.tsx | board store node data | NOT_WIRED (on init — at submit only) | PARTIAL | `useBoardStore.getState()` used only in `handleSubmit` (line 80) to read prev data for delta calc. No read on mount to seed config. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| CharacterWizard.tsx | `config` (Partial<CharacterConfig>) | `useState({})` — no seeding on mount | No (always empty on first open) | HOLLOW_PROP — config is not seeded from node.data; WIZARD fields never show pre-existing values |
| PresetList.tsx | `presets` | `useCharacterPresetsStore(s => s.presets)` → localStorage → `loadPersisted()` | Yes, if localStorage is populated | FLOWING |
| StepReview.tsx | `promptText` | `buildCharacterPrompt(config)` | Yes, assembles from config | FLOWING (but config is always empty on open — see above) |
| Toaster.tsx | `presetsError` | `presetsErrorKey ? t(presetsErrorKey) : null` | Yes, when error key is set | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `npm run lint` exits 0 | `cd frontend && npm run lint 2>&1` | exit 0 (claimed by executor) | PASS (executor-verified) |
| i18n parity (526 EN = 526 TR keys) | `node scripts/check-i18n-parity.mjs` | exit 0 (claimed by executor) | PASS (executor-verified) |
| migrateCharacterNodeData wired at ≥4 sites | `grep -rE "migrateCharacterNodeData\(" frontend/src/ \| wc -l` | 4 | PASS |
| No useTranslation in .ts files | `grep -rE "useTranslation" --include='*.ts' frontend/src/` | JSDoc comment only in i18n.ts | PASS |
| No dynamic key construction in character/ | `grep -rE "t(\`" frontend/src/components/character/` | 0 results | PASS |
| No raw data:{} writes | `grep -rE "patchNode(.+, ?\{[^}]*data: ?\{" frontend/src/components/character/` | 0 results | PASS |
| toCharacterDataPatch used as sole write path | `grep -rE "toCharacterDataPatch\(" frontend/src/components/character/` | 1 result (CharacterWizard.tsx) | PASS |
| useCharacterPresetsStore used in components | `grep -rE "useCharacterPresetsStore" frontend/src/components/character/` | 6 results (PresetList + StepReview) | PASS |
| charHairColor in board.ts (interface + 3 hydration) | `grep -c "charHairColor" frontend/src/store/board.ts` | 4 | PASS |
| CharacterWizard in GenerationDialog | `grep -c "CharacterWizard" frontend/src/components/GenerationDialog.tsx` | 2 (import + usage) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| WIZARD-01 | 06-01 | CharacterWizard mounted in GenerationDialog {isCharacter} block | SATISFIED | GenerationDialog.tsx line 808-810 |
| WIZARD-02 | 06-01 | 5 steps; soft step gating; jump-anywhere tabs | SATISFIED | CharacterWizard.tsx step tabs all clickable; only Generate button has canGenerate guard |
| WIZARD-03 | 06-01 | Chip rows for closed enums + free-text for ethnicity/extras | PARTIALLY SATISFIED | All listed chip rows implemented except charLighting (present in schema and buildCharacterPrompt but no UI chip row in any step — see WARNING below) |
| WIZARD-04 | 06-01 | Review step shows buildCharacterPrompt preview; submit dispatches via dispatchGeneration | SATISFIED | StepReview.tsx renders promptText; CharacterWizard.tsx handleSubmit calls dispatchGeneration |
| WIZARD-05 | 06-01 | Cancel/ESC discards transient state; submit calls existing dispatchGeneration boundary | PARTIALLY SATISFIED | Discard-on-cancel: verified (unmount on closeGenerationDialog). Pre-fill from node data: FAILED (config always starts as {}) |
| LIB-01 | 06-01 | characterPresets.ts Zustand slice + localStorage (versioned key flowboard.character.presets.v1) | SATISFIED | Hand-rolled localStorage (vs REQUIREMENTS.md spec of zustand/middleware/persist — intentional PLAN revision, same functional outcome) |
| LIB-02 | 06-01 | "Save as preset" from Review step | SATISFIED | StepReview.tsx save form + addPreset call |
| LIB-03 | 06-01 | PresetList loads preset to pre-fill wizard fields (clone-then-edit) | SATISFIED | PresetList.tsx onLoad passes { ...preset.config } |
| LIB-04 | 06-01 | Rename + delete inline with confirmation | SATISFIED | PresetCard has kebab menu, inline rename input, inline delete confirm (auto-cancel after 3s) |
| LIB-05 | 06-01 | 50-preset cap; localStorage errors; corrupt-blob → Toaster | SATISFIED | addPreset guards on MAX_PRESETS; loadPersisted routes safeParse failure to error key; persist catches quota exceptions |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| CharacterWizard.tsx | 45 | `useState<Partial<CharacterConfig>>({})` — never seeded from node.data | BLOCKER | SC-5 fails: v1.0 boards with existing character data never show pre-filled wizard fields |
| schema.ts | 111-116 | `VersionedCharacterConfigSchema` and `VersionedCharacterConfig` are exported but unused by any wizard or preset code (leftover from planning) | INFO | Dead code — no functional impact |
| GenerationDialog.tsx | 590-595 | `handleSubmit` character branch is unreachable dead code (wizard handles submit) | INFO | Code smell; no runtime impact |

No TBD, FIXME, or XXX markers found in any Phase 6 modified files.

---

### Warnings (Non-Blocking)

**WARNING: charLighting field has no wizard UI chip row**

`charLighting` is:
- Defined in `CharacterConfigSchema` (schema.ts:80)
- Assembled in `buildCharacterPrompt.ts` (line 87)
- Hydrated in all three board store hydration sites (board.ts)

But NONE of the 4 wizard step components (Identity, Appearance, Styling, Expression) render a chip row for `charLighting`. The PLAN's Step 2.2 spec for `StepExpression.tsx` says "Chip rows for `charExpression`, `charLighting`". The UI-SPEC ASCII layout for Step 4 does not include a lighting field — which appears to have driven the implementation decision.

Assessment: The UI-SPEC (approved design contract) omits lighting, the REQUIREMENTS.md lists it as "(optional lighting)". This is a minor scope reduction acceptable for v1.1 since the schema, hydration, and prompt assembler all support it — the field is ready to surface in a future step. Classified as WARNING, not BLOCKER.

**WARNING: LIB-01 implementation deviates from REQUIREMENTS.md wording**

REQUIREMENTS.md LIB-01 specifies `zustand/middleware/persist`. The implementation uses hand-rolled `loadPersisted()` / `persist()` helpers following the `references.ts` analog, with the same storage key `flowboard.character.presets.v1`. The PLAN explicitly documents this as a revised decision (PATTERNS confirmed, D-10 revised). Functional outcome is equivalent; codebase consistency is better maintained.

**INFO: selectedPresetId empty-string gap (executor-noted)**

When a preset is loaded from PresetList, `handleLoadPreset("", presetConfig)` is called because `PresetList.onLoad` passes only config, not preset ID. The empty string never matches any `preset.id` (which are UUIDs), so the selected-card highlight (`char-wizard__preset-card--selected`) never appears after a preset is loaded. Functionally harmless — the card de-highlights on first field change anyway (correct clone-then-edit semantics). Phase 7 can resolve by threading presetId through the onLoad callback.

---

### Human Verification Required

The following items require a real browser session to confirm. These cannot be verified statically.

#### 1. SC-5 pre-fill (BLOCKED pending gap closure)

**Test:** After fixing the CharacterWizard node-data seeding gap, open a board that has a character node with `charCountry: "vn"` or `charVibe: "clean"` stored. Open the generation dialog on that node.
**Expected:** Wizard fields should show the migrated values: charEthnicity chip/text reflects "Vietnamese" (from charCountry migration); Vibe chip shows "Clean".
**Why human:** Requires a real v1.0-style board fixture in the browser.

#### 2. ESC discard (can verify now)

**Test:** Open wizard, select Gender=Female and Vibe=Clean. Press ESC. Reopen wizard on same node.
**Expected:** All wizard fields blank (discard-on-cancel; SC-5 first clause).
**Why human:** Requires browser interaction.

#### 3. Wizard 5-step navigation

**Test:** Click all 5 step tabs (Identity, Appearance, Styling, Expression, Review) on a character node with no fields set.
**Expected:** All tabs navigable without any blocking. Generate button disabled; hint text visible.
**Why human:** Requires browser.

#### 4. Save as preset → reload → library round-trip

**Test:** Fill Gender + Vibe in wizard. Navigate to Review. Type a preset name. Press "Save as preset." Reload the page. Open wizard on any character node. Confirm preset appears in shelf.
**Expected:** Preset persists across page reload and appears collapsible shelf.
**Why human:** Requires browser + localStorage persistence verification.

#### 5. 51st preset cap toast

**Test:** Save 50 presets. Attempt to save a 51st.
**Expected:** Toaster shows "Preset library is full (50 max). Delete a preset before saving a new one."
**Why human:** Requires creating 50 presets.

#### 6. Corrupt localStorage toast (no crash)

**Test:** Open browser DevTools. Set `localStorage["flowboard.character.presets.v1"] = "!!!invalid{json"`. Reload page. Open wizard.
**Expected:** Toaster shows "One or more saved presets could not be loaded — data may be corrupt." Preset shelf is empty. App does not crash.
**Why human:** Requires browser localStorage manipulation.

#### 7. Preset rename + delete

**Test:** Load a saved preset. Open kebab menu. Rename it. Confirm name updates. Delete it. Confirm it disappears. Reload and confirm deletion persisted.
**Expected:** Inline rename and delete work with confirmation; changes persist.
**Why human:** Requires browser.

---

## Gaps Summary

**1 BLOCKER gap prevents full SC-5 achievement.**

### Gap 1 — No node data seeding on wizard open (BLOCKER)

**Truth:** ROADMAP SC-5 requires "a v1.0 board node with old charCountry / charVibe opens the wizard with fields pre-filled from the converted values."

**What's missing:** `CharacterWizard.tsx` always initialises `config` as `useState({})` (empty). The comment says "seeded from undefined (discard-on-cancel per WIZARD-05)" — but WIZARD-05's "discard transient state on cancel" refers to reopen-after-ESC behavior, NOT initial seeding. The PLAN's Step 2.2 spec explicitly required "On mount: seed config from board store node data." This was not implemented.

**Impact:** A v1.0 board node with `charCountry: "vn"` / `charVibe: "clean"` (migrated to `charEthnicity: "Vietnamese"` / `charVibe: "clean"` by the correctly-working `migrateCharacterNodeData`) will open the wizard with blank fields. The user has no visibility into previously saved character data. Generation from wizard will write a delta that may null-out previously stored vibe/ethnicity if they don't re-select.

**Fix:** In `CharacterWizard.tsx`, replace the empty `useState({})` initialiser with a lazy initialiser that reads the board store. The discard-on-cancel behavior is not affected — React unmounting on ESC still discards the local state.

```ts
const [config, setConfig] = useState<Partial<CharacterConfig>>(() => {
  const node = useBoardStore.getState().nodes.find((n) => n.id === rfId);
  const d = node?.data;
  if (!d) return {};
  return {
    charGender: d.charGender,
    charEthnicity: d.charEthnicity,
    charAge: d.charAge,
    charHair: d.charHair,
    charHairColor: d.charHairColor,
    charHairStyle: d.charHairStyle,
    charSkinTone: d.charSkinTone,
    charVibe: d.charVibe,
    charOutfit: d.charOutfit,
    charExpression: d.charExpression,
    charLighting: d.charLighting,
    charExtras: d.charExtras,
  };
});
```

Note: `useBoardStore.getState()` in a `useState` lazy initialiser is valid and does not create a subscription — it is a one-time read on mount, which is exactly the desired behavior.

---

## Status Decision Rationale

- SC-1 (wizard opens, 5 steps, soft gating): VERIFIED
- SC-2 (Review prompt preview, submit via dispatchGeneration): VERIFIED
- SC-3 (save preset, library list, load prefill): VERIFIED mechanically; runtime UAT needed
- SC-4 (rename/delete, 51-cap toast, corrupt localStorage Toaster): VERIFIED mechanically; runtime UAT needed
- SC-5 (ESC discard + v1.0 pre-fill): PARTIAL — ESC discard verified; pre-fill is a code-verifiable BLOCKER

One truth definitively FAILS — code evidence shows the wizard never seeds from node data. This alone drives `status: gaps_found` (Step 9 decision tree: "IF any truth FAILED → gaps_found").

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
