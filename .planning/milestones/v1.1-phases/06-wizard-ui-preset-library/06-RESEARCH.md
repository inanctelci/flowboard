# Phase 6: Wizard UI + Preset Library — Research

**Researched:** 2026-06-17
**Domain:** React 18 + Zustand + Zod — multi-step wizard, structured character config, localStorage preset store
**Confidence:** HIGH — grounded in live codebase reads of every file listed in the brief

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
D-01 through D-21 are locked. Key constraints for planning:
- Wizard mounts at `{isCharacter && (...)}` block (~line 871) in `GenerationDialog.tsx`
- No draft preservation across cancel (D-03, WIZARD-05 honored literally); UI-SPEC §3.8 draft-preservation copy is out of Phase 6
- 5 ordered steps: Identity → Appearance → Styling → Expression → Review; Step 0 (Presets) is a collapsible shelf, not a step tab
- Soft gating: no hard blocking between steps; `canGenerate` requires at least one of `charEthnicity | charVibe | charExtras` non-empty
- `charHair` splits into `charHairColor` + `charHairStyle` (D-14); `charHair` stays in schema for legacy reads
- `charExtras` wired into `FlowboardNodeData` in Phase 6 (was deferred from Phase 5 per D-15)
- 50-preset cap; localStorage key `flowboard.character.presets.v1`; `PersistedPresetSchema.safeParse` in `onRehydrateStorage`
- All ~102 i18n keys in EN + TR in same commit; `check-i18n-parity.mjs` exits 0 on every commit
- No dynamic key construction (`t(\`wizard.step.${n}\`)` is banned); no `useTranslation()` in `.ts` files
- Stored values are stable English keys / English prose — never translated labels
- `refreshBoardState()` in `pipeline.ts` is the missing Phase 5 hydration wrap (D-17); Phase 6 closes it
- No backend edits; no ResultViewer updates; no CHARACTER_* constant deletions (all Phase 7)
- No new npm dependencies (Zod + Zustand persist already ship)

### Claude's Discretion
- Exact component decomposition inside `components/character/`
- Naming of regional bucket constants (D-16)
- Toast/inline error UX details
- ID generation strategy for `CharacterPreset.id`
- Exact wording of `onRehydrateStorage` error (route via `wizard.error.presetsCorrupted` i18n key)

### Deferred Ideas (OUT OF SCOPE)
- Draft preservation across ESC/reopen
- Edit-the-prompt mode on Review step
- Preset thumbnails on save
- Reference-table-backed presets (LIB-FUTURE-01)
- AI-assisted fills (AI-01, AI-02)
- Per-field lock/unlock (VAR-01), real-time preview (VAR-02)
- Expanded ethnicity multi-select (FIELD-02)
- Outfit dedicated chip row (FIELD-03 — stays as `charOutfit` free-text textarea)
- Legacy `charHair` removal from schema (Phase 7)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WIZARD-01 | `CharacterWizard.tsx` mounted inside `GenerationDialog` `{isCharacter}` block | §3, §8 — exact replacement diff |
| WIZARD-02 | 5 steps, soft-gated, jump-nav | §3 — step state shape, tab rendering pattern |
| WIZARD-03 | Chip rows for closed enums; free-text for ethnicity + extras (200-char) | §4 — chip-to-field mapping table |
| WIZARD-04 | Review step shows `buildCharacterPrompt` read-only output | §3 — submit handler pseudocode |
| WIZARD-05 | Cancel discards; submit calls `dispatchGeneration` unchanged | §3 — lifecycle hooks; §8 — pitfall guards |
| LIB-01 | `characterPresets.ts` Zustand slice with `persist` | §1 — full slice shape |
| LIB-02 | "Save as preset" on Review step | §1 — `addPreset` signature |
| LIB-03 | PresetList prefills wizard (clone-then-edit) | §4 — PresetList component shape |
| LIB-04 | Inline rename + delete with confirmation | §4 — PresetList interactions |
| LIB-05 | 50-cap toast; quota/parse errors to Toaster | §1, §2 — error routing |
</phase_requirements>

---

## Summary

Phase 6 is a pure frontend buildout: no backend changes, no new dependencies (Zod 4 and Zustand persist middleware are already installed from Phase 5). The work breaks into four distinct tracks that can proceed in parallel within waves: (1) schema extension for `charHairColor`/`charHairStyle`/`charExtras` in `FlowboardNodeData` and `CharacterConfigSchema`, (2) the `characterPresets.ts` Zustand slice, (3) seven new component files under `components/character/`, and (4) ~102 i18n keys in `en.json`/`tr.json`.

The highest-risk area is the `buildCharacterPrompt` update: the function in `lib/character/buildCharacterPrompt.ts` must emit `charHairColor` and `charHairStyle` as a single comma-joined hair segment while falling back to legacy `charHair` — without disturbing the FRAMING_ANCHORS order. The second risk is the `refreshBoardState` gap: that function in `board.ts` (lines 426–461) does NOT call `migrateCharacterNodeData` and does NOT hydrate the v1.1 char fields (`charEthnicity`, `charAge`, etc.) — pipeline.ts calls it during live runs. Both gaps must be closed before the wizard can rely on node data being correctly shaped.

