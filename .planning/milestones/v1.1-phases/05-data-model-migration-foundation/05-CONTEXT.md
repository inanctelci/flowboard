# Phase 5: Data Model + Migration Foundation - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning
**Mode:** --auto (autonomous discuss; all gray areas auto-resolved from research and locked milestone decisions)

<domain>
## Phase Boundary

Phase 5 lands the **stable, locale-independent character data contract** that every downstream phase writes against. No user-facing UI work happens here. The deliverables are:

1. `FlowboardNodeData` extended with new flat `char*` keys on `node.data`
2. A `CharacterConfig` Zod schema (runtime + type via `z.infer<>`) as single source of truth
3. A pure prompt-assembler module (`lib/character/buildCharacterPrompt.ts`) producing deterministic prompts with framing anchors fixed
4. A `toDataPatch(wizardState, originalData)` helper that emits delta-only PATCH payloads honouring the shallow-merge `null`-sentinel contract
5. A convert-on-read migration in `loadInitialBoard`'s hydration path that maps legacy `charCountry → charEthnicity` without writing any automatic PATCHes
6. New runtime dependency installed: `zod@^4` (single dep — confirmed by research; `zustand/middleware/persist` ships with Zustand 5, no install needed for Phase 5)

**Not in scope this phase:** wizard UI, preset library UI/store, constants deletion, `ResultViewer.tsx` updates, i18n keys (no new user-visible strings introduced in Phase 5 → parity script is a no-change gate at phase close).

**Requirements covered:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, MIGRATE-01 (6 of 23 v1.1 requirements).

</domain>

<decisions>
## Implementation Decisions

### Field schema (DATA-01)

- **D-01:** New flat top-level keys on `FlowboardNodeData`: `charGender`, `charEthnicity`, `charAge`, `charHair`, `charSkinTone`, `charOutfit`, `charExpression`, `charLighting`. NO nested `character: { ... }` object — nesting trips the shallow-merge wholesale-replace anti-pattern documented in `CLAUDE.md` and `frontend/src/api/client.ts:196-219`.
- **D-02:** Legacy `charCountry`, `charVibe`, `charGender` retained on the interface as `?: string` for backward read access until Phase 7 deletes them. Phase 5 does NOT remove them — coexistence is required so v1.0 boards keep rendering.
- **D-03:** Values stored on `node.data` are stable English keys (e.g. `charGender: "female"`, `charEthnicity: "east-asian"`) or user-typed English prose (e.g. free-text override in `charEthnicity`). Never translated display labels — boards must be locale-independent. The wizard / ResultViewer use the i18n catalog at render time to localize a stable key into a display label.
- **D-04:** `charHair` is a single composite string for Phase 5 (e.g. `"long black"`) — the wizard in Phase 6 may split it into separate `charHairColor` / `charHairStyle` keys, decided in Phase 6 planning. Keeping it a single key in Phase 5 reduces blast radius if Phase 6 reshapes.

### Zod schema (DATA-02)

- **D-05:** `CharacterConfig` schema in `frontend/src/lib/character/schema.ts`. Use `zod@^4` (4.4.x — latest stable per STACK research). Derive TS type via `export type CharacterConfig = z.infer<typeof CharacterConfigSchema>` — schema is the single source of truth.
- **D-06:** All fields are `.optional()` at the schema level. The wizard (Phase 6) enforces minimum-viable submission. Optional-everything keeps the parser tolerant of partial blobs from localStorage in Phase 6.
- **D-07:** On parse failure (corrupt localStorage blob, partial/mismatched config), the schema's `.safeParse()` is used at every boundary. Failures route to a store `error` slot via `console.warn` + `set({ error: "..." })` pattern — NEVER throw to the React tree (no app crash on corrupt persisted data).
- **D-08:** Versioned envelope for persisted blobs: `{ version: 1, data: CharacterConfig }`. Phase 5 lands the schema with `version: 1`. Future schema changes bump the version and add a migration function in the persist middleware (Phase 6 wires this into the `characterPresets` slice — Phase 5 just defines the envelope shape).

