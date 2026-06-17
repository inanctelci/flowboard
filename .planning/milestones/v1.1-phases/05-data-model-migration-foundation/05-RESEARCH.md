# Phase 5: Data Model + Migration Foundation — Research

**Researched:** 2026-06-16
**Domain:** TypeScript data-model extension, Zod 4 schema, pure-function prompt assembly, convert-on-read migration
**Confidence:** HIGH — all decisions grounded in direct code analysis of live files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Flat top-level `char*` keys on `FlowboardNodeData` — NO nested `character: { ... }` object.
- D-02: Legacy `charCountry`, `charVibe`, `charGender` retained as `?: string` until Phase 7 removes them.
- D-03: Values stored in `node.data` are stable English keys or user-typed English prose. Never translated display labels.
- D-04: `charHair` is a single composite string for Phase 5.
- D-05: `CharacterConfigSchema` in `frontend/src/lib/character/schema.ts` using `zod@^4`.
- D-06: All Zod fields are `.optional()`.
- D-07: `.safeParse()` at every boundary; failures route to a store `error` slot via `console.warn` — never throw to the React tree.
- D-08: Versioned envelope `{ version: 1, data: CharacterConfig }` for persisted blobs.
- D-09: New module `frontend/src/lib/character/buildCharacterPrompt.ts` — pure function, no React/Zustand.
- D-10: Locked token order: `subject anchor → ethnicity → age → gender → hair → outfit → vibe tokens → expression → lighting → framing anchors → negative constraints`.
- D-11: Unset fields contribute zero tokens (`.filter(Boolean)`). No `undefined`/`null`/`"unknown"` in final prompt.
- D-12: Token delimiter `", "`. Framing anchors frozen.
- D-13: `toDataPatch(next, prev)` in `frontend/src/lib/character/toDataPatch.ts`. Emits only changed keys.
- D-14: Cleared fields (`prev` has value, `next` does not) → `key: null`.
- D-15: Unchanged fields → omit entirely.
- D-16: Verified by worked example: single-field change emits one-key patch; no non-character keys emitted.
- D-17: File name and export name within `frontend/src/lib/character/` at planner's discretion (file name suggested in CONTEXT.md).
- D-18: `frontend/src/lib/character/migrate.ts` exports `migrateCharacterNodeData(data: FlowboardNodeData): FlowboardNodeData` — pure, idempotent.
- D-19: Migration map sourced from `CHARACTER_COUNTRIES[n].tag`; unknown `charCountry` values → skip.
- D-20: `charVibe` retained as-is for Phase 5.
- D-21: Migration runs in `loadInitialBoard` hydration path only. NO automatic PATCH to backend.
- D-22: Idempotency: if `charEthnicity` already set, skip.

### Claude's Discretion
- File / module boundary names within `frontend/src/lib/character/`.
- Whether to use a barrel `index.ts` or direct leaf imports (project convention: no barrels → leaf imports preferred).
- Whether `FRAMING_ANCHORS` constant lives in the assembler file or a separate `constants.ts` (co-location preferred).
- Exact set of regional ethnicity buckets and age-range labels at the schema level.

### Deferred Ideas (OUT OF SCOPE)
- Splitting `charHair` into `charHairColor` + `charHairStyle` — Phase 6.
- `characterPresets.ts` Zustand slice with persist middleware — Phase 6 (LIB-01).
- Removing legacy keys from `FlowboardNodeData` — Phase 7 (MIGRATE-02).
- Renaming `charVibe` semantics — Phase 6 if wizard reshapes vibes.
- Frontend test runner.
- `ResultViewer.tsx` updates — Phase 7 (MIGRATE-03).
- New i18n keys — Phase 5 introduces no user-visible strings.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | `FlowboardNodeData` extended with flat top-level character fields | See §6: Hydration insertion point; §1: Module boundaries |
| DATA-02 | `CharacterConfig` Zod schema as single source of truth | See §2: Zod schema concrete shape |
| DATA-03 | Pure prompt-assembler module `buildCharacterPrompt.ts` | See §3: Token order; §Code Examples |
| DATA-04 | `toDataPatch` helper, delta-only patches, null sentinel | See §4: toDataPatch behavior |
| DATA-05 | Stable English keys in `node.data` — never translated labels | Enforced by D-03; schema uses English values |
| MIGRATE-01 | Convert-on-read migration in `loadInitialBoard` | See §5: migrateCharacterNodeData; §6: Hydration insertion point |
</phase_requirements>

---

## Summary

Phase 5 lands the stable, locale-independent character data contract. All six deliverables are pure TypeScript — no React component work, no backend changes, no i18n keys. The sole runtime dependency added is `zod` (one `npm install`).

The work is entirely mechanical once the decisions in CONTEXT.md are applied. Every pattern has a direct analog in the existing codebase: `buildCharacterPrompt.ts` mirrors `storyboardPrompt.ts`, `toDataPatch.ts` mirrors the `DataPatch` type in `client.ts`, `migrate.ts` mirrors the `edgeFromDto` mapper in `board.ts`, and the `FlowboardNodeData` extension is an in-place addition to the existing interface. Zod schema is the only genuinely new pattern.