**Primary recommendation:** Wire `migrateCharacterNodeData` into `refreshBoardState` (and hydrate all char* fields there) in Wave 0 alongside the schema extension. All wizard UI code can be built in Wave 1 against a stable, correct data layer.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wizard UI and step state | Frontend (React component) | — | Local transient state; never persisted mid-wizard |
| Character config assembly | Frontend lib (`buildCharacterPrompt`) | — | Locked pure function; called at submit and on Review preview |
| Preset persistence | Frontend store (Zustand `persist`) | — | localStorage-only; no backend; single-user app |
| Node data patching | Frontend store via `toCharacterDataPatch` | API (`patchNode`) | Delta-only; null-sentinel contract already established |
| Migration (charCountry → charEthnicity, charHair split) | Frontend lib (`migrate.ts`) | Board store hydration paths | Pure convert-on-read; no backend writes |
| i18n key provision | Frontend i18n (en.json / tr.json) | — | Parity-CI-enforced |
| Error surfacing | Toaster (reads store.error slots) | — | Existing chain; `characterPresets.error` appended at lowest priority |

---

## 1. `characterPresets.ts` Slice — Full Shape

### Type definitions (add to `lib/character/schema.ts` or inline in the store)

```typescript
// CharacterPreset — shape of a single saved preset
export interface CharacterPreset {
  id: string;                  // crypto.randomUUID()
  name: string;                // user-supplied, max 100 chars
  createdAt: string;           // ISO-8601 UTC, e.g. new Date().toISOString()
  config: CharacterConfig;     // Partial<CharacterConfig> in practice; Zod tolerates partials
}
```

`PersistedPresetSchema` does NOT exist yet in `schema.ts` (grep confirmed empty). Phase 6 must add it:

```typescript
// Add to frontend/src/lib/character/schema.ts
export const CharacterPresetSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  createdAt: z.string(),
  config: CharacterConfigSchema,
});

export const PersistedPresetSchema = z.object({
  presets: z.array(CharacterPresetSchema),
});

export type CharacterPreset = z.infer<typeof CharacterPresetSchema>;
```

### Store signature

```typescript
// frontend/src/store/characterPresets.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "../i18n/i18n";
import { PersistedPresetSchema, CharacterPresetSchema } from "../lib/character/schema";
import type { CharacterConfig, CharacterPreset } from "../lib/character/schema";

const MAX_PRESETS = 50;
const STORAGE_KEY = "flowboard.character.presets.v1";

interface CharacterPresetsState {
  presets: CharacterPreset[];
  error: string | null;

  addPreset(name: string, config: CharacterConfig): void;
  renamePreset(id: string, name: string): void;
  deletePreset(id: string): void;
  clearError(): void;
}

export const useCharacterPresetsStore = create<CharacterPresetsState>()(
  persist(
    (set, get) => ({
      presets: [],
      error: null,

      addPreset(name, config) {
        const { presets } = get();
        // 50-cap check BEFORE writing (Pitfall #11)
        if (presets.length >= MAX_PRESETS) {
          set({ error: i18n.t("wizard.error.preset_cap") });
          return;
        }
        // Name collision: case-insensitive, en-US locale (D-21 / Pitfall #13)
        const normalized = name.trim().toLocaleLowerCase("en-US");
        const existing = presets.find(
          (p) => p.name.toLocaleLowerCase("en-US") === normalized,
        );
        if (existing) {
          // Caller handles the replace-confirmation UI; store just replaces
          set({
            presets: presets.map((p) =>
              p.id === existing.id
                ? { ...p, name: name.trim(), config, createdAt: new Date().toISOString() }
                : p,
            ),
          });
          return;
        }
        const preset: CharacterPreset = {
          id: crypto.randomUUID(),
          name: name.trim() || i18n.t("wizard.preset.default_name"),
          createdAt: new Date().toISOString(),
          config,
        };
        set({ presets: [preset, ...presets] });
      },

      renamePreset(id, name) {
        if (!name.trim()) return; // empty rename reverts (UI handles it)
        set((s) => ({
          presets: s.presets.map((p) =>
            p.id === id ? { ...p, name: name.trim() } : p,
          ),
        }));
      },

      deletePreset(id) {
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) }));
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Exclude transient `error` from storage
      partialize: (state) => ({ presets: state.presets }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // Corrupted storage — surface via error slot; do not crash
          // Note: `state` may be undefined here; the persist middleware
          // will have already initialized presets: [] from the default.
          useCharacterPresetsStore.setState({
            error: i18n.t("wizard.error.preset_load_corrupt"),
          });
          return;
        }
        if (!state) return;
        // Validate the rehydrated shape; discard on parse failure
        const result = PersistedPresetSchema.safeParse({ presets: state.presets });
        if (!result.success) {
          useCharacterPresetsStore.setState({
            presets: [],
            error: i18n.t("wizard.error.preset_load_corrupt"),
          });
        }
      },
    },
  ),
);
```

