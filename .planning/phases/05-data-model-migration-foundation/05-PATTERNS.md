# Phase 5: Data Model + Migration Foundation — Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 5 (4 new, 1 modified)
**Analogs found:** 4 / 5 (schema.ts has no Zod analog)

---

## File → Pattern Mappings

### New: `frontend/src/lib/character/schema.ts`

**Closest analog:** None — first Zod usage in the repo.

**Conventions to follow:**
- Named exports only: `export const CharacterConfigSchema = z.object({ ... })` and `export type CharacterConfig = z.infer<typeof CharacterConfigSchema>`.
- Module-level constant in SCREAMING_SNAKE for the versioned envelope: `export const CHARACTER_CONFIG_VERSION = 1 as const;`.
- All fields `.optional()` — tolerance of partial blobs (D-06).
- Closed-enum string-union keys exported with `Key` suffix: `export type GenderKey = "male" | "female"`, `export type EthnicityKey = ...`.
- Use `.safeParse()` at every call boundary (D-07); never let Zod throw to the React tree.
- No React / Zustand imports — pure data module.
- Versioned envelope shape: `{ version: 1, data: CharacterConfig }` — export a `VersionedCharacterConfig` type for it.

**Anti-patterns to avoid:**
- `export default` — not used anywhere in `frontend/src/`.
- `@/` alias imports — use relative paths.
- Storing translated display labels in schema values (D-03, PITFALL-15).

---

### New: `frontend/src/lib/character/buildCharacterPrompt.ts`

**Closest analog:** `frontend/src/lib/storyboardPrompt.ts` (exact pattern match)

**Conventions to follow (extracted from `storyboardPrompt.ts`):**

File-level comment block (lines 1–4 of analog): explain the module's locked contract and where to tweak vs. where not to inline.

Module-level frozen constant in SCREAMING_SNAKE (lines 7–11 of analog):
```typescript
// Framing anchors are FROZEN — do not parameterize. Appended after
// styling tokens but before negatives so diffusion models weight them
// as corrective constraints, not style descriptors.
const FRAMING_ANCHORS: readonly string[] = [
  "frontal face",
  "both eyes visible",
  "no occlusion",
  "head and shoulders",
] as const;
```

Token assembly via array + `.filter(Boolean).join(", ")` pattern — matches `buildStoryboardPrompt`'s `[...].join(" ")`. For character, token delimiter is `", "` (D-12).

Named export function with explicit param types and return type:
```typescript
export function buildCharacterPrompt(config: Partial<CharacterConfig>): string {
  const tokens: string[] = [
    // subject anchor, ethnicity, age, gender, hair, outfit, vibe tokens,
    // expression, lighting — per D-10 locked order
  ].filter(Boolean);
  return [...tokens, ...FRAMING_ANCHORS].join(", ");
}
```

No React / Zustand imports — pure function.

**Anti-patterns to avoid:**
- Reshuffling the token order (D-10 is locked).
- Letting `undefined` / `null` / `"unknown"` leak into the joined string — use `.filter(Boolean)` (D-11).
- Parameterizing `FRAMING_ANCHORS` (D-12 / specifics: frozen).

---

### New: `frontend/src/lib/character/migrate.ts`

**Closest analog:** No direct migration-helper analog in `frontend/src/lib/`. The board store's `edgeFromDto` (board.ts lines 110–122) is the closest "map one shape to another" pure function pattern.

**Conventions to follow:**
- Named export, pure function, explicit return type:
  ```typescript
  export function migrateCharacterNodeData(
    data: FlowboardNodeData,
  ): FlowboardNodeData { ... }
  ```
- Module-level lookup table in SCREAMING_SNAKE:
  ```typescript
  const LEGACY_COUNTRY_TO_ETHNICITY: Record<string, string> = {
    vn: "Vietnamese",
    jp: "Japanese",
    kr: "Korean",
    cn: "Chinese",
    th: "Thai",
    us: "American",
    fr: "French",
  };
  ```
  Values sourced from `CHARACTER_COUNTRIES[n].tag` in `frontend/src/constants/character.ts` (lines 18–26). Import `CHARACTER_COUNTRIES` to build this map or copy the values — keep the import only in this file per D-21 constraint.
- Idempotency guard first: `if (data.charEthnicity) return data;` (D-22).
- Return a new object (spread): `return { ...data, charEthnicity: ... }` — never mutate the input.
- No React / Zustand imports.
- No writes to the backend — read-only transform (D-21).

**Anti-patterns to avoid:**
- Mutating the input `data` object.
- Removing or overwriting `charEthnicity` if already set (idempotency contract D-22).
- Importing `CHARACTER_COUNTRIES` in any file other than `migrate.ts` in Phase 5 (context constraint).

---

### New: `frontend/src/lib/character/toDataPatch.ts`

**Closest analog:** `frontend/src/api/client.ts` lines 182–206 (the `DataPatch` type + its docblock explain the entire contract this helper must honor).

`DataPatch` is defined at `client.ts:206`:
```typescript
export type DataPatch = Record<string, unknown>;
```

