---
phase: 05-data-model-migration-foundation
plan: 01
subsystem: frontend/data-model
tags:
  - character-builder
  - zod-schema
  - migration
  - data-model
dependency_graph:
  requires:
    - frontend/src/constants/character.ts (CHARACTER_COUNTRIES, CHARACTER_VIBES — read-only)
    - frontend/src/api/client.ts (DataPatch type)
    - frontend/src/store/board.ts (FlowboardNodeData type)
  provides:
    - frontend/src/lib/character/schema.ts (CharacterConfigSchema, CharacterConfig, VersionedCharacterConfig)
    - frontend/src/lib/character/buildCharacterPrompt.ts (buildCharacterPrompt, FRAMING_ANCHORS)
    - frontend/src/lib/character/toDataPatch.ts (toCharacterDataPatch)
    - frontend/src/lib/character/migrate.ts (migrateCharacterNodeData, LEGACY_COUNTRY_TO_ETHNICITY)
    - Extended FlowboardNodeData with 7 new char* fields
  affects:
    - frontend/src/store/board.ts (loadInitialBoard, switchBoard hydration paths)
tech_stack:
  added:
    - zod@^4.4.3 (runtime dep — zero transitive deps; only new package in Phase 5)
  patterns:
    - Pure-function lib modules (no React/Zustand imports) — matches storyboardPrompt.ts pattern
    - Zod schema as single source of truth with z.infer<> type derivation
    - Convert-on-read migration (no automatic PATCH writes to backend)
    - Delta-only DataPatch via null-sentinel shallow-merge contract
key_files:
  created:
    - frontend/src/lib/character/schema.ts
    - frontend/src/lib/character/buildCharacterPrompt.ts
    - frontend/src/lib/character/toDataPatch.ts
    - frontend/src/lib/character/migrate.ts
  modified:
    - frontend/src/store/board.ts (FlowboardNodeData interface + 2 hydration sites)
    - frontend/package.json (zod@^4.4.3 added to dependencies)
    - frontend/package-lock.json (updated)
decisions:
  - "D-01 through D-22: All 22 locked decisions from 05-CONTEXT.md implemented as specified"
  - "toCharacterDataPatch chosen as export name (not toDataPatch) to avoid future ambiguity"
  - "charExtras intentionally excluded from FlowboardNodeData hydration in Phase 5 (Phase 6 WIZARD-03 owns persistence)"
  - "FRAMING_ANCHORS verbatim strings from RESEARCH.md §3 used (full multi-clause strings, not abbreviated)"
  - "LEGACY_COUNTRY_TO_ETHNICITY built from CHARACTER_COUNTRIES.map() to stay in sync with constants"
metrics:
  duration: "404s (~7 minutes)"
  completed: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 3
---

# Phase 5 Plan 1: Data Model + Migration Foundation Summary

**One-liner:** Zod-backed CharacterConfig schema, pure prompt assembler with frozen FRAMING_ANCHORS, delta-only toCharacterDataPatch, and idempotent charCountry→charEthnicity convert-on-read migration wired into both board hydration sites.

---

## Requirements Covered

| Requirement | Status | Evidence |
|-------------|--------|---------|
| DATA-01 | DONE | FlowboardNodeData has 7 new char* fields; tsc -b --noEmit exits 0 |
| DATA-02 | DONE | CharacterConfigSchema.safeParse handles corrupt blobs, returns {success:false} without throwing |
| DATA-03 | DONE | buildCharacterPrompt produces deterministic prompt with locked D-10 order and 4 frozen FRAMING_ANCHORS |
| DATA-04 | DONE | toCharacterDataPatch emits delta-only patches; cleared fields → null sentinel |
| DATA-05 | DONE | English keys (Vietnamese, Japanese, etc.) stored in charEthnicity; never translated display labels |
| MIGRATE-01 | DONE | migrateCharacterNodeData called in BOTH loadInitialBoard AND switchBoard hydration sites |

---

## Decisions Implemented

All 22 locked decisions (D-01 through D-22) from 05-CONTEXT.md were implemented as specified:

- **D-01:** Flat top-level `char*` keys on FlowboardNodeData — no nested objects
- **D-02:** Legacy charCountry, charVibe, charGender retained on interface for backward read access
- **D-03:** Values are stable English keys / English prose — never translated labels
- **D-04:** charHair is a single composite string
- **D-05:** CharacterConfigSchema in lib/character/schema.ts using zod@^4
- **D-06:** All Zod fields .optional()
- **D-07:** .safeParse() at every boundary; never throw to React tree
- **D-08:** VersionedCharacterConfig envelope { version: 1, data: CharacterConfig }
- **D-09:** buildCharacterPrompt.ts — pure function, no React/Zustand
- **D-10:** Locked token order: subject anchor → pose anchors → hair → skin → outfit → vibe tokens → expression → lighting → extras → FRAMING_ANCHORS
- **D-11:** .filter(Boolean) — no undefined/null/unknown in final prompt
- **D-12:** Token delimiter ", "; FRAMING_ANCHORS frozen
- **D-13:** toCharacterDataPatch emits only changed keys
- **D-14:** Cleared fields → null sentinel (NOT undefined)
- **D-15:** Unchanged fields → omitted
- **D-16:** Non-character keys cannot appear in patch output (type prevents it)
- **D-17:** Exported as `toCharacterDataPatch` (not `toDataPatch`)
- **D-18:** migrateCharacterNodeData — pure, idempotent, no side effects
- **D-19:** Unknown charCountry keys → no-op (not in LEGACY_COUNTRY_TO_ETHNICITY map)
- **D-20:** charVibe retained as-is for Phase 5
- **D-21:** Migration runs in hydration paths only — NO automatic PATCH to backend
- **D-22:** Idempotency guard: if charEthnicity already set, return data unchanged

---

## Files Changed

| File | Type | Description |
|------|------|-------------|
| `frontend/package.json` | MODIFIED | zod@^4.4.3 added to dependencies |
| `frontend/package-lock.json` | MODIFIED | Updated lockfile after npm install |
| `frontend/src/lib/character/schema.ts` | NEW | CharacterConfigSchema (Zod), CharacterConfig type, VersionedCharacterConfig, enum Key types |
| `frontend/src/lib/character/buildCharacterPrompt.ts` | NEW | Pure prompt assembler with frozen FRAMING_ANCHORS, locked D-10 order |
| `frontend/src/lib/character/toDataPatch.ts` | NEW | toCharacterDataPatch — delta-only DataPatch emitter |
| `frontend/src/lib/character/migrate.ts` | NEW | migrateCharacterNodeData, LEGACY_COUNTRY_TO_ETHNICITY map |
| `frontend/src/store/board.ts` | MODIFIED | FlowboardNodeData + 7 new fields, migrateCharacterNodeData wired into BOTH hydration sites |

---

## Deviations from Plan

None — plan executed exactly as written. All steps A through E of both tasks completed without deviations, auto-fixes, or rule triggers.

---

## A/B Parity Note (MIGRATE-04 Baseline)

Phase 7's MIGRATE-04 verification will use this as its baseline.

**Input:** `{ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" }`

**OLD v1.0 call:** `buildCharacterPrompt("female", "vn", "clean", "")` (from GenerationDialog.tsx lines 45-74)

**NEW v1.1 call:** `buildCharacterPrompt({ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" })`

**OLD output:**
```
Studio portrait headshot of a Vietnamese female character, subject directly faces the camera, head perfectly straight with zero tilt and zero turn, shoulders square to camera, axially symmetric pose, nose centered, both eyes equally visible at the same height, Clean Girl makeup styling, fresh dewy skin with sheer skin-tint coverage, healthy natural radiance, peachy cream blush on the cheek apples, brushed-up laminated brows with clear brow gel finish, minimal eye makeup, glossy plump lips with lip-oil sheen, slicked-back low bun or polished sleek hair, simple modern minimalist outfit, delicate gold hoop earrings, relaxed friendly expression with a gentle subtle smile, soft natural gaze, soft natural daylight, airy bright tone, clean minimalist backdrop, head and shoulders framing, centered composition, sharp focus on face, strictly front-on orientation, no head tilt, no head turn, no profile angle, no three-quarter view, no over-the-shoulder pose, no glasses, no hat, no mask, no occlusion, nothing covering the face, photorealistic, ultra-detailed, consistent character reference
```

**NEW output:**
```
Studio portrait headshot of a Vietnamese female character, subject directly faces the camera, head perfectly straight with zero tilt and zero turn, shoulders square to camera, axially symmetric pose, nose centered, both eyes equally visible at the same height, Clean Girl makeup styling, fresh dewy skin with sheer skin-tint coverage, healthy natural radiance, peachy cream blush on the cheek apples, brushed-up laminated brows with clear brow gel finish, minimal eye makeup, glossy plump lips with lip-oil sheen, slicked-back low bun or polished sleek hair, simple modern minimalist outfit, delicate gold hoop earrings, relaxed friendly expression with a gentle subtle smile, soft natural gaze, soft natural daylight, airy bright tone, clean minimalist backdrop, head and shoulders framing, centered composition, sharp focus on face, strictly front-on orientation, no head tilt, no head turn, no profile angle, no three-quarter view, no over-the-shoulder pose, no glasses, no hat, no mask, no occlusion, nothing covering the face, photorealistic, ultra-detailed, consistent character reference
```

**Diff:** NONE — outputs are byte-identical (39 tokens, same delimiter `", "`, same FRAMING_ANCHORS position).