**ID generation:** `crypto.randomUUID()` — available in all Chromium versions Flowboard targets (the extension requires MV3 which mandates Chrome 88+). No fallback needed.

**Error message routing:** Use `i18n.t(...)` from the singleton (same pattern as `pipeline.ts` line 33). Do NOT use `useTranslation()` in a `.ts` store file (CLAUDE.md constraint).

**Selector pattern at consumer sites:**

```typescript
// Correct — narrow selector, no whole-store destructure
const presets = useCharacterPresetsStore((s) => s.presets);
const presetsError = useCharacterPresetsStore((s) => s.error);
const addPreset = useCharacterPresetsStore((s) => s.addPreset);
```

---

## 2. Toaster Integration

**Current priority chain** (Toaster.tsx lines 19–28):
```
chat > pipeline > generation > board
```

**Add `characterPresets` at the lowest priority** — below `board`. Rationale: preset errors (save failures, 50-cap) are informational rather than blocking; generation and board errors are higher-stakes. The chain becomes:

```
chat > pipeline > generation > board > characterPresets
```

**Diff for `Toaster.tsx`:**

```typescript
// Add imports:
import { useCharacterPresetsStore } from "../store/characterPresets";

// Add selectors (after boardError / clearBoardError):
const presetsError = useCharacterPresetsStore((s) => s.error);
const clearPresetsError = useCharacterPresetsStore((s) => s.clearError);

// Update priority chain:
const error = chatError ?? pipelineError ?? genError ?? boardError ?? presetsError;
const clearError =
  chatError !== null ? clearChatError
  : pipelineError !== null ? clearPipelineError
  : genError !== null ? clearGenError
  : boardError !== null ? clearBoardError
  : clearPresetsError;
```

Auto-dismiss (5s) applies unchanged — the `useEffect` watches `error` and fires regardless of which store set it.

---

## 3. `CharacterWizard.tsx` Component Skeleton

### Props

```typescript
interface CharacterWizardProps {
  rfId: string;      // React-Flow node id (string, NOT numeric dbId)
  onDone(): void;    // calls closeGenerationDialog() in caller
}
```

### State shape — flat `useState` (recommended)

The codebase has no reducers and avoids them (CLAUDE.md "React components" section). Use a collection of `useState` calls, not a single discriminated union reducer:

```typescript
// Step tracking
const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

// Wizard field state — mirrors CharacterConfig
const [charGender, setCharGender] = useState<string | undefined>(undefined);
const [charEthnicity, setCharEthnicity] = useState<string | undefined>(undefined);
const [charAge, setCharAge] = useState<string | undefined>(undefined);
const [charHairColor, setCharHairColor] = useState<string | undefined>(undefined);
const [charHairStyle, setCharHairStyle] = useState<string | undefined>(undefined);
const [charSkinTone, setCharSkinTone] = useState<string | undefined>(undefined);
const [charVibe, setCharVibe] = useState<string | undefined>(undefined);
const [charOutfit, setCharOutfit] = useState<string | undefined>(undefined);
const [charExpression, setCharExpression] = useState<string | undefined>(undefined);
const [charExtras, setCharExtras] = useState<string>("");

// Preset save flow
const [saveName, setSaveName] = useState<string>("");
const [saveFlash, setSaveFlash] = useState<boolean>(false);
```

### `useEffect` on mount — D-03 / WIZARD-05

```typescript
// Mount: do NOT initialize from any draft cache (D-03 — discard-on-cancel)
// No useEffect on mount; all fields start as undefined / ""
// The existing GenerationDialog useEffect that resets charGender/charCountry/charVibe
// (lines ~392, ~445-448) will be REMOVED when the wizard replaces the inline block.
```

### `useEffect` on unmount

```typescript
// No side effect on unmount — transient state is discarded with the component
// No draft save, no PATCH call (D-03)
```

### `canGenerate` — matches existing pattern from GenerationDialog line 760–761

```typescript
const canGenerate =
  (charEthnicity?.trim().length ?? 0) > 0 ||
  (charVibe?.trim().length ?? 0) > 0 ||
  charExtras.trim().length > 0;
```

### Submit handler pseudocode

```typescript
async function handleSubmit() {
  // 1. Build CharacterConfig from current wizard state
  const config: Partial<CharacterConfig> = {
    charGender,
    charEthnicity,
    charAge,
    charHairColor,   // new field
    charHairStyle,   // new field
    charSkinTone,
    charVibe,
    charOutfit: charOutfit?.trim() || undefined,
    charExpression,
    charExtras: charExtras.trim() || undefined,
    // charHair is NOT set by the wizard — it is a legacy read-only field
  };

  // 2. Build prompt — MUST call the shipped assembler, never hand-roll
  const promptString = buildCharacterPrompt(config);
  // imported from "../lib/character/buildCharacterPrompt"

  // 3. Get previous node data for delta calculation
  const node = useBoardStore.getState().nodes.find((n) => n.id === rfId);
  const prevData = node?.data ?? {};

  // 4. Emit only the delta (Pitfall #1 / #2 guardrail)
  const delta = toCharacterDataPatch(config, prevData);
  // imported from "../lib/character/toDataPatch"

  // 5. Patch node only if something changed
  const dbId = parseInt(rfId, 10);
  if (!isNaN(dbId) && Object.keys(delta).length > 0) {
    useBoardStore.getState().updateNodeData(rfId, delta);
    patchNode(dbId, { data: delta }).catch(() => {});
    // patchNode imported from "../api/client"
  }

  // 6. Dispatch generation — unchanged boundary (D-02)
  const { aspectRatio } = // read from node.data or settings default
  useGenerationStore.getState().dispatchGeneration(rfId, {
    prompt: promptString,
    aspectRatio,
    variantCount: 1,  // wizard defaults to 1; can expose as a setting later
  });

  // 7. Close dialog
  onDone();
}
```