The single highest-risk task is the `loadInitialBoard` hydration insertion: the same data-mapping block appears verbatim in both `loadInitialBoard` and `switchBoard` (lines 264–288 and 320–344 of `board.ts`). Both must receive the `migrateCharacterNodeData` wrapper or old boards will migrate correctly on initial load but revert when the user switches boards.

**Primary recommendation:** Write all four lib modules as pure-function files with no imports from React or Zustand. Extend `FlowboardNodeData` in-place. Wrap both hydration sites in `board.ts` with `migrateCharacterNodeData`. Install `zod` first.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema definition + type derivation | `lib/character/schema.ts` | — | Single source of truth; no React/Zustand dependency |
| Prompt assembly | `lib/character/buildCharacterPrompt.ts` | — | Pure function; called by GenerationDialog (Phase 6) and wizard Review step |
| PATCH delta computation | `lib/character/toDataPatch.ts` | `api/client.ts` (DataPatch type) | Pure function; produces the shape `patchNode` expects |
| Convert-on-read migration | `lib/character/migrate.ts` | `store/board.ts` (call site) | Pure function; invoked at hydration boundary |
| Data contract (node.data keys) | `store/board.ts` FlowboardNodeData | Backend JSON column (no schema change) | Interface extension in-place; backend `Node.data` is free-form JSON |

---

## 1. Module Boundaries

**Directory:** `frontend/src/lib/character/` (create new directory)

**Files for Phase 5 only:**

| File | Exports | Imports |
|------|---------|---------|
| `schema.ts` | `CharacterConfigSchema`, `CharacterConfig`, `VersionedCharacterConfig`, `CHARACTER_CONFIG_VERSION`, `GenderKey`, `EthnicityKey`, `AgeKey`, `ExpressionKey`, `LightingKey` | `zod` only |
| `buildCharacterPrompt.ts` | `buildCharacterPrompt`, `FRAMING_ANCHORS` | `./schema` (for `CharacterConfig` type only) |
| `toDataPatch.ts` | `toDataPatch` | `../api/client` (DataPatch type), `./schema` (CharacterConfig type) |
| `migrate.ts` | `migrateCharacterNodeData`, `LEGACY_COUNTRY_TO_ETHNICITY` | `../store/board` (FlowboardNodeData type), `../constants/character` (CHARACTER_COUNTRIES — read-only, Phase 5 only) |

**No barrel `index.ts`.** Project convention (CLAUDE.md §"Barrel Files"): no barrel files in `frontend/src/`. Every consumer imports directly from the leaf module:
- `board.ts` imports from `../lib/character/migrate`
- `GenerationDialog.tsx` (Phase 6) imports from `../lib/character/buildCharacterPrompt`
- The wizard (Phase 6) imports from `../lib/character/toDataPatch` and `../lib/character/schema`

**Why no barrel:** CLAUDE.md explicitly states "Frontend has no barrel files. Every consumer imports directly from the leaf module." Adding an `index.ts` would create a new pattern.

---

## 2. Zod Schema: CharacterConfigSchema

**File:** `frontend/src/lib/character/schema.ts`

```typescript
import { z } from "zod";

// Version sentinel — bump when CharacterConfig shape changes incompatibly.
// The persist middleware in Phase 6 uses this to gate migrations.
export const CHARACTER_CONFIG_VERSION = 1 as const;

// ── Closed enum types (suffix Key per project convention) ─────────────────

export type GenderKey = "male" | "female" | "nonbinary";

// Regional ethnicity buckets (8 regions). Free-text override uses the
// same charEthnicity field with a user-typed English string instead of
// one of these keys — the prompt assembler passes the value through as-is.
export type EthnicityKey =
  | "east-asian"
  | "southeast-asian"
  | "south-asian"
  | "middle-eastern"
  | "african"
  | "latin"
  | "caucasian"
  | "mixed";

// Age buckets mapping to discrete prompt tokens.
export type AgeKey =
  | "teenager"     // 13–17
  | "young-adult"  // 18–25
  | "adult"        // 26–35
  | "middle-aged"  // 36–50
  | "mature"       // 51–65
  | "senior";      // 65+

// Expression keys — peeled out of vibe tokens so expression is
// independently controllable without changing vibe styling.
export type ExpressionKey =
  | "neutral"
  | "soft-smile"
  | "confident"
  | "thoughtful"
  | "custom";    // wizard shows free-text input when this is selected

// Lighting keys — Phase 5 starter set; FIELD-01 (full decoupling from
// vibe tokens) is deferred to a future milestone.
export type LightingKey =
  | "soft-daylight"
  | "studio"
  | "golden-hour"
  | "cinematic"
  | "low-key";

// ── Schema ────────────────────────────────────────────────────────────────

export const CharacterConfigSchema = z.object({
  // Identity
  charGender: z.string().optional(),         // GenderKey or free-text
  charEthnicity: z.string().optional(),      // EthnicityKey or free-text override
  charAge: z.string().optional(),            // AgeKey

  // Appearance
  charHair: z.string().optional(),           // composite: "long wavy black hair"
  charSkinTone: z.string().optional(),       // free-text: "fair", "tan", "deep"

  // Styling
  charVibe: z.string().optional(),           // VibeKey (from existing CHARACTER_VIBES)
  charOutfit: z.string().optional(),         // free-text

  // Expression / lighting
  charExpression: z.string().optional(),     // ExpressionKey or free-text (when "custom")
  charLighting: z.string().optional(),       // LightingKey or free-text

  // Escape hatch
  charExtras: z.string().max(200).optional(),  // 200-char cap per WIZARD-03
});

export type CharacterConfig = z.infer<typeof CharacterConfigSchema>;

// Versioned envelope for localStorage blobs (LIB-01 in Phase 6 will
// wire this into the persist middleware's `version` + `migrate` options).
export const VersionedCharacterConfigSchema = z.object({
  version: z.literal(CHARACTER_CONFIG_VERSION),
  data: CharacterConfigSchema,
});

export type VersionedCharacterConfig = z.infer<typeof VersionedCharacterConfigSchema>;
```

