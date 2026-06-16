# Architecture Research

**Domain:** Character wizard integration into an existing canvas-driven AI generation pipeline
**Researched:** 2026-06-16
**Confidence:** HIGH — based on direct code analysis of every affected file

---

## Questions Answered

### 1. WHERE does the wizard mount?

**Decision: replace the `isCharacter` block inside `GenerationDialog` with the multi-step wizard; do NOT create a second modal.**

`GenerationDialog.tsx` already owns the character path as a full-screen dialog opened by `openGenerationDialog()`. The relevant render path is `rfId !== null && isCharacter → show character UI`. Today that block is ~70 lines of inline JSX (gender chips, country chips, vibe chips, extras textarea). The wizard replaces that inline block with a `<CharacterWizard>` component mounted inside the same dialog wrapper — the backdrop, header, footer, and focus trap all stay.

Why not a separate modal:
- Every existing pattern in the codebase uses one modal type: the single `gen-dialog` with conditional branches per `targetType` (image, video, character, storyboard, prompt). A second modal layer would need its own backdrop, focus-trap, and ESC handler — duplicating ~80 lines of infrastructure.
- The wizard needs to call `dispatchGeneration()` and `closeGenerationDialog()` on completion, which are both on the `generationStore`. Nesting a second modal adds indirection with no benefit.
- When the user clicks Generate on a character node (in `CharacterBody` → `openGenerate()` → `openGenerationDialog(rfId, prompt)`), the store already sets `openDialog.rfId`. Anything that re-uses that existing trigger path gets the dialog open for free.

Why not swap into `NodeCard`:
- `NodeCard` renders on the infinite canvas. Character generation requires a prompt-builder with up to 5 steps plus a preset library. Mounting that on the card violates the card's single-responsibility: it renders thumbnails and routes to dialogs, never performs multi-step composition itself. This is the same reason `GenerationDialog` exists for image/video.

**Mount point: replace `{isCharacter && (...)}` block in `GenerationDialog.tsx` with `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />`.**

The `CharacterWizard` receives `rfId` (to PATCH the node on dispatch) and `onDone` (to close the dialog). It calls `useGenerationStore.getState().dispatchGeneration()` itself on the final step — same as the existing `isCharacter` branch does today.

---

### 2. WHICH Zustand store owns wizard state?

**Decision: local component state inside `CharacterWizard`, NOT a new store slice, NOT an extension of `generation.ts`.**

The wizard state is transient: it lives only while the dialog is open. When the user closes the dialog (ESC or cancel), none of the wizard's in-progress selections should be remembered — this matches the existing `GenerationDialog` behaviour (`useEffect` on `rfId` resets `charGender/charCountry/charVibe/charExtras` to null each time). A Zustand slice for ephemeral per-session input is overkill and creates cleanup bugs (forgetting to clear on close is the classic anti-pattern in this codebase).

The library of saved presets is a different concern — it needs to survive across dialog sessions and board switches, so it DOES need a store (see Question 5 for the decision between localStorage and Reference rows).

`generation.ts` already owns `openDialog`, `dispatchGeneration`, and `paygateTier`. Adding wizard step state there would make the slice aware of character-specific semantics it currently doesn't care about. The wizard calling `useGenerationStore.getState().dispatchGeneration()` at the end is the correct boundary: generation store is the sink, not the container.

**Wizard transient state: `useState` inside `CharacterWizard`. Saved-preset library: a dedicated `characterPresets.ts` Zustand slice (see below).**

---

### 3. HOW are structured fields persisted to `node.data`?

**Decision: flat keys at the top level of `node.data`, each prefixed with `char`. NOT a nested `character: { ... }` object.**

The PATCH contract at `routes/nodes.py:76-121` is a **one-level shallow merge**. From the docstring: "if a key's value is itself a dict, the new dict REPLACES the old one (no recursive merge)". If structured fields are stored as a nested object:

```typescript
// WRONG — nested object
patchNode(dbId, { data: { character: { gender: "female", hair: "curly" } } })
// → replaces the entire `character` key, losing any sub-keys the caller omitted
```

Flat keys are safe with shallow-merge:

```typescript
// CORRECT — flat keys merge safely
patchNode(dbId, { data: { charGender: "female", charHair: "curly" } })
// → only charGender and charHair are touched; all other node.data keys survive
```

The existing code already uses this pattern: `charCountry`, `charVibe`, `charGender` are all flat on `FlowboardNodeData` (board.ts:84-88). The v1.1 wizard extends this set with additional flat keys rather than grouping them.

**New flat keys to add to `FlowboardNodeData`:**

```typescript
// Character identity
charGender?: string;          // already exists
charEthnicity?: string;       // replaces charCountry (see migration section)
charAge?: string;             // e.g. "young adult", "middle-aged", "elder"

// Appearance
charHair?: string;            // e.g. "long wavy black hair"
charSkinTone?: string;        // e.g. "fair", "tan", "deep"

// Styling / vibe
charVibe?: string;            // already exists (key from CHARACTER_VIBES)
charOutfit?: string;          // free-text or enum key

// Expression / lighting
charExpression?: string;      // e.g. "confident smile", "neutral"
charLighting?: string;        // e.g. "soft daylight", "studio"

// Extras
charExtras?: string;          // already exists (free-text)

// Deprecated (keep for read-only backward compat, strip on save)
charCountry?: string;         // legacy — map to charEthnicity on read
```

Each PATCH on dispatch sends only the keys that have values — the `Object.keys(charStamp).filter(k => charStamp[k] != null)` pattern from the existing `isCharacter` branch in `GenerationDialog.tsx:646-651`.

The `null`-sentinel behaviour (PATCH with `{ charCountry: null }` deletes the key) means migration can strip old keys by patching them to null after writing the new equivalents.

---

### 4. HOW is the prompt assembled at dispatch?

**Decision: extract `buildCharacterPrompt` into `frontend/src/lib/character/buildCharacterPrompt.ts`; keep framing anchors there too.**

Today `buildCharacterPrompt` is a module-scope function in `GenerationDialog.tsx` (lines 45-74). It takes `(gender, country, vibe, extras)` and returns a string. The wizard replaces the country+vibe model with structured fields (ethnicity, hair, outfit, expression, lighting), so the function signature changes. When a function's signature and responsibility both change, it's the right time to move it to a dedicated module.

The existing lib pattern is `frontend/src/lib/storyboardPrompt.ts` — a pure function module for prompt assembly that is imported by `GenerationDialog.tsx`. `buildCharacterPrompt` should follow the same pattern.

**New module:** `frontend/src/lib/character/buildCharacterPrompt.ts`

```typescript
// Pure function — no imports from stores or React
export interface CharacterConfig {
  gender?: string;
  ethnicity?: string;
  age?: string;
  hair?: string;
  skinTone?: string;
  vibe?: string;
  outfit?: string;
  expression?: string;
  lighting?: string;
  extras?: string;
}

export function buildCharacterPrompt(config: CharacterConfig): string {
  // Subject line assembly
  const descriptors = [config.ethnicity, config.age, config.gender].filter(Boolean);
  const subject = descriptors.join(" ") || "person";

  // Vibe tokens from CHARACTER_VIBES lookup (or free-text if vibe not found)
  const vibeTokens = resolveVibeTokens(config.vibe);

  // Framing anchors — front-loaded per the existing comment in GenerationDialog.tsx:
  // "diffusion models weight earlier tokens more — vibe tokens like 'editorial /
  // magazine beauty' otherwise pull toward fashion 3/4 turns"
  return [
    `Studio portrait headshot of a ${subject} character`,
    "subject directly faces the camera, head perfectly straight with zero tilt and zero turn",
    "shoulders square to camera, axially symmetric pose, nose centered, both eyes equally visible at the same height",
    config.hair || null,
    config.skinTone ? `${config.skinTone} skin` : null,
    config.outfit || null,
    ...vibeTokens,
    config.expression || null,
    config.lighting || null,
    config.extras?.trim() || null,
    "head and shoulders framing, centered composition, sharp focus on face",
    "strictly front-on orientation, no head tilt, no head turn, no profile angle, no three-quarter view, no over-the-shoulder pose",
    "no glasses, no hat, no mask, no occlusion, nothing covering the face",
    "photorealistic, ultra-detailed, consistent character reference",
  ]
    .filter(Boolean)
    .join(", ");
}
```