**Note:** `rfId` is a string in React Flow (the node `id` field). The numeric `dbId = parseInt(rfId, 10)` is needed only for the API call.

---

## 4. Step Components — Recommended Decomposition

**Adopt the 7-file split** from UI-SPEC §10 / CONTEXT.md discretion note. Rationale: each step file is ~50–100 lines, self-contained, and clearly named. Collapsing everything into one file would produce a 600-line component that breaks CLAUDE.md's readability convention.

**Directory:** `frontend/src/components/character/`

```
components/character/
├── CharacterWizard.tsx        # shell: step tabs, routing, submit
├── PresetList.tsx             # preset shelf: cards, kebab, rename, delete
└── steps/
    ├── StepIdentity.tsx       # Gender chips + Ethnicity chips + free-text
    ├── StepAppearance.tsx     # Age + Hair Color + Hair Style + Skin Tone chips
    ├── StepStyling.tsx        # Vibe chips + Outfit textarea
    ├── StepExpression.tsx     # Expression chips + custom input + Extras textarea
    └── StepReview.tsx         # Prompt preview + Save as preset row
```

### Step component contract

```typescript
// All step components receive the same narrow props
interface StepProps {
  config: Partial<CharacterConfig>;
  onChange(next: Partial<CharacterConfig>): void;
}
```

`CharacterWizard` holds all field state; step components fire `onChange` upward (single-direction data flow). Step components are never responsible for submitting or navigating — those live in the shell.

### Closed-enum to chip-row mapping

| Field | Options | i18n key pattern |
|-------|---------|-----------------|
| `charGender` | `male`, `female`, `nonbinary` | `wizard.field.gender.option.{key}` |
| `charEthnicity` | `east-asian`, `southeast-asian`, `south-asian`, `middle-eastern`, `african`, `latin`, `caucasian`, `mixed` + free-text | `wizard.field.ethnicity.option.{key}` |
| `charAge` | `teenager`, `young-adult`, `adult`, `middle-aged`, `mature`, `senior` | `wizard.field.age.option.{key}` |
| `charHairColor` | `black`, `brown`, `blonde`, `red`, `silver`, `custom` | `wizard.field.hair_color.option.{key}` |
| `charHairStyle` | `long_straight`, `long_wavy`, `short_bob`, `updo`, `loose_bun`, `braids`, `natural`, `short_cropped` | `wizard.field.hair_style.option.{key}` |
| `charSkinTone` | `fair`, `light`, `medium`, `tan`, `deep`, `dark` | `wizard.field.skin_tone.option.{key}` |
| `charVibe` | `clean`, `douyin`, `oldmoney`, `coldgirl`, `kpop`, `casual` | `wizard.field.vibe.option.{key}` |
| `charExpression` | `neutral`, `soft-smile`, `confident`, `thoughtful`, `custom` | `wizard.field.expression.option.{key}` |

**Critical:** Use a constant lookup table, not dynamic key construction:

```typescript
// CORRECT — constant table mapping option key → i18n key
const GENDER_OPTIONS: Array<{ key: string; i18nKey: string }> = [
  { key: "male",      i18nKey: "wizard.field.gender.option.male" },
  { key: "female",    i18nKey: "wizard.field.gender.option.female" },
  { key: "nonbinary", i18nKey: "wizard.field.gender.option.nonbinary" },
];
// Render: t(opt.i18nKey)

// BANNED — dynamic key construction
t(`wizard.field.gender.option.${key}`)  // breaks static analysis
```

The vibe chip row specifically must use the stable `CHARACTER_VIBES` array for the option keys (the array is not deleted until Phase 7) but derive display labels from i18n, not from `v.label`. Pattern: `t(`wizard.field.vibe.option.${v.key}`)` — wait, this is dynamic. The correct pattern:

```typescript
const VIBE_OPTIONS = CHARACTER_VIBES.map((v) => ({
  key: v.key,
  i18nKey: `wizard.field.vibe.option.${v.key}` as const,
}));
// TypeScript can verify if we enumerate the type:
// type VibeI18nKey = "wizard.field.vibe.option.clean" | ...
```

Since all vibe keys are known at compile time, a typed constant is preferred:

```typescript
const VIBE_I18N: Record<string, keyof typeof en["wizard"]["field"]["vibe"]> = {
  clean: "wizard.field.vibe.option.clean",
  // ...
};
```