**Usage contract (D-07):**

```typescript
// At every localStorage read boundary — never throw:
const result = VersionedCharacterConfigSchema.safeParse(JSON.parse(raw));
if (!result.success) {
  console.warn("[character] corrupt config blob:", result.error.issues);
  set({ error: "Character config could not be loaded — data may be corrupt." });
  return;
}
const config = result.data.data;
```

**Key decisions in the schema:**

- All fields `.optional()` — the wizard enforces minimum-viable on submit; the schema stays tolerant of partial blobs.
- `charExtras` has a `.max(200)` constraint matching WIZARD-03's 200-char textarea cap.
- Ethnicity values are strings, not a closed Zod enum, because the field supports free-text overrides. `EthnicityKey` is a TS type alias only — it guides the wizard's chip values without restricting what can be stored.
- Same pattern for `charExpression` (supports "custom" with free-text fallback) and `charGender` (non-binary is a third option beyond the legacy 2-gender picker).

---

## 3. buildCharacterPrompt: Token Order and Function Signature

**File:** `frontend/src/lib/character/buildCharacterPrompt.ts`

### Frozen anchor list (from CONTEXT.md §Specifics and existing GenerationDialog.tsx:61-73)

```typescript
// Framing anchors are FROZEN — do not parameterize. Appended after
// styling tokens but before negative constraints so diffusion models
// weight them as corrective constraints, not style descriptors. These
// anchors appear verbatim in the v1.0 buildCharacterPrompt and must
// survive the v1.1 refactor unchanged for generation parity.
const FRAMING_ANCHORS: readonly string[] = [
  "head and shoulders framing, centered composition, sharp focus on face",
  "strictly front-on orientation, no head tilt, no head turn, no profile angle, no three-quarter view, no over-the-shoulder pose",
  "no glasses, no hat, no mask, no occlusion, nothing covering the face",
  "photorealistic, ultra-detailed, consistent character reference",
] as const;
```

### Vibe token resolver

The existing `CHARACTER_VIBES[n].tokens` arrays contain 4-element arrays of multi-clause prompt fragments. The new assembler must continue to spread these into the token list at the `vibe tokens` position in the locked order.

```typescript
import { CHARACTER_VIBES } from "../constants/character";

function resolveVibeTokens(vibe: string | undefined): readonly string[] {
  if (!vibe) return [];
  return CHARACTER_VIBES.find((v) => v.key === vibe)?.tokens ?? [];
}
```

Note: `CHARACTER_VIBES` is imported here only for the vibe token expansion. This import is READ-ONLY and does not conflict with Phase 5's constraint that only `migrate.ts` imports `CHARACTER_COUNTRIES`. The constraint applies specifically to `CHARACTER_COUNTRIES` to avoid new coupling before the migration shim is removed.

### Age-to-prompt-token mapping

Age keys map to English descriptor tokens (not raw keys) in the assembled prompt:

```typescript
const AGE_TOKENS: Record<string, string> = {
  "teenager":    "teenage",
  "young-adult": "young adult",
  "adult":       "adult",
  "middle-aged": "middle-aged",
  "mature":      "mature",
  "senior":      "elderly",
};
```

### Complete function pseudocode