The framing anchors (frontal face, both eyes, head-and-shoulders, no occlusion) belong in this file alongside the rest of the prompt assembly. They are generation constraints, not UI labels, and should never appear in locale JSON files.

`GenerationDialog.tsx` replaces its local `buildCharacterPrompt` call with an import from the lib module.

---

### 5. DECISION: localStorage Zustand slice vs Reference table for saved presets

**Decision: localStorage-backed Zustand slice (`characterPresets.ts`).**

This is the only true decision point where both paths are architecturally viable, so the comparison is laid out explicitly.

#### Trade-off table

| Criterion | localStorage Zustand slice | Reference rows (ai_brief piggyback) |
|-----------|---------------------------|--------------------------------------|
| **Cross-device sync expectation** | N/A — app is local-only single-user. Both are equally bad (neither syncs). | N/A — same. |
| **Discoverability with existing ReferencesPanel** | Presets are NOT in the References panel. They live in a separate "Presets" section inside the wizard. This is better: presets are configuration, not media. References are media. Conflating them pollutes the References panel with non-draggable non-media items. | Presets appear in the References panel alongside character images. Users would see config items mixed with media thumbnails. The panel's thumbnail-first UX breaks because presets have no mediaId. The `kind=character` filter already shows saved character *images*, not character *configurations* — these are different things. |
| **Round-trip safety** | Native. localStorage stores the `CharacterConfig` object as JSON. No encoding/decoding layer; TypeScript types are preserved across serialization. Corrupt entry can be caught and dropped at load time. | Config must be serialized into `ai_brief: string` (max length governed by frontend — no DB column constraint). A read-back requires `JSON.parse(ai_brief)` with a try/catch. The `ai_brief` field is also populated by the LLM vision service — if a user saves a character image AND the vision service later overwrites `ai_brief`, the config is silently destroyed. The PATCH merge contract (ai_brief is a single string scalar, not a dict) means a vision update replaces the whole field. |
| **Future cleanup if backend changes later allowed** | Zero migration burden. Delete the localStorage key and the Zustand slice; replace with a backend-backed store. No backend rows to clean up. The `character_presets` localStorage key is namespaced (`flowboard.character.presets.v1`) so future migrations can increment the version suffix. | Migration requires DELETE + re-create of Reference rows, or a schema change to add a `config` JSON column to Reference. Either way is a backend-touching migration that this milestone explicitly excludes. |
| **Offline / persistence guarantee** | localStorage survives page reload, browser restart. Cleared by the user manually (DevTools) or by OS clearing site data. Acceptable for a local-only desktop app. | SQLite persistence — survives everything. But the same backup story applies; neither has a backup workflow. |
| **Implementation complexity** | 1 new Zustand slice (~80 lines), 1 localStorage key, 0 backend changes. Pattern identical to `references.ts`'s `panelOpen` persistence. | 0 new files, but ~50 lines of encoding/decoding logic in the wizard + risk of silent overwrite from vision service. |
| **Conclusion** | **RECOMMENDED** | Not recommended — round-trip unsafety and polluted References panel are both real costs. |

**The `characterPresets.ts` Zustand slice:**