---

## 5. Schema Extension for Hair Split

### Patch to `CharacterConfigSchema` in `schema.ts`

```typescript
// BEFORE (existing):
charHair: z.string().optional(),  // composite legacy field

// AFTER — keep charHair for legacy reads, add two new fields:
charHair: z.string().optional(),           // legacy composite — read-only; Phase 7 removes
charHairColor: z.string().max(40).optional(),  // NEW: "black", "blonde", "custom" key or free-text
charHairStyle: z.string().max(40).optional(),  // NEW: "long-wavy", "braids", etc.
```

`max(40)` chosen: longest option key is `"long_straight"` (12 chars); custom free-text should stay short. Matches the spirit of the Zod `.max(60)` on `charEthnicity`.

### `FlowboardNodeData` additions in `board.ts`

```typescript
// Add after charHair?: string; (line 97):
charHairColor?: string;   // Phase 6 — "black", "blonde", "custom"
charHairStyle?: string;   // Phase 6 — "long-wavy", "braids"
// charExtras is also NEW for Phase 6 (deferred from Phase 5 D-15):
charExtras?: string;      // 200-char cap; escape hatch
```

### Hydration mapping additions (both `loadInitialBoard` AND `switchBoard` AND `refreshBoardState`)

Every node mapping block (3 sites: lines ~278–308, ~344–370, ~431–455) needs:

```typescript
charHairColor: n.data["charHairColor"] as string | undefined,
charHairStyle: n.data["charHairStyle"] as string | undefined,
charExtras:    n.data["charExtras"]    as string | undefined,
```

The `refreshBoardState` at lines 431–455 is critically missing ALL v1.1 char fields and the `migrateCharacterNodeData` call — see §10 below for the full gap analysis.

**Type fallout:** `CharacterConfig = z.infer<typeof CharacterConfigSchema>` updates automatically after the schema patch. `CharacterPreset.config: CharacterConfig` picks up the new fields immediately.

---

## 6. `buildCharacterPrompt` Token-Assembly Update

The existing hair token slot (line 62) reads `config.charHair ?? null`. Replace with a dual-key pattern that falls back to legacy:

```typescript
// REPLACE in buildCharacterPrompt.ts:
// OLD:
const hairToken = config.charHair ?? null;

// NEW:
const hairToken: string | null = (() => {
  // Phase 6 split fields take priority
  if (config.charHairColor || config.charHairStyle) {
    return [config.charHairColor, config.charHairStyle]
      .filter(Boolean)
      .join(", ") || null;
    // Example outputs: "black, long wavy" / "blonde" / "braids"
  }
  // Legacy fallback — preserves A/B parity for boards created before Phase 6
  return config.charHair ?? null;
})();
```

**FRAMING_ANCHORS stays untouched.** The `hairToken` slot position in the `tokens[]` array does not move — it remains between `poseAnchor2` and `skinToken` (D-10 token order is frozen).

**Pitfall #4 guardrail:** The planner must include a task that verifies:
```
buildCharacterPrompt({ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" })
```
produces output starting with `"Studio portrait headshot of a Vietnamese female character"` and ending with `"photorealistic, ultra-detailed, consistent character reference"`.

---

## 7. `migrate.ts` Extension

### New migration step — append to `migrateCharacterNodeData`

```typescript
export function migrateCharacterNodeData(data: FlowboardNodeData): FlowboardNodeData {
  let result = data;

  // Step 1 (existing): charCountry → charEthnicity
  if (!result.charEthnicity && result.charCountry) {
    const mapped = LEGACY_COUNTRY_TO_ETHNICITY[result.charCountry];
    if (mapped) result = { ...result, charEthnicity: mapped };
  }

  // Step 2 (Phase 6 NEW): charHair composite → charHairColor + charHairStyle
  // Idempotency guard: skip if either new key is already set
  if (result.charHair && !result.charHairColor && !result.charHairStyle) {
    const spaceIdx = result.charHair.indexOf(" ");
    if (spaceIdx === -1) {
      // Single word — treat as color only
      result = { ...result, charHairColor: result.charHair };
    } else {
      result = {
        ...result,
        charHairColor: result.charHair.slice(0, spaceIdx),
        charHairStyle: result.charHair.slice(spaceIdx + 1),
      };
    }
    // charHair is intentionally retained on the result (Phase 7 removes it)
  }

  return result;
}
```

**Idempotency rule:** The outer guard `!result.charHairColor && !result.charHairStyle` ensures the decomposition never runs twice. StrictMode double-mount is safe.

### `refreshBoardState` in `pipeline.ts`

`pipeline.ts` calls `useBoardStore.getState().refreshBoardState()`. The migration wrapping happens INSIDE `board.ts`'s `refreshBoardState`, not in `pipeline.ts`. The planner must add `migrateCharacterNodeData` to the `refreshBoardState` node mapping block (the gap identified in D-17).

---

## 8. i18n Key List — Final Shape

**Total: 102 keys** (confirmed by counting the UI-SPEC §6 inventory exhaustively).