```typescript
export function buildCharacterPrompt(config: Partial<CharacterConfig>): string {
  // 1. Subject anchor — ethnicity + age + gender combined
  const descriptors = [
    config.charEthnicity,
    config.charAge ? AGE_TOKENS[config.charAge] ?? config.charAge : undefined,
    config.charGender,
  ].filter(Boolean);
  const subject = descriptors.join(" ") || "person";
  const subjectAnchor = `Studio portrait headshot of a ${subject} character`;

  // 2. Pose anchor (hardcoded — matches v1.0 exactly)
  const poseAnchor1 =
    "subject directly faces the camera, head perfectly straight with zero tilt and zero turn";
  const poseAnchor2 =
    "shoulders square to camera, axially symmetric pose, nose centered, both eyes equally visible at the same height";

  // 3. Appearance tokens
  const hairToken = config.charHair ?? null;
  const skinToken = config.charSkinTone ? `${config.charSkinTone} skin` : null;
  const outfitToken = config.charOutfit ?? null;

  // 4. Vibe tokens (multi-clause arrays spread inline)
  const vibeTokens = resolveVibeTokens(config.charVibe);

  // 5. Expression
  const expressionToken = config.charExpression ?? null;

  // 6. Lighting
  const lightingToken = config.charLighting ?? null;

  // 7. Extras
  const extrasToken = config.charExtras?.trim() || null;

  // Assemble in locked D-10 order:
  // subject anchor → pose anchors → hair → skin → outfit → vibe tokens
  // → expression → lighting → extras → FRAMING_ANCHORS (negatives included)
  const tokens = [
    subjectAnchor,
    poseAnchor1,
    poseAnchor2,
    hairToken,
    skinToken,
    outfitToken,
    ...vibeTokens,
    expressionToken,
    lightingToken,
    extrasToken,
    ...FRAMING_ANCHORS,
  ].filter(Boolean);

  return tokens.join(", ");
}
```

### A/B parity strategy (D-12)

Feed a v1.0-equivalent config through the new assembler and compare to the old `GenerationDialog.buildCharacterPrompt` output:

**Old call (v1.0):**
```typescript
buildCharacterPrompt("female", "vn", "clean", "")
// → "Studio portrait headshot of a Vietnamese female character, subject directly faces..., ...clean girl tokens..., head and shoulders..."
```

**New call (v1.1):**
```typescript
buildCharacterPrompt({ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" })
// → "Studio portrait headshot of a Vietnamese female character, subject directly faces..., ...clean girl tokens..., head and shoulders..."
```

Expected diff: NONE for gender+ethnicity+vibe input. The assembler produces identical output for the v1.0-equivalent field set. New fields (hair, skin, outfit, expression, lighting) add tokens that old boards will not have — so old boards produce shorter prompts, which is correct (partial fields contribute zero tokens per D-11). Capture the actual diff string in the executor's planning note for MIGRATE-04 verification.

---

## 4. toDataPatch Behavior

**File:** `frontend/src/lib/character/toDataPatch.ts`

**Import:** `DataPatch` from `../api/client` (type-only — do not redeclare).

### Logic

```typescript
export function toDataPatch(
  next: Partial<CharacterConfig>,
  prev: Partial<CharacterConfig>,
): DataPatch {
  const patch: DataPatch = {};
  const keys = new Set([
    ...Object.keys(next),
    ...Object.keys(prev),
  ]) as Set<keyof CharacterConfig>;

  for (const key of keys) {
    const nextVal = next[key];
    const prevVal = prev[key];

    if (nextVal === prevVal) continue;           // unchanged — omit (D-15)

    if (nextVal !== undefined && nextVal !== "") {
      patch[key] = nextVal;                      // changed to new value (D-13)
    } else if (prevVal !== undefined && prevVal !== "") {
      patch[key] = null;                         // cleared — null sentinel (D-14)
    }
    // if both are undefined/empty, no prior value existed; omit
  }

  return patch;
}
```

### Worked examples (D-16)

**Example 1: single-field change**

```
prev = { charVibe: "clean", charGender: "female", charEthnicity: "Vietnamese" }
next = { charVibe: "douyin", charGender: "female", charEthnicity: "Vietnamese" }

toDataPatch(next, prev)
→ { charVibe: "douyin" }
```

Only `charVibe` changed. `charGender` and `charEthnicity` are equal — omitted. `mediaId`, `aiBrief`, `prompt`, and all non-character keys are never in `CharacterConfig` scope — they cannot appear in the output. This prevents PITFALL-1.

**Example 2: cleared field**

```
prev = { charOutfit: "business casual", charGender: "female" }
next = { charGender: "female" }   // user deleted outfit

toDataPatch(next, prev)
→ { charOutfit: null }
```

`charOutfit` had a value in `prev` but is absent (undefined) in `next` → null sentinel. The backend's shallow-merge PATCH with `{ data: { charOutfit: null } }` deletes the key from the SQLite JSON column.

**Example 3: new field on previously empty node**

```
prev = {}
next = { charHair: "long wavy black" }

toDataPatch(next, prev)
→ { charHair: "long wavy black" }
```

**Example 4: no change (noop)**

```
prev = { charGender: "female" }
next = { charGender: "female" }

toDataPatch(next, prev)
→ {}   // empty patch — caller should skip patchNode() if patch is empty
```

Callers should check `Object.keys(patch).length > 0` before calling `patchNode`.

---

## 5. migrateCharacterNodeData: Full Mapping Table

**File:** `frontend/src/lib/character/migrate.ts`

### Legacy charCountry → charEthnicity mapping

Source: `CHARACTER_COUNTRIES[n].tag` from `frontend/src/constants/character.ts` (lines 18–26).