### Prompt assembler (DATA-03)

- **D-09:** New module `frontend/src/lib/character/buildCharacterPrompt.ts` — pure function, no React/Zustand imports, matches the `lib/storyboardPrompt.ts` pattern already in the repo.
- **D-10:** Deterministic token order (locked, do not reshuffle): `subject anchor → ethnicity → age → gender → hair → outfit → vibe tokens → expression → lighting → framing anchors → negative constraints`. Framing anchors (`frontal face, both eyes visible, no occlusion, head and shoulders`) live as a frozen constant at the top of the module and append at a fixed late position in the token list — diffusion models weight earlier tokens more, anchors are corrective constraints that must come after styling tokens but before negatives.
- **D-11:** Partial-field handling: an unset field contributes zero tokens (filtered with `Boolean()`). No `undefined`/`null`/`"unknown"` tokens leak into the final prompt. Verified by a hand-walked truth table in the SUMMARY.md commit.
- **D-12:** Token delimiter is `", "` — same as existing prompt assembly in `GenerationDialog`'s current `buildCharacterPrompt`. Don't churn the prompt shape — A/B sanity check expected: passing a "v1.0-equivalent" `CharacterConfig` (gender + country + vibe) through the new assembler should produce a prompt string that's morally identical to the old one (delimiters, ordering, anchors). Capture the diff in a planning note for `MIGRATE-04` verification later.

### DataPatch helper (DATA-04)

- **D-13:** New helper `toDataPatch(next: Partial<CharacterConfig>, prev: Partial<CharacterConfig>): DataPatch` in `frontend/src/lib/character/toDataPatch.ts`. Emits ONLY changed keys.
- **D-14:** Cleared fields (`prev` has a value, `next` does not) → emit `key: null` (delete sentinel for the shallow-merge PATCH route, documented in `frontend/src/api/client.ts:196-219`).
- **D-15:** Unchanged fields → omit entirely from the patch.
- **D-16:** Unit-test-equivalent verification via a hand-walked example in the plan's success criteria: a wizard submit that only changes `charVibe` produces `{ charVibe: "..." }` — not a full re-emission of every field, and crucially NOT including `mediaId`, `aiBrief`, `prompt`, `briefPlan`, or any other non-character `node.data` field.
- **D-17:** Discretion: name of the helper exported function and the file location are at planner's discretion within `frontend/src/lib/character/`. The behavior is locked, the file name is suggested.

### Migration (MIGRATE-01)