| Namespace | Keys | Notes |
|-----------|------|-------|
| `wizard.*` (top-level) | 8 | Modal chrome, generate CTA, nav buttons |
| `wizard.step.*` | 5 | Identity, Appearance, Styling, Expression, Review |
| `wizard.field.*` (labels, placeholders, aria) | 18 | Field labels + free-text placeholders + aria |
| `wizard.field.*.option.*` | 48 | 3 gender + 8 ethnicity + 6 age + 6 hair color + 8 hair style + 6 skin tone + 6 vibe + 5 expression |
| `wizard.review.*` | 4 | Preview label, aria, empty hint, dispatch hint |
| `wizard.preset.*` | 15 | All preset shelf strings |
| `wizard.error.*` | 4 | Cap, save failed, corrupt load, empty name |

**No dynamic key patterns required.** All 48 closed-enum option keys are statically enumerable. The option lookup table pattern (§4) maps each key to a literal string constant at definition time.

### CustomTypeOptions extension

The declaration merging lives in `frontend/src/i18n/i18n.d.ts` (not `i18n.ts`). The file currently points at `typeof en` which means adding keys to `en.json` automatically expands the typed key union. **No change to `i18n.d.ts` is needed** — just add the `wizard` subtree to `en.json` and TypeScript picks it up.

```typescript
// i18n.d.ts stays as-is:
resources: {
  translation: typeof en;  // auto-includes wizard.* after en.json is updated
};
```

**i18n.ts rule enforcement:**
- `useTranslation()` only in `.tsx` files (wizard step components, `CharacterWizard.tsx`, `PresetList.tsx`)
- `i18n.t(...)` singleton import in `characterPresets.ts` store actions (same as `pipeline.ts` line 33)
- Zero dynamic key construction (grep gate: `grep -r "t(\`" frontend/src/components/character/` must return nothing)

---

## 9. `GenerationDialog.tsx` Integration

### Exact change at line 871

```typescript
// REMOVE the entire {isCharacter && (...)} block (lines 871–942):
{isCharacter && (
  <>
    {/* ... CHARACTER_GENDERS, CHARACTER_COUNTRIES, CHARACTER_VIBES chip rows ... */}
    {/* ... charExtras textarea ... */}
  </>
)}

// REPLACE WITH:
{isCharacter && (
  <CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />
)}
```

`CharacterWizard` imports: `import { CharacterWizard } from "./character/CharacterWizard";`

### Imports to remove from `GenerationDialog.tsx` — conditional

After the wizard mounts, check each import for remaining usage:

| Import | Other usages in `GenerationDialog.tsx`? | Action |
|--------|----------------------------------------|--------|
| `CHARACTER_GENDERS` | Line 51 (old `buildCharacterPrompt`), line 876 (chip row) — both in the removed block | Remove import if the local `buildCharacterPrompt` function is also removed |
| `CHARACTER_COUNTRIES` | Line 52 (old assembler), line 892 (chip row) | Remove import |
| `CHARACTER_VIBES` | Line 54 (old assembler), line 908 (chip row) | Remove import — BUT `buildCharacterPrompt` in `lib/character/buildCharacterPrompt.ts` still imports it from the constant. Only the GenerationDialog-local copy can be removed |
| `GenderKey`, `CountryKey`, `VibeKey` | Lines 229–231 (`useState` types) — these useState calls are in the removed block | Remove imports |
| Local `buildCharacterPrompt` function (lines 45–74) | Used only at line 639 within the character branch | Remove the entire local function; the Phase 5 module-level one in `lib/character/buildCharacterPrompt.ts` replaces it |

**Keep:** `patchNode` (still used elsewhere), `autoPrompt`, `autoPromptBatch`, and all video/image-path code.

Also remove the three `useState` declarations for `charGender`, `charCountry`, `charVibe` (lines 229–231) since those are now owned by `CharacterWizard`.

### `dispatchGeneration` call compatibility

The wizard calls `dispatchGeneration(rfId, { prompt, aspectRatio, variantCount })`. The existing signature (generation.ts lines 27–45):

```typescript
dispatchGeneration(rfId: string, opts: {
  prompt: string;
  aspectRatio?: string;
  paygateTier?: string;
  kind?: "image" | "video";
  sourceMediaId?: string;
  sourceMediaIds?: string[];
  variantCount?: number;
  prompts?: string[];
}): Promise<void>
```

The wizard passes a subset — fully compatible. No changes to `generation.ts`.

---

## 10. Risk Verification

### Other consumers of `charCountry` / `charVibe` / `charGender`

Confirmed via grep (output verified above):

| Consumer | File | Lines | Phase 6 action |
|----------|------|-------|----------------|
| Chip row + local buildCharacterPrompt | `GenerationDialog.tsx` | 229–231, 639–664, 876–919 | Removed when wizard replaces the block |
| ResultViewer pills | `ResultViewer.tsx` | 656–668 | NOT touched in Phase 6 (Phase 7) |
| `localizedCountryLabel`, `localizedVibeLabel` | `constants/character.ts` | 101, 106 | NOT touched in Phase 6 |
| Migration lookup table | `lib/character/migrate.ts` | 14–16 | Not changed |
| FlowboardNodeData interface | `store/board.ts` | 87–89 | Keep; Phase 7 removes |
| Node hydration (3 sites) | `store/board.ts` | 296–298, 359–361, 449–451 | Keep hydration; `refreshBoardState` gap to be fixed |