| `charCountry` (legacy key) | `charEthnicity` (new value) | Source tag |
|----------------------------|-----------------------------|------------|
| `"vn"` | `"Vietnamese"` | `CHARACTER_COUNTRIES[0].tag` |
| `"jp"` | `"Japanese"` | `CHARACTER_COUNTRIES[1].tag` |
| `"kr"` | `"Korean"` | `CHARACTER_COUNTRIES[2].tag` |
| `"cn"` | `"Chinese"` | `CHARACTER_COUNTRIES[3].tag` |
| `"th"` | `"Thai"` | `CHARACTER_COUNTRIES[4].tag` |
| `"us"` | `"American"` | `CHARACTER_COUNTRIES[5].tag` |
| `"fr"` | `"French"` | `CHARACTER_COUNTRIES[6].tag` |
| `<unknown>` | _(skip — leave node as-is)_ | D-19 |

### Implementation

```typescript
import { CHARACTER_COUNTRIES } from "../constants/character";
import type { FlowboardNodeData } from "../store/board";

// Build lookup from CHARACTER_COUNTRIES to stay in sync if the
// constants array ever adds entries. Phase 7 (MIGRATE-02) deletes
// CHARACTER_COUNTRIES — at that point this import moves to an inline map.
const LEGACY_COUNTRY_TO_ETHNICITY: Record<string, string> = Object.fromEntries(
  CHARACTER_COUNTRIES.map((c) => [c.key, c.tag]),
);

export function migrateCharacterNodeData(
  data: FlowboardNodeData,
): FlowboardNodeData {
  // Idempotency guard (D-22): if charEthnicity is already set, the node
  // is already migrated — skip to prevent double-execution from StrictMode
  // double-mount or repeated hydration calls.
  if (data.charEthnicity) return data;

  // No legacy charCountry present — nothing to migrate.
  if (!data.charCountry) return data;

  const mapped = LEGACY_COUNTRY_TO_ETHNICITY[data.charCountry];

  // Unknown charCountry key (not in the 7-key set) — leave node as-is (D-19).
  if (!mapped) return data;

  // Return a new object (never mutate the input).
  // charCountry is intentionally left on the returned object — the backend
  // row still carries it; Phase 7 (MIGRATE-02) handles deletion.
  return { ...data, charEthnicity: mapped };
}
```

### Idempotency truth table (D-22 / CONTEXT.md §Specifics)

| Input | First call result | Second call result | Same? |
|-------|-------------------|--------------------|-------|
| `{ charCountry: "vn" }` | `{ charCountry: "vn", charEthnicity: "Vietnamese" }` | `{ charCountry: "vn", charEthnicity: "Vietnamese" }` (guard fires) | YES |
| `{ charEthnicity: "Korean", charGender: "female" }` | unchanged (guard fires) | unchanged | YES |
| `{ charCountry: "vn", charEthnicity: "Vietnamese" }` | unchanged (guard fires) | unchanged | YES |
| `{ charGender: "female" }` | unchanged (no charCountry) | unchanged | YES |
| `{}` | unchanged | unchanged | YES |

---

## 6. Hydration Insertion Point in board.ts

### Problem: two identical hydration paths

`board.ts` contains the node-mapping pattern in **two places**:

1. **`loadInitialBoard`** — lines 264–288 — called on first mount from `main.tsx`.
2. **`switchBoard`** — lines 320–344 — called when the user switches boards in `ProjectSidebar`.

Both must receive the `migrateCharacterNodeData` wrapper. Missing `switchBoard` means old boards migrate correctly on initial load but revert when the user switches away and back.

### Exact insertion

**Step 1: Add import at top of `board.ts`**

After the existing imports (line 16), add:
```typescript
import { migrateCharacterNodeData } from "../lib/character/migrate";
```

**Step 2: Extend `FlowboardNodeData` interface (lines 31–97)**

After `charGender?: string;` (line 88), add:
```typescript
  // v1.1 character-builder structured fields — stable English keys stored
  // in node.data; i18n labels are derived at render time, never persisted.
  // Legacy keys (charCountry, charVibe, charGender) retained above for
  // backward read access until Phase 7 (MIGRATE-02) removes them.
  charEthnicity?: string;
  charAge?: string;
  charHair?: string;
  charSkinTone?: string;
  charOutfit?: string;
  charExpression?: string;
  charLighting?: string;
```

**Step 3: Wrap the data object in both hydration `.map()` calls**

Currently (both sites, lines 264–288 and 320–344), the pattern is:
```typescript
const nodes: FlowNode[] = detail.nodes.map((n) => ({
  id: String(n.id),
  type: n.type,
  position: { x: n.x, y: n.y },
  data: {
    type: n.type,
    shortId: n.short_id,
    // ... existing casts ...
    charCountry: n.data["charCountry"] as string | undefined,
    charVibe: n.data["charVibe"] as string | undefined,
    charGender: n.data["charGender"] as string | undefined,
    storyboardGrid: n.data["storyboardGrid"] as StoryboardGrid | undefined,
  },
}));
```

After adding the new `char*` casts, wrap `data: { ... }` in `migrateCharacterNodeData(...)`:

```typescript
const nodes: FlowNode[] = detail.nodes.map((n) => ({
  id: String(n.id),
  type: n.type,
  position: { x: n.x, y: n.y },
  data: migrateCharacterNodeData({
    type: n.type,
    shortId: n.short_id,
    // ... existing casts unchanged ...
    charCountry: n.data["charCountry"] as string | undefined,
    charVibe: n.data["charVibe"] as string | undefined,
    charGender: n.data["charGender"] as string | undefined,
    // New v1.1 casts:
    charEthnicity: n.data["charEthnicity"] as string | undefined,
    charAge: n.data["charAge"] as string | undefined,
    charHair: n.data["charHair"] as string | undefined,
    charSkinTone: n.data["charSkinTone"] as string | undefined,
    charOutfit: n.data["charOutfit"] as string | undefined,
    charExpression: n.data["charExpression"] as string | undefined,
    charLighting: n.data["charLighting"] as string | undefined,
    storyboardGrid: n.data["storyboardGrid"] as StoryboardGrid | undefined,
  }),
}));
```

`migrateCharacterNodeData` receives a `FlowboardNodeData` object and returns the same shape — the outer `{ id, type, position, data }` structure is unchanged.

---

## 7. Risks and Call Sites the Planner Must Not Break

### Active call sites of `charCountry` / `charVibe`

Grep result from reading the files:

| File | Symbol | How used | Phase 5 impact |
|------|--------|----------|----------------|
| `frontend/src/store/board.ts:283–285` | `charCountry`, `charVibe`, `charGender` | Cast from `n.data` in hydration | **Must retain** — these casts stay; the migration wraps the result |
| `frontend/src/components/GenerationDialog.tsx:29–34` | `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, `CountryKey`, `VibeKey` | Imports for the current picker UI | **Do NOT touch** in Phase 5 — GenerationDialog is only modified in Phase 6 |
| `frontend/src/components/GenerationDialog.tsx:46–74` | local `buildCharacterPrompt(gender, country, vibe, extras)` | The existing assembler | **Do NOT touch** — A/B reference; only replaced in Phase 6 |
| `frontend/src/components/GenerationDialog.tsx:639–656` | `charCountry`, `charVibe`, `charGender` | `charStamp` stamp at dispatch | **Do NOT touch** — stamp logic stays until Phase 6 swaps the component |
| `frontend/src/constants/character.ts` | `CHARACTER_COUNTRIES`, `CHARACTER_VIBES` etc. | Source of vibe tokens + migration map | **Do NOT delete** — Phase 7 (MIGRATE-02). Phase 5 only reads from it in `migrate.ts` |

Phase 5 MUST NOT modify `GenerationDialog.tsx` or `ResultViewer.tsx`. Those files are Phase 6 and Phase 7 scope respectively. Any change to those files in Phase 5 is out of scope.

### ResultViewer — known `charCountry`/`charVibe` read site (Phase 7, not Phase 5)

`ResultViewer.tsx` (not read in Phase 5 planning) calls `localizedCountryLabel(data.charCountry)` and `localizedVibeLabel(data.charVibe)` to render pills. After Phase 5, new boards will have `charEthnicity` (not `charCountry`) on their nodes. ResultViewer will show no pill for `charEthnicity` until Phase 7 updates it. This is INTENTIONAL and acceptable — ResultViewer update is Phase 7 (MIGRATE-03) scope.

Old boards (with `charCountry`) continue to show pills correctly because `charCountry` is preserved on the backend row and still cast in the hydration path.

---

## 8. Verification Rubric

Success criteria observable post-execution (from ROADMAP.md §"Phase 5"):

| # | Criterion | Observable check |
|---|-----------|-----------------|
| 1 | `tsc -b --noEmit` exits 0 | `npm run lint` from `frontend/` — no TypeScript errors |
| 2 | `node scripts/check-i18n-parity.mjs` exits 0 | Phase 5 adds no new i18n keys → parity script is a no-change gate |
| 3 | Loading a v1.0 board with `charCountry: "vn"` produces no console errors and sets `charEthnicity: "Vietnamese"` on the in-memory node | Open dev server, load an old board, inspect board store in React DevTools — node data shows `charEthnicity` |
| 4 | `toDataPatch({ charVibe: "douyin" }, { charVibe: "clean" })` returns exactly `{ charVibe: "douyin" }` | Hand-walk the function with the worked example in §4; verify in browser console |
| 5 | `buildCharacterPrompt({ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" })` produces a string identical to the old `buildCharacterPrompt("female", "vn", "clean", "")` | Compare via browser console with both functions in scope |
| 6 | `migrateCharacterNodeData(migrateCharacterNodeData(x))` equals `migrateCharacterNodeData(x)` for all 5 truth-table inputs in §5 | Hand-walk with browser console |
| 7 | Submitting the existing `GenerationDialog` on a character node still works end-to-end (no regression) | Open a character node → Generate → confirm generation dispatches |

---

## Common Pitfalls (Phase 5-Specific)

### Pitfall 1: Missing `switchBoard` hydration wrapping

`migrateCharacterNodeData` is added to `loadInitialBoard` but not `switchBoard`. Old boards show migrated data on first load, then revert when the user switches boards. Both hydration `.map()` calls must be wrapped.

### Pitfall 2: `undefined` vs `null` in toDataPatch

`toDataPatch` must emit `null` (not `undefined`) for cleared fields. `JSON.stringify` silently drops `undefined`, so a cleared field becomes a no-op PATCH and the stale value persists in SQLite. The `DataPatch` type (`client.ts:206`) accepts `null` — lean into it.

### Pitfall 3: Importing CHARACTER_COUNTRIES outside migrate.ts

CONTEXT.md (§code_context) constrains `CHARACTER_COUNTRIES` import to `migrate.ts` only in Phase 5. `buildCharacterPrompt.ts` may import `CHARACTER_VIBES` for vibe token expansion, but not `CHARACTER_COUNTRIES`.

### Pitfall 4: Adding charExtras to FlowboardNodeData without hydration cast

`charExtras` is used as the free-text extras field in CharacterConfig but is currently a dialog-local `useState` value in `GenerationDialog.tsx` — it is NOT persisted to `node.data` today. Phase 5 adds it to `FlowboardNodeData` and must cast it in the hydration map. Without the hydration cast, `tsc -b --noEmit` will pass (the field is optional) but `charExtras` will always be `undefined` on reload. Check whether `charExtras` needs to be part of the CharacterConfig schema (it does — per WIZARD-03) and the hydration cast.

---

## Standard Stack

### Core (Phase 5 only)
| Library | Version | Purpose | Action |
|---------|---------|---------|--------|
| `zod` | ^4.4.3 | Runtime schema + TS type derivation | `npm install zod` — ONLY new dep |
| `zustand` | ^5.0.0 | Board store (FlowboardNodeData extension) | Already installed |
| TypeScript | ^5.6.2 | All new modules in strict mode | Already installed |

**Installation:**
```bash
cd /Users/inanctelci/Development/flowboard/frontend && npm install zod
```

No other installs. `zustand/middleware/persist` is bundled with Zustand 5 (confirmed in `node_modules`), but is Phase 6 scope — not installed or imported in Phase 5.

---

## Package Legitimacy Audit

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| `zod` | npm | OK — 16M+ weekly downloads, 5+ years old, official at zod.dev | Approved |

No other packages installed in Phase 5.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Node.js + npm | `npm install zod`, `npm run lint` | Confirmed (Vite 5 running) | |
| TypeScript 5.6 | `tsc -b --noEmit` | Confirmed (package.json devDep) | |
| `scripts/check-i18n-parity.mjs` | Phase 5 no-change gate | Confirmed (v1.0 artifact) | |

---

## Architecture Patterns

### Recommended Project Structure (Phase 5 additions)

```
frontend/src/
├── lib/
│   ├── storyboardPrompt.ts           # existing — pattern template
│   └── character/                    # NEW directory
│       ├── schema.ts                 # CharacterConfigSchema + types
│       ├── buildCharacterPrompt.ts   # pure prompt assembler
│       ├── toDataPatch.ts            # delta-only PATCH helper
│       └── migrate.ts                # charCountry → charEthnicity
├── store/
│   └── board.ts                      # MODIFIED: FlowboardNodeData + hydration
└── constants/
    └── character.ts                  # UNCHANGED (Phase 7 deletes)
```

### System Architecture Diagram (Phase 5 data flow)

```
Backend GET /api/boards/{id}
    │
    ▼
board.ts loadInitialBoard / switchBoard
    │
    ├─ raw NodeDTO.data cast to FlowboardNodeData shape
    │
    └─ migrateCharacterNodeData(rawData)    ← lib/character/migrate.ts
            │
            ├─ charCountry present? → set charEthnicity from LEGACY_COUNTRY_TO_ETHNICITY
            ├─ charEthnicity already set? → return data unchanged (idempotent)
            └─ return { ...data, charEthnicity }
                │
                ▼
            Zustand board store (in-memory nodes with migrated data)
                │
                ▼ (Phase 6, not Phase 5)
            CharacterWizard reads node.data.charEthnicity for wizard prefill
                │
                └─ toDataPatch(wizardNext, nodeDataPrev)  ← lib/character/toDataPatch.ts
                        │
                        └─ patchNode(dbId, { data: delta })  ← delta only
```

---

## Validation Architecture

Phase 5 has no automated test infrastructure (confirmed per project constraint: no frontend test runner). Validation is manual + TypeScript-strict.

### Validation plan

| Req | Behavior | Validation method |
|-----|----------|-------------------|
| DATA-01 | FlowboardNodeData has 7 new char* fields | `tsc -b --noEmit` passes with the new fields used |
| DATA-02 | CharacterConfigSchema parses valid and invalid blobs | Browser console: `schema.safeParse({...})` |
| DATA-03 | buildCharacterPrompt token order and no undefined tokens | Console: compare v1.0 vs v1.1 output for same logical input |
| DATA-04 | toDataPatch emits delta only | Console: worked examples from §4 |
| DATA-05 | English keys stored — no translated labels | Grep `node.data.charEthnicity` after loading a v1.0 board |
| MIGRATE-01 | migrateCharacterNodeData idempotent, no backend PATCH | Load v1.0 board, check network tab for no PATCH on load |

---

## Security Domain

Phase 5 is pure TypeScript data-model work with no new API endpoints, no user-facing UI, and no new input validation boundaries beyond the Zod schema. `charExtras` has a 200-char cap in the schema — this is the only input constraint. No ASVS categories apply to this phase specifically.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `buildCharacterPrompt.ts` may import `CHARACTER_VIBES` (not just `CHARACTER_COUNTRIES`) for vibe token expansion | §3 | If the constraint applies to all of `character.ts`, the assembler cannot expand vibe tokens from the existing arrays; would need to inline the token arrays in the new module |
| A2 | `charExtras` is not currently persisted to `node.data` (it's dialog-local today) | §7 / §Pitfall 4 | If charExtras IS already persisted, the hydration cast is needed but already works (the backend will return it) |

**A1 resolution note:** CONTEXT.md §code_context says "Imports of `CHARACTER_COUNTRIES` in `migrate.ts` only." — the constraint names `CHARACTER_COUNTRIES` specifically, not `CHARACTER_VIBES`. The planner should confirm whether `buildCharacterPrompt.ts` may import `CHARACTER_VIBES` or must inline the vibe tokens. If inline is required, copy the token arrays into a `VIBE_TOKENS` constant in `buildCharacterPrompt.ts` or a separate `vibeTokens.ts` file in `lib/character/`.

---

## Open Questions

1. **Does `buildCharacterPrompt.ts` import `CHARACTER_VIBES` from `constants/character.ts`?**
   - What we know: CONTEXT.md restricts `CHARACTER_COUNTRIES` import to `migrate.ts` only.
   - What's unclear: Whether `CHARACTER_VIBES` is also restricted.
   - Recommendation: Allow the import for Phase 5 (CLAUDE.md makes no explicit per-file constraint on CHARACTER_VIBES); if Phase 7 removes `CHARACTER_VIBES`, the assembler will be updated at that time.

2. **Should `charExtras` be cast in the hydration map?**
   - What we know: `charExtras` is in `CharacterConfig` (WIZARD-03 200-char cap) but the current `GenerationDialog` stores it only in local `useState`, never persisting to `node.data`.
   - What's unclear: Whether Phase 5 should begin persisting it or leave it dialog-local until Phase 6.
   - Recommendation: Add the `charExtras` cast to the hydration map in Phase 5 for completeness (`n.data["charExtras"] as string | undefined`). It will be `undefined` for all existing nodes but the cast is required for `FlowboardNodeData` TypeScript compliance once the field is added to the interface.

---

## Sources

### Primary (HIGH confidence — direct code analysis, VERIFIED this session)
- `frontend/src/store/board.ts` — `FlowboardNodeData` interface (lines 31–97), `loadInitialBoard` hydration (lines 247–304), `switchBoard` hydration (lines 315–357)
- `frontend/src/api/client.ts` — `DataPatch` type (line 206), `patchNode` contract (lines 208–218), null-sentinel docblock (lines 182–205)
- `frontend/src/constants/character.ts` — full file; `CHARACTER_COUNTRIES[n].tag` values for migration map (lines 18–26); `CHARACTER_VIBES` token arrays for assembler
- `frontend/src/components/GenerationDialog.tsx` — existing `buildCharacterPrompt` function (lines 45–74); charStamp dispatch pattern (lines 638–664); reset-on-open pattern (lines 445–449)
- `frontend/src/lib/storyboardPrompt.ts` — pattern template for `buildCharacterPrompt.ts`
- `frontend/package.json` — confirmed: no `zod` in dependencies yet
- `.planning/phases/05-data-model-migration-foundation/05-CONTEXT.md` — all locked decisions (D-01 through D-22)
- `.planning/phases/05-data-model-migration-foundation/05-PATTERNS.md` — per-file pattern mappings and convention extractions

### Secondary (HIGH confidence — synthesis documents)
- `.planning/research/SUMMARY.md` — milestone executive synthesis, phase ordering rationale
- `.planning/research/ARCHITECTURE.md` — flat-key decision rationale, migration anti-patterns, data flow diagram
- `.planning/research/STACK.md` — Zod 4 decision rationale, zod@4.4.3 confirmed as latest stable
- `.planning/research/PITFALLS.md` — Pitfalls #1, #2, #7, #15 directly applicable to Phase 5
- `.planning/REQUIREMENTS.md` — DATA-01..05 and MIGRATE-01 requirement text

---

## Metadata

**Confidence breakdown:**
- Module boundaries: HIGH — project convention is unambiguous (no barrels); file list derived directly from decisions
- Schema shape: HIGH — all field names from CONTEXT.md D-01; enum sets from SUMMARY.md FEATURES section
- Token order: HIGH — D-10 is locked; framing anchors extracted verbatim from existing `GenerationDialog.tsx:61–73`
- toDataPatch logic: HIGH — derived directly from `DataPatch` docblock (client.ts:182–205) + D-13/14/15
- Migration map: HIGH — sourced directly from `CHARACTER_COUNTRIES[n].tag` in constants/character.ts lines 18–26
- Hydration insertion: HIGH — exact line numbers read from board.ts; CRITICAL: two sites, not one

**Research date:** 2026-06-16
**Valid until:** Stable — decisions are all locked; no external packages change; valid until Phase 6 planning