```typescript
// frontend/src/store/characterPresets.ts

export interface CharacterPreset {
  id: string;          // nanoid() or crypto.randomUUID()
  name: string;        // user-visible label
  config: CharacterConfig;
  createdAt: string;   // ISO
}

interface CharacterPresetsState {
  presets: CharacterPreset[];
  save(name: string, config: CharacterConfig): void;
  remove(id: string): void;
  rename(id: string, name: string): void;
  clearError(): void;
  error: string | null;
}
```

Persisted to `flowboard.character.presets.v1` localStorage key as a JSON array. Load on slice init (same pattern as `loadPersistedPanelOpen()` in `references.ts:44-53`). Max cap of 50 presets (configurable constant) prevents unbounded localStorage growth.

---

### 6. BUILD ORDER

The dependency graph forces this order:

**Phase 1 — Data model + migration (foundation)**
- Add new flat keys (`charEthnicity`, `charAge`, `charHair`, `charSkinTone`, `charOutfit`, `charExpression`, `charLighting`) to `FlowboardNodeData` in `store/board.ts`
- Add `charExtras` to `FlowboardNodeData` if not already there (it's dialog-local today, never persisted — now it should be)
- Write `migrateCharacterNodeData(data: FlowboardNodeData): FlowboardNodeData` in `frontend/src/lib/character/migrate.ts`: maps `charCountry → charEthnicity` (using the existing `CHARACTER_COUNTRIES` tag field as the ethnicity string, e.g. `"vn" → "Vietnamese"`), then returns the data with `charCountry` stripped
- Add migration call in `store/board.ts` wherever nodes are hydrated from the backend (`loadInitialBoard` and `getBoard` response mapping) — call `migrateCharacterNodeData(node.data)` per node. This is read-time conversion; no backend writes needed
- Move (and expand) `buildCharacterPrompt` into `frontend/src/lib/character/buildCharacterPrompt.ts`
- Create `frontend/src/store/characterPresets.ts` with localStorage persistence

Why first: every subsequent phase depends on the data shape being stable.

**Phase 2 — Wizard UI (replace the inline character builder in GenerationDialog)**
- Create `frontend/src/components/character/CharacterWizard.tsx` — multi-step component with steps: Identity (gender, ethnicity, age) → Appearance (hair, skin tone) → Styling (vibe picker, outfit) → Expression & Lighting → Review
- The Review step renders a preview prompt string using `buildCharacterPrompt` so the user sees what will be dispatched
- Wire the wizard into `GenerationDialog.tsx`: replace the `{isCharacter && (...)}` inline block with `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />`
- The wizard on Submit: calls `patchNode` with the structured fields, then calls `dispatchGeneration` — same as the existing `isCharacter` branch
- The wizard on Cancel: calls `closeGenerationDialog` without patching

**Phase 3 — Library save/list (preset management)**
- Extend the CharacterWizard Review step with a "Save as preset" flow (name input → save button → adds to `characterPresets` store)
- Add a "Load preset" step before Identity that lists saved presets; selecting one populates the wizard fields and jumps to Review
- The preset UI lives inside the wizard, not in `ReferencesPanel` (presets are config, not media)

**Phase 4 — Removal + strip migration**
- Delete `CHARACTER_COUNTRIES` and `CHARACTER_VIBES` from `constants/character.ts` (keep `CHARACTER_GENDERS` if still needed, or migrate gender to a string enum in the lib module)
- Delete all imports of `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, `CountryKey`, `VibeKey` from `GenerationDialog.tsx` and any other consumers
- The `countryLabel`, `vibeLabel`, `localizedCountryLabel`, `localizedVibeLabel`, `localizedVibeLabel` functions in `constants/character.ts` can be deleted — the new structured fields use free-text or a new enum set defined in `lib/character/`
- The `ResultViewer` component (not yet read but referenced in CLAUDE.md) renders country/vibe pills under the model badge using these helpers — update it to render the new structured fields instead
- Verify `check-i18n-parity.mjs` stays green after removing old character i18n keys

**Phase 5 — i18n coverage**
- Add EN + TR strings for every new wizard surface: step titles, field labels, placeholder text, preset save/load UI
- Remove stale i18n keys from v1.0's `character.*` namespace that no longer have references (or repurpose them where labels overlap)
- Run `scripts/check-i18n-parity.mjs` — must stay green throughout

---

### Migration concern: existing `charCountry` + `charVibe` nodes

Boards with nodes carrying `charCountry` and `charVibe` must not produce console errors or broken UI after v1.1.

**Safe path: convert-on-read, strip-on-save.**

1. `migrateCharacterNodeData()` in `frontend/src/lib/character/migrate.ts` runs on every node hydrated from the backend. It maps:
   - `charCountry: "vn"` → `charEthnicity: "Vietnamese"` (using `CHARACTER_COUNTRIES.find(c => c.key === charCountry)?.tag`)
   - `charVibe: "clean"` → `charVibe: "clean"` (unchanged — vibe keys are stable, even if the preset expand later)
   - Then deletes `charCountry` from the in-memory data object

2. The conversion is NOT written back to the backend at load time (no PATCH on hydration). It's only written back when the user next saves a generation or edits the node. This avoids a mass-write on first load of any old board.

3. The `ResultViewer` reading `data.charCountry` to render the "Country" pill must be updated to read `data.charEthnicity` instead. Until Phase 4 removes the old constants, the viewer can support both: `data.charEthnicity ?? countryLabelLookup(data.charCountry)`.

4. Old boards with `charVibe` continue to work because the wizard's Styling step includes a vibe picker that maps onto the same `VibeKey` enum. The `buildCharacterPrompt` function in the lib module handles a `vibe` string the same way the existing function handles `VibeKey`.

**There is no one-time strip migration needed** because the convert-on-read strategy means every resaved node naturally moves to the new schema over time, and the old schema is still readable until it's replaced.

---

## Component Boundaries

### New components / files

| File | Type | Responsibility |
|------|------|----------------|
| `frontend/src/lib/character/buildCharacterPrompt.ts` | Pure function module | Assemble the generation prompt from `CharacterConfig`; contains framing anchors |
| `frontend/src/lib/character/migrate.ts` | Pure function module | `migrateCharacterNodeData()` — charCountry→charEthnicity, strip deprecated keys |
| `frontend/src/store/characterPresets.ts` | Zustand slice | Saved named presets, localStorage-backed, zero backend dependency |
| `frontend/src/components/character/CharacterWizard.tsx` | React component | Multi-step wizard; receives `rfId` + `onDone`; owns transient step state; calls `dispatchGeneration` on submit |
| `frontend/src/components/character/PresetList.tsx` | React component | Render + select saved presets from `characterPresets` store; used in wizard Step 0 |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/components/GenerationDialog.tsx` | Replace `{isCharacter && (...)}` inline block with `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />`; remove imports of `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, `CountryKey`, `VibeKey`; remove local `buildCharacterPrompt` definition |
| `frontend/src/store/board.ts` — `FlowboardNodeData` | Add new flat char* keys; call `migrateCharacterNodeData` in the board hydration path |
| `frontend/src/constants/character.ts` | Phase 4: delete `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`; keep or migrate `CHARACTER_GENDERS` and the `localizedGenderLabel` helper |
| `frontend/src/components/ResultViewer.tsx` | Update country/vibe pill rendering from `charCountry/charVibe` lookups to `charEthnicity/charVibe` from new schema |
| `frontend/src/i18n/locales/en.json` + `tr.json` | Add wizard strings; remove stale character.country.* and character.vibe.* keys that are no longer referenced |

### Unchanged files (confirmed no changes needed)

| File | Reason |
|------|--------|
| `agent/flowboard/routes/nodes.py` | Shallow-merge PATCH handles any flat key without schema changes |
| `agent/flowboard/db/models.py` | `Node.data` is a free-form JSON column — no migration needed |
| `frontend/src/store/generation.ts` | `dispatchGeneration()` is called by the wizard unchanged — no new params needed (the prompt is already a string by then) |
| `frontend/src/store/references.ts` | Presets are NOT stored in References — separate slice |
| `frontend/src/canvas/NodeCard.tsx` — `CharacterBody` | The "Upload / Generate" empty state and the avatar filled state are unchanged; only the dialog behind "Generate" changes |

---

## Data Flow

### Character generation (v1.1)

```
User clicks Generate on a character node
    ↓
NodeCard.CharacterBody.openGenerate()
    ↓
useGenerationStore.openGenerationDialog(rfId, "")
    ↓
GenerationDialog renders → isCharacter → <CharacterWizard rfId={rfId} onDone={close} />
    ↓
CharacterWizard: user steps through Identity → Appearance → Styling → Expression → Review
    (transient state: useState inside CharacterWizard)
    ↓
CharacterWizard.handleSubmit():
  1. buildCharacterPrompt(config) → promptString
  2. useBoardStore.getState().updateNodeData(rfId, charFields)
  3. patchNode(dbId, { data: charFields })     ← flat keys, shallow-merge safe
  4. useGenerationStore.getState().dispatchGeneration(rfId, { prompt, aspectRatio })
  5. onDone()  [= closeGenerationDialog()]
    ↓
generation.ts poll loop → node.data update on done
```

### Preset save/load

```
User on Review step → "Save as preset" → enters name → PresetList.save()
    ↓
characterPresets.save(name, config)
    ↓
localStorage.setItem("flowboard.character.presets.v1", JSON.stringify([...presets]))

User opens wizard → Step 0 "Load preset" → <PresetList> renders saved presets
    ↓
User selects preset → wizard fields populated from preset.config → skip to Review step
```

### Legacy node hydration (migration)

```
board.ts: loadInitialBoard() → GET /api/boards/{id}
    ↓
nodes from backend → map(node => ({
  ...node,
  data: migrateCharacterNodeData(node.data)  // charCountry → charEthnicity
}))
    ↓
In-memory store has migrated data; backend row unchanged until next PATCH
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Nesting character config under a single `character` key in `node.data`

**What people do:** Store `node.data.character = { gender: "female", ethnicity: "Vietnamese", hair: "...", ... }` to group the fields logically.

**Why it's wrong:** The PATCH route does a one-level shallow merge. A PATCH of `{ data: { character: { hair: "straight" } } }` replaces the entire `character` object, losing `gender`, `ethnicity`, and every other field the caller didn't include. The docstring in `routes/nodes.py` explicitly documents this: "if a key's value is itself a dict, the new dict REPLACES the old one". This is the documented anti-pattern in CLAUDE.md.

**Do this instead:** Flat `char*` keys at the top level of `node.data`. Each PATCH only needs to include the keys that changed.

### Anti-Pattern 2: Storing preset config inside Reference rows via `ai_brief`

**What people do:** Serialize `CharacterConfig` as JSON into the `ai_brief` string field on an existing Reference row to avoid creating a new store.

**Why it's wrong:** The LLM vision service (`requestAutoBrief`) can overwrite `ai_brief` at any time for any character node that gets media uploaded or regenerated. Since `ai_brief` is a single string scalar, a vision update replaces the config silently. There is no "merge" for string fields — the PATCH sentinel only applies to the `data` dict on Node. Additionally, the References panel is a media-first UI; showing non-media preset rows in it creates a broken UX (no thumbnail, no media_id, not draggable to canvas).

**Do this instead:** A dedicated `characterPresets.ts` Zustand slice with localStorage persistence. Zero collision risk with the vision service; zero pollution of the References panel.

### Anti-Pattern 3: Writing migration back to backend at board load time

**What people do:** On hydration, call `patchNode()` for every character node that has `charCountry` to strip and convert it — a "one-time migrate on first load" approach.

**Why it's wrong:** On a board with 20 character nodes, this fires 20 PATCH requests before the user has done anything. It creates a false impression that the board has been modified. It burns requests against the local agent on every first load after upgrade. And it introduces a race with the component mount rendering the data before the PATCH completes.

**Do this instead:** Convert-on-read in the in-memory hydration path (inside `loadInitialBoard`'s node mapping). The backend row remains in the old schema until the user naturally triggers a write (generation, explicit save). Migrate silently as users work, without a thundering-herd of PATCHes on startup.

### Anti-Pattern 4: Putting wizard transient step state in a Zustand store

**What people do:** Create `useCharacterWizardStore` with `currentStep`, `selectedGender`, `selectedHair`, etc. and manage wizard navigation there.

**Why it's wrong:** Zustand slices are for state that needs to survive across component remounts or be read by components outside the wizard tree. The wizard mounts only while the dialog is open and unmounts when it closes. Its step selections are discarded on close. Putting them in a store means they accumulate stale data between dialog sessions and require explicit cleanup actions (the reset-on-open pattern already used for `charGender`/`charVibe` in `GenerationDialog`'s `useEffect` on `rfId` is a smell that the state shouldn't be in a shared slice in the first place). Local `useState` + resetting when the component unmounts is simpler and correct.

**Do this instead:** `useState` for all transient wizard form state inside `CharacterWizard`. Only the library of saved presets goes in a store.

---

## Integration Points

### CharacterWizard ↔ generation store

The wizard calls `useGenerationStore.getState().dispatchGeneration(rfId, opts)` directly — the same pattern used by the existing `isCharacter` branch in `GenerationDialog`. No new store API needed.

### CharacterWizard ↔ board store

The wizard calls `useBoardStore.getState().updateNodeData(rfId, charFields)` for optimistic UI update, then `patchNode(dbId, { data: charFields })` for persistence — identical to the existing pattern.

### characterPresets store ↔ localStorage

`characterPresets.ts` reads from `localStorage.getItem("flowboard.character.presets.v1")` at slice creation time (module-level init in `create<State>()`). Writes happen in `save()` and `remove()`. Pattern directly mirrors `loadPersistedPanelOpen()` / `persistPanelOpen()` in `store/references.ts:44-61`.

### migrateCharacterNodeData ↔ board hydration

`store/board.ts` imports `migrateCharacterNodeData` from `lib/character/migrate.ts` and applies it in the node-mapping step of `loadInitialBoard`. This is the only integration point for migration — no other file needs to call it.

### buildCharacterPrompt ↔ CharacterWizard

`CharacterWizard` imports `buildCharacterPrompt` for the Review step preview and passes the same result to `dispatchGeneration` on Submit. Pure function, no side effects, no store access.

---

## Sources

- Direct code analysis: `frontend/src/components/GenerationDialog.tsx` (character builder, buildCharacterPrompt, dispatch path)
- Direct code analysis: `frontend/src/canvas/NodeCard.tsx` (CharacterBody, modal trigger pattern)
- Direct code analysis: `frontend/src/store/board.ts` (FlowboardNodeData interface, charCountry/charVibe/charGender fields)
- Direct code analysis: `frontend/src/store/generation.ts` (dispatchGeneration signature, store boundaries)
- Direct code analysis: `frontend/src/store/references.ts` (localStorage persistence pattern)
- Direct code analysis: `frontend/src/components/ReferencesPanel.tsx` (media-first UX, Reference kind semantics)
- Direct code analysis: `agent/flowboard/routes/nodes.py` (shallow-merge PATCH contract, null-sentinel behaviour)
- Direct code analysis: `agent/flowboard/db/models.py` (Reference.ai_brief field, Node.data JSON column)
- Direct code analysis: `frontend/src/constants/character.ts` (CHARACTER_COUNTRIES tags used for migration mapping)
- Project context: `CLAUDE.md` anti-pattern "Wholesale replace of node.data JSON column"
- Project context: `.planning/PROJECT.md` v1.1 milestone scope and constraints

---

*Architecture research for: character wizard integration into Flowboard canvas generation pipeline*
*Researched: 2026-06-16*