- **D-18:** `frontend/src/lib/character/migrate.ts` exports `migrateCharacterNodeData(data: FlowboardNodeData): FlowboardNodeData` — pure, idempotent, no side effects.
- **D-19:** Mapping: legacy `charCountry: "vn" | "jp" | "kr" | "cn" | "th" | "us" | "fr"` → `charEthnicity` using the existing `CHARACTER_COUNTRIES[n].tag` lookup as the English-key value (e.g. `"vn" → "Vietnamese"`). The `CHARACTER_COUNTRIES` constants file is NOT deleted yet (that's MIGRATE-02 in Phase 7); Phase 5 reads from it to drive the migration map.
- **D-20:** Mapping: legacy `charVibe: "clean" | "douyin" | "oldmoney" | "coldgirl" | "kpop" | "casual"` → kept as-is on `charVibe` for Phase 5. The new `charVibe` semantics overlap with the old one (same set of stylistic presets remain valid). Phase 6 may reshape vibe handling when the wizard ships; if so, that's a Phase 6 decision and a follow-up migration step.
- **D-21:** Migration runs in the `loadInitialBoard` hydration path — specifically inside the function that maps backend `NodeDTO` to the `FlowboardNodeData`-shaped `node.data`. Apply `migrateCharacterNodeData` after the raw mapping, before the node is committed to the store. NO automatic PATCH back to the backend on read — old keys remain on the backend row until the user triggers an edit that flushes via `toDataPatch`.
- **D-22:** Idempotency contract: calling `migrateCharacterNodeData` twice produces the same result. If `charEthnicity` is already set, the migration skips (does not overwrite). This guards against double-execution from React StrictMode double-mount in dev and from any future re-hydration path.

### Discretion delegations (planner / executor decide)

- File / module boundary names within `frontend/src/lib/character/` — the directory must exist with these responsibilities; exact filenames are at planner's discretion.
- Whether to export from a single `index.ts` barrel or directly from each leaf file (project convention is named exports + relative imports — no barrels — so leaf imports preferred but planner may decide).
- Whether the `framing anchors` constant lives alongside the assembler or in a separate `constants.ts` — local co-location preferred.
- Exact set of regional buckets / age-range labels at the schema level — the planner should propose a reasonable starter set during plan-phase (REQUIREMENTS already locked the 6-bucket age idea; ethnicity is "regional buckets (8–10) + free-text override" per FEATURES research). Planner picks the labels; the wizard phase confirms.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / requirements
- `.planning/PROJECT.md` — v1.1 Current Milestone section, validated requirements, key decisions table, constraints
- `.planning/REQUIREMENTS.md` — DATA-01..05 + MIGRATE-01 wording; the Out of Scope table is load-bearing (no backend changes, no AI brief, etc.)
- `.planning/ROADMAP.md` §"Phase 5: Data Model + Migration Foundation" — goal, depends_on, phase constraints, 5 success criteria

### Research outputs
- `.planning/research/SUMMARY.md` — executive synthesis; the 5-phase build order; resolved tensions (localStorage > Reference table, convert-on-read migration locked, flat keys > nested)
- `.planning/research/STACK.md` — Zod 4 sole new dep, `zustand/middleware/persist` already bundled, all UI primitive libraries explicitly excluded
- `.planning/research/ARCHITECTURE.md` — flat-keys-on-node.data decision, prompt assembler location, library persistence decision rationale
- `.planning/research/PITFALLS.md` — 15 pitfalls; Phase 5 owns prevention of #1 (wholesale data replace), #2 (null sentinel), #7 (key collision), #15 (translated labels stored in data)

### Codebase canonical files
- `CLAUDE.md` §"Anti-Patterns" — wholesale `node.data` replace anti-pattern (read first before designing `toDataPatch`)
- `frontend/src/api/client.ts:196-219` — `DataPatch` type docblock, shallow-merge PATCH contract, `null`-sentinel semantics
- `frontend/src/store/board.ts` — `FlowboardNodeData` interface (extend in place), `loadInitialBoard` hydration path (insertion point for `migrateCharacterNodeData`)
- `frontend/src/constants/character.ts` — `CHARACTER_COUNTRIES` array (drives the migration map); keep imported for migration only in Phase 5
- `frontend/src/components/GenerationDialog.tsx` — current `buildCharacterPrompt` site (read for A/B parity check; do NOT modify in Phase 5 — that's Phase 6)
- `frontend/src/lib/storyboardPrompt.ts` — template pattern to follow for the new `buildCharacterPrompt.ts`
- `agent/flowboard/routes/nodes.py:75-121` — backend PATCH route shallow-merge implementation (read once to confirm the null-sentinel contract end-to-end; no backend changes in this milestone)

### Conventions
- `CLAUDE.md` §"Naming Patterns" — camelCase for module-level functions/exports, PascalCase for types, named exports only, no `export default`
- `CLAUDE.md` §"Import Organization" — relative imports preferred over `@/` alias (the alias exists but the codebase consistently uses relative)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `frontend/src/lib/storyboardPrompt.ts` — direct pattern template for `buildCharacterPrompt.ts`: pure function, deterministic ordering, joined tokens, framing-style constants at top of file
- `frontend/src/api/client.ts` `DataPatch` type — already exists; `toDataPatch` returns this type, no new type needed
- `frontend/src/api/client.ts` `patchNode(rfId, patch)` — already does the right thing on shallow-merge; Phase 5 does not modify it
- `CHARACTER_COUNTRIES` array in `frontend/src/constants/character.ts` — kept and used by the migration map; deletion deferred to Phase 7

### Established patterns
- Single-purpose `lib/` modules with pure functions (no React, no Zustand) — `storyboardPrompt.ts`, `humanizeBackendError`. Follow the same shape for `buildCharacterPrompt`, `migrate`, `toDataPatch`, `schema`.
- Named exports only, no `export default` (CLAUDE.md naming patterns)
- Relative imports (`../constants/character`, `./schema`) — no `@/` alias
- Module-level constants in SCREAMING_SNAKE (`FRAMING_ANCHORS`, `LEGACY_COUNTRY_TO_ETHNICITY`)
- Closed-enum string-union types suffixed `Key` (e.g. `GenderKey`, `EthnicityKey`) — for any closed enum we expose, follow the suffix convention

### Integration points
- `frontend/src/store/board.ts` `loadInitialBoard` (or whichever function maps backend `NodeDTO[]` → in-store `Node[]`) — single insertion point for `migrateCharacterNodeData`. NO call sites elsewhere in this phase.
- `frontend/src/store/board.ts` `FlowboardNodeData` interface — extend in place; do not duplicate.
- Imports of `CHARACTER_COUNTRIES` in `migrate.ts` only. Do NOT import anywhere new in Phase 5.

### Constraints to honor
- TypeScript strict — `tsc -b --noEmit` (run as `npm run lint` from `frontend/`) is the only correctness gate. Every change must compile.
- No new frontend test runner. Verification of Phase 5 is hand-walked truth tables in the plan + a sanity-check during executor on a real v1.0 board (loaded via existing dev server) showing no console errors.
- `scripts/check-i18n-parity.mjs` MUST still exit 0 at phase close. Phase 5 introduces no new locale keys → this is a no-change gate but still runs.
- No backend changes. Do NOT touch `agent/flowboard/` or `extension/` files. If a need surfaces, escalate as a Phase 5 blocker via STATE.md.

</code_context>

<specifics>
## Specific Ideas

- A/B parity micro-spec for `buildCharacterPrompt`: feed a `CharacterConfig` derived from a hypothetical v1.0 board node (`{ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" }`) and compare the resulting prompt string against what the old assembler in `GenerationDialog.tsx` produces. Capture the diff in a planning note for `MIGRATE-04` (in Phase 7) to verify.
- Idempotency contract for migration: write a 5-line hand-walked truth table in the plan showing `migrateCharacterNodeData(migrateCharacterNodeData(x))` equals `migrateCharacterNodeData(x)` for representative inputs (a v1.0 node, a v1.1 node, a partially-migrated node, an empty node, a node with only `charGender`).
- Framing anchors string is FROZEN — do not parameterize. Anchor list is `["frontal face", "both eyes visible", "no occlusion", "head and shoulders"]` (carry the spirit of existing code exactly).

</specifics>

<deferred>
## Deferred Ideas

- Splitting `charHair` into `charHairColor` + `charHairStyle` keys — defer to Phase 6 planning; Phase 5 ships a single composite key to minimize blast radius if the wizard reshapes.
- Adding the persist middleware version migrator on `characterPresets` slice — Phase 5 defines the versioned envelope shape (`{version: 1, data: ...}`) but the slice + middleware wiring belongs to Phase 6 (LIB-01).
- Removing legacy keys from `FlowboardNodeData` interface (`charCountry`, `charVibe`) — deferred to Phase 7 (MIGRATE-02) after every read site has been updated.
- Renaming `charVibe` semantics — Phase 5 preserves the existing 6-vibe key space. If Phase 6's wizard reshapes vibes, that's a Phase 6 decision and may require an additional migration step.
- Tests / a frontend test runner — explicitly out of scope per v1.1 milestone constraint. Verification stays manual + TS-strict + parity-CI.
- `ResultViewer.tsx` updates — deferred to Phase 7 (MIGRATE-03) with the backward-compat shim.
- Any new i18n keys — Phase 5 introduces no user-visible strings.

None of these are scope creep into Phase 5 — they are scope **out of** Phase 5 by design.

</deferred>

---

*Phase: 5-data-model-migration-foundation*
*Context gathered: 2026-06-16*
*Mode: --auto (one-pass autonomous)*