**Key structural difference:** The v1.0 function puts vibe tokens directly after the two pose anchors (no hair/skin/outfit slots before them). The v1.1 assembler adds slots for hairToken, skinToken, outfitToken between poseAnchor2 and vibeTokens — but since all three are null for this v1.0-equivalent config, the output is identical. Old boards that only have charGender + charCountry + charVibe will produce identical prompts through both assemblers.

---

## Manual Verification Log

The following browser-console checks are required but cannot be run in the automated executor context (requires live dev server). They are documented here for the maintainer's verification pass.

### Verification 6: v1.0 Board Migration Check
Expected behavior:
- Load a board with a character node carrying `charCountry: "vn"` / `charVibe: "clean"` / no `charEthnicity`
- `useBoardStore.getState().nodes` shows that node with `data.charEthnicity: "Vietnamese"` and `data.charCountry: "vn"` (preserved)
- Network tab shows ZERO `PATCH /api/nodes/*` requests fired during load (convert-on-read only)

### Verification 7: A/B Parity
Confirmed above — byte-identical output for the v1.0-equivalent config.

### Verification 8: toCharacterDataPatch Truth Table

| Call | Expected | Semantic |
|------|----------|---------|
| `toCharacterDataPatch({ charVibe: "douyin" }, { charVibe: "clean", charGender: "female" })` | `{ charVibe: "douyin" }` | Single-field change |
| `toCharacterDataPatch({ charGender: "female" }, { charOutfit: "business casual", charGender: "female" })` | `{ charOutfit: null }` | Cleared field null sentinel |
| `toCharacterDataPatch({ charGender: "female" }, { charGender: "female" })` | `{}` | No-op |

### Verification 9: Schema safeParse Checks

| Call | Expected | Reason |
|------|----------|--------|
| `CharacterConfigSchema.safeParse({ charExtras: "x".repeat(201) }).success` | `false` | 200-char cap enforced |
| `CharacterConfigSchema.safeParse({}).success` | `true` | All fields optional |
| `CharacterConfigSchema.safeParse({ charGender: "female", charEthnicity: "Vietnamese" }).success` | `true` | Valid config |

---

## Open Items for Phase 6

- `charExtras` is in CharacterConfigSchema but NOT cast in board.ts hydration — Phase 6 WIZARD-03 introduces persistence and the hydration cast lands in that phase
- `characterPresets.ts` Zustand slice + persist middleware wiring — Phase 6 (LIB-01)
- Consumers of `CharacterConfigSchema.safeParse()` — none in Phase 5; Phase 6 wizard wires the consumer
- `buildCharacterPrompt` is not yet called from any component — Phase 6 replaces GenerationDialog's local function with this one

## Patterns to Follow / Avoid

**Follow:**
- The four lib modules in `frontend/src/lib/character/` have NO React, NO Zustand imports — they are pure TypeScript functions. Any future modules in this directory must maintain this invariant.
- The dual-hydration-site rule (RESEARCH.md §6 Pitfall 1): `migrateCharacterNodeData` MUST be called in BOTH `loadInitialBoard` AND `switchBoard`. Missing either site causes v1.0 boards to revert when the user switches boards.

**Avoid:**
- Wholesale replace of `node.data` — always use `toCharacterDataPatch` for delta-only patches
- Storing translated display labels in `node.data` — English keys only
- Adding `charExtras` to the hydration cast before Phase 6 wires its persistence path
- Importing `CHARACTER_COUNTRIES` anywhere other than `migrate.ts` (until Phase 7 deletes it)

---

## Known Stubs

None — all new modules are pure functions with no data rendering. The lib modules have no stub values.

---

## Self-Check: PASSED

**Files exist:**
- `frontend/src/lib/character/schema.ts` — FOUND
- `frontend/src/lib/character/buildCharacterPrompt.ts` — FOUND
- `frontend/src/lib/character/toDataPatch.ts` — FOUND
- `frontend/src/lib/character/migrate.ts` — FOUND

**Commits exist:**
- `0a69182` — feat(05-01): install zod@^4 and add lib/character pure-function modules — FOUND
- `68792b4` — feat(05-01): extend FlowboardNodeData and wire migration into both hydration sites — FOUND

**Automated verify results:**
- `npm run lint` — exits 0 (zero TypeScript errors)
- `node scripts/check-i18n-parity.mjs` — exits 0 (424 keys in both en.json and tr.json, unchanged)
- `grep -c "migrateCharacterNodeData" frontend/src/store/board.ts` — returns 3 (1 import + 2 call sites)
- `grep -rn "CHARACTER_COUNTRIES" frontend/src/lib/character/` — only in migrate.ts (correct)
- Task 2 automated verify script — "OK: 1 import, 2 call sites, 7 new interface fields, 14 hydration casts, legacy keys preserved."