**No hidden consumers found.** The two non-removed consumers (`ResultViewer.tsx` and `constants/character.ts`) are Phase 7 work. Phase 6 does not break them.

### `refreshBoardState` gap — confirmed and detailed

`refreshBoardState` (board.ts lines 426–461) has THREE problems compared to `loadInitialBoard` / `switchBoard`:

1. **No `migrateCharacterNodeData` call** — newly received node data from the backend during a pipeline run skips the charCountry → charEthnicity migration.
2. **Missing v1.1 char fields** — `charEthnicity`, `charAge`, `charHair`, `charSkinTone`, `charOutfit`, `charExpression`, `charLighting` are absent from the data mapping (lines 431–455). Only `charCountry`, `charVibe`, `charGender` are mapped.
3. **Missing Phase 6 fields** — `charHairColor`, `charHairStyle`, `charExtras` will also be absent without Phase 6's fix.

The pipeline calls `refreshBoardState()` twice: once immediately after `startRun` and once on each poll tick (pipeline.ts lines 30 and 58). Any character node updated by a pipeline run will have corrupted data on the canvas. This is a Wave 0 fix that must land before the wizard can be tested end-to-end.

**Fix:** Add `migrateCharacterNodeData` wrap and all char* field hydrations to `refreshBoardState` — make it identical in shape to `loadInitialBoard`.

---

## 11. Verification Rubric

| Criterion | Observable Check |
|-----------|-----------------|
| TypeScript strict | `npm run lint` (`tsc -b --noEmit`) exits 0 with all Phase 6 files staged |
| i18n parity | `node scripts/check-i18n-parity.mjs` exits 0 on every commit |
| No dynamic keys | `grep -r "t(\`" frontend/src/components/character/` returns nothing |
| No wholesale data replace | `grep -rn "data: {" frontend/src/components/character/` — must return nothing with `charGender`, `charVibe`, etc. inside |
| No direct `localStorage.setItem` without try/catch | `grep -n "localStorage.setItem" frontend/src/store/characterPresets.ts` — only inside persist middleware (not manual writes) |

### Per-pitfall guardrail checks

**Pitfall #4 (framing anchors):**
- Open character node, open wizard, navigate to Review step, inspect the prompt preview
- Must begin with `"Studio portrait headshot of a"` and end with `"photorealistic, ultra-detailed, consistent character reference"`
- Grep gate: `grep -n "FRAMING_ANCHORS" frontend/src/lib/character/buildCharacterPrompt.ts` must return the frozen constant; it must not have been reassigned

**Pitfall #5 (wizard discard-on-cancel):**
- Open wizard on node A, fill fields, press ESC → wizard unmounts, no PATCH sent (check Network tab: no `PATCH /api/nodes/{id}` call on close)
- Reopen same node A → wizard fields are blank (D-03 confirms intentional; no draft restore)
- Verify: `node.data` on node A unchanged after the ESC (no partial values persisted)

**Pitfall #6 (per-step validation):**
- Open wizard, skip to Step 4 (Expression), type one character in Extras, click Generate from Step 1 without visiting Review → generation must dispatch. The Generate CTA must be enabled (not grayed) whenever `canGenerate` is true regardless of current step.

**Pitfall #10 (library/Reference isolation):**
- Save 3 presets, then in browser console: `fetch("/api/references").then(r => r.json()).then(console.log)` — response must contain zero entries added by the wizard (existing character image references are unaffected)
- Check localStorage: `localStorage.getItem("flowboard.character.presets.v1")` contains the 3 presets; `localStorage.getItem("flowboard.references.panel.v1")` is unchanged

**Pitfall #11 (quota error toasted, 50-cap enforced):**
- Save 50 presets. Attempt to save a 51st → Toaster shows `wizard.error.preset_cap` copy. No write occurs: `localStorage.getItem("flowboard.character.presets.v1")` parsed length is still exactly 50.
- Cannot easily trigger a real QuotaExceededError in a test; the try/catch inside persist middleware is the correctness guarantee. Code review: confirm the Zustand persist middleware's storage write is the ONLY write path (no manual `localStorage.setItem` calls in the store).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prompt assembly | New prompt string builder in wizard submit | `buildCharacterPrompt` from `lib/character/buildCharacterPrompt.ts` | Framing anchors frozen; A/B parity required |
| Delta patch calculation | Construct full `data` blob from wizard state | `toCharacterDataPatch` from `lib/character/toDataPatch.ts` | Null-sentinel contract; prevents Pitfall #1 |
| Node data migration | Inline `charCountry` → `charEthnicity` conversion in wizard | `migrateCharacterNodeData` from `lib/character/migrate.ts` | Idempotent, already tested in Phase 5 |
| localStorage persistence | Manual `useEffect` writing to localStorage | Zustand `persist` middleware (already installed) | StrictMode-safe; handles serialization; version support |