**Conventions to follow:**
- Import `DataPatch` from the client — do not redeclare it:
  ```typescript
  import type { DataPatch } from "../api/client";
  ```
- Named export with explicit return type:
  ```typescript
  export function toDataPatch(
    next: Partial<CharacterConfig>,
    prev: Partial<CharacterConfig>,
  ): DataPatch { ... }
  ```
- Emit ONLY changed keys (D-13).
- Cleared fields (`prev` has value, `next` does not) → `key: null` sentinel (D-14). This is the shallow-merge contract from `client.ts:191–194`.
- Unchanged fields → omit entirely (D-15).
- Do NOT include non-character keys (`mediaId`, `aiBrief`, `prompt`, etc.) (D-16).
- No React / Zustand imports — pure function.

**Anti-patterns to avoid:**
- Emitting the full `CharacterConfig` on every call (PITFALL-1 wholesale replace).
- Using `undefined` as the cleared-field sentinel — JSON.stringify drops it silently; `null` is required (client.ts:191–194, CLAUDE.md anti-patterns).
- Including unrelated `node.data` fields in the patch output.

---

### Modified: `frontend/src/store/board.ts`

**Closest analog:** Self — extend the existing file in-place following established patterns.

**FlowboardNodeData interface extension (lines 31–97):**
Add new `char*` fields after line 88 (`charGender?: string`) — keep the comment block style matching lines 84–88:
```typescript
  // v1.1 character-builder fields — stable English keys, never translated
  // display labels (boards must be locale-independent; i18n happens at
  // render time). Legacy keys above are retained for backward read access
  // until Phase 7 removes them.
  charEthnicity?: string;
  charAge?: string;
  charHair?: string;
  charSkinTone?: string;
  charOutfit?: string;
  charExpression?: string;
  charLighting?: string;
```
Keep existing `charCountry?`, `charVibe?`, `charGender?` in place (D-02).

**`loadInitialBoard` hydration path (lines 264–288):**
After the existing `charGender` cast (line 285), add casts for the new fields following the identical pattern:
```typescript
charEthnicity: n.data["charEthnicity"] as string | undefined,
charAge: n.data["charAge"] as string | undefined,
// ... etc
```
Then wrap the mapped node data through `migrateCharacterNodeData`:
```typescript
import { migrateCharacterNodeData } from "../lib/character/migrate";

// Inside the .map():
data: migrateCharacterNodeData({
  type: n.type,
  shortId: n.short_id,
  // ... all existing casts ...
}),
```
The migration call wraps the entire data object — it runs after the raw mapping, before the node is committed to the store (D-21).

**Anti-patterns to avoid:**
- Wholesale-replacing `data` instead of shallow-merge (CLAUDE.md §Anti-Patterns, client.ts:196–219).
- Adding the migration call anywhere other than the `loadInitialBoard` hydration path (D-21: single insertion point).
- Using `@/` alias imports — the file uses relative imports throughout (`../api/client`).

---

## Cross-Cutting Conventions

- **Export style:** Named exports only — `export function`, `export type`, `export const`. No `export default` anywhere in `frontend/src/`.
- **Import style:** Relative paths (`../api/client`, `./schema`, `../constants/character`) — the `@/` alias exists in tsconfig but is unused in the codebase.
- **Module-level constants:** SCREAMING_SNAKE (`FRAMING_ANCHORS`, `LEGACY_COUNTRY_TO_ETHNICITY`, `CHARACTER_CONFIG_VERSION`).
- **Type naming:** PascalCase for interfaces/types (`CharacterConfig`, `VersionedCharacterConfig`). String-union enum aliases end in `Key` (`GenderKey`, `EthnicityKey`).
- **TS strict:** Explicit `undefined` handling everywhere — `as string | undefined` casts at hydration boundaries, `.optional()` in Zod schema. `tsc -b --noEmit` is the only correctness gate.
- **Comments:** Module-level comment block explaining design intent and invariants (see `storyboardPrompt.ts` lines 1–4, `constants/character.ts` lines 1–11). Inline comments on non-obvious invariants (idempotency guard, null sentinel).
- **No React / Zustand imports** in any of the four new `lib/character/` modules — pure functions only.
- **Error routing:** On schema `.safeParse()` failure, `console.warn` + route to store `error` slot — never throw to the React tree (D-07).

## Anti-Patterns to Avoid (from CLAUDE.md + codebase)

- **Wholesale replace of `node.data`** — always send delta-only patches; `null` sentinel to delete, omit unchanged fields (CLAUDE.md §Anti-Patterns, `client.ts:196–219`).
- **`undefined` as delete sentinel** — `JSON.stringify` silently drops it; use `null` (client.ts:191–194).
- **Translated labels stored in node.data** — `charEthnicity: "Vietnamese"` (English key), never `"Việt Nam"` (PITFALL-15, D-03).
- **`export default`** — not used in `frontend/src/`; use named exports.
- **`@/` alias imports** — relative imports only, matching existing codebase style.
- **Nested `character: { ... }` object on node.data** — trips shallow-merge wholesale-replace; all fields are flat top-level keys (D-01).
- **Automatic PATCH-back on migration** — migration is read-only / convert-on-read; no writes to backend (D-21).