---

## Common Pitfalls (Phase 6 specific)

### `refreshBoardState` missing character fields
The board store's polling path omits all v1.1 char fields from node hydration. Fix in Wave 0; verified by opening a char node during a pipeline run and checking `node.data.charEthnicity` is populated.

### Wizard fields accidentally stored as translated labels
`charVibe` on `node.data` must be the stable key `"clean"` not the display label `"Clean Girl"`. The constant lookup table pattern (§4) prevents this — the `key` property, not the `t(i18nKey)` result, is stored.

### `onRehydrateStorage` callback timing
The `onRehydrateStorage` callback receives `(state, error)`. When `error` is non-null (deserialization error), `state` may be `undefined`. Call `useCharacterPresetsStore.setState(...)` explicitly rather than mutating `state` directly — the reference may be stale.

---

## Environment Availability

Step 2.6 SKIPPED — Phase 6 is purely frontend code with no external tool dependencies beyond what is already installed.

---

## Validation Architecture

No frontend test runner exists (`package.json` has no test script). Per REQUIREMENTS.md and CLAUDE.md: "No frontend test framework configured." All verification is manual / TypeScript strict / grep-gate / browser-runtime.

Verification gates per wave:
- **Wave 0 gate:** `npm run lint` exits 0 with schema extensions and `refreshBoardState` fix
- **Wave 1 gate:** `npm run lint` exits 0 + `check-i18n-parity.mjs` exits 0
- **Phase gate:** All pitfall guardrail checks pass manually; `check-i18n-parity.mjs` exits 0; `tsc -b --noEmit` exits 0

---

## Security Domain

No authentication, no new API surfaces, no server-side changes. Phase 6 is localStorage reads/writes and React component composition. The `onRehydrateStorage` safeParse prevents corrupt JSON from crashing the app. ASVS categories V5 (Input Validation) is covered by Zod schema guards; all others are not applicable to this phase.

---

## Sources

**All claims verified by direct codebase read in this session:**
- `frontend/src/lib/character/schema.ts` — confirmed `PersistedPresetSchema` does NOT exist yet; `charHairColor`/`charHairStyle` absent
- `frontend/src/lib/character/buildCharacterPrompt.ts` — confirmed `charHair` slot location and `FRAMING_ANCHORS` position
- `frontend/src/lib/character/migrate.ts` — confirmed existing step structure for extension
- `frontend/src/lib/character/toDataPatch.ts` — confirmed null-sentinel contract
- `frontend/src/store/board.ts` (lines 32–111, 260–461) — confirmed `refreshBoardState` gap; confirmed `charHairColor`/`charHairStyle`/`charExtras` absent from `FlowboardNodeData`; confirmed hydration mapping in 3 functions
- `frontend/src/store/pipeline.ts` — confirmed `refreshBoardState` call sites (lines 30, 58)
- `frontend/src/store/references.ts` — analog persist pattern for `characterPresets.ts`
- `frontend/src/components/GenerationDialog.tsx` (lines 1–100, 620–665, 740–760, 850–942) — confirmed `{isCharacter}` block location, existing `canGenerate` check, `dispatchGeneration` call signature
- `frontend/src/components/Toaster.tsx` — confirmed priority chain `chat > pipeline > generation > board`
- `frontend/src/i18n/i18n.ts` and `i18n.d.ts` — confirmed `CustomTypeOptions` in `.d.ts`, `typeof en` auto-expansion pattern
- `frontend/src/i18n/locales/en.json` — confirmed wizard keys absent; existing `dialog.gender_label` etc. in place
- `.planning/phases/06-wizard-ui-preset-library/06-CONTEXT.md` — D-01 through D-21 locked decisions
- `.planning/phases/06-wizard-ui-preset-library/06-UI-SPEC.md` — full key inventory, CSS class list, interaction contract
- `.planning/research/PITFALLS.md` — Pitfalls #4, #5, #6, #10, #11 prevention contracts

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `crypto.randomUUID()` is available in all Chromium targets used by Flowboard | §1 | ID generation fails; fallback: `Date.now().toString(36) + Math.random().toString(36)` |

**All other claims verified by direct codebase read. No package legitimacy audit needed — zero new npm packages are introduced.**

---

## Metadata

**Confidence breakdown:**
- Schema extension: HIGH — read exact file; confirmed absent fields
- Store slice shape: HIGH — analog from `references.ts` confirmed; Zustand persist middleware confirmed installed
- Toaster integration: HIGH — read exact priority chain from `Toaster.tsx`
- Component decomposition: HIGH — follows established codebase naming and structure conventions
- `refreshBoardState` gap: HIGH — confirmed by direct read of lines 426–461; fields are visibly absent
- `buildCharacterPrompt` update: HIGH — read exact function; hair slot confirmed at line 62
- i18n key count: HIGH — counted from UI-SPEC §6 inventory; 102 keys enumerated

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable stack — no fast-moving dependencies introduced)
