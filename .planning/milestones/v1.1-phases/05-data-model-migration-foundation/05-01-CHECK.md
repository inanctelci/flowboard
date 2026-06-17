# Phase 5 Plan Check — 05-01-PLAN.md

**Checked:** 2026-06-17
**Verdict:** APPROVE

---

## Verdict Summary

The plan is executable as written. All six phase requirements (DATA-01 through DATA-05, MIGRATE-01) have concrete, fully specified tasks. Both hydration sites are explicitly addressed. Anti-patterns are named and guarded. Scope is tightly controlled. Two minor issues found — neither blocks execution.

---

## Dimension-by-Dimension Results

### 1. Requirement Coverage — PASS

| Requirement | Covering Task / Step | Coverage Quality |
|-------------|---------------------|-----------------|
| DATA-01 | Task 2, Step B | Interface fields named, comment block specified, exact insertion line |
| DATA-02 | Task 1, Step B | Schema shape, safeParse contract, module-level comment all specified |
| DATA-03 | Task 1, Step C | Token order locked, FRAMING_ANCHORS verbatim, AGE_TOKENS mapping included |
| DATA-04 | Task 1, Step D | Delta logic pseudocode, null sentinel, worked truth-table examples |
| DATA-05 | Enforced across Task 1 Steps B/E and Task 2 Step B | English-keys contract in schema comment, migrate.ts uses `.tag` (English strings) |
| MIGRATE-01 | Task 1 Step E (migrate.ts) + Task 2 Steps C/D (both hydration sites) | Pure idempotent function + both board.ts call sites explicitly stepped |

### 2. Task Completeness — PASS

Both tasks are `type="auto"`. Both have `<files>`, `<action>`, `<verify>` (with `<automated>` shell commands), and `<done>` with boolean acceptance criteria. Actions are step-labelled (A/B/C/D), not vague directives. Verify commands are self-checking Node.js one-liners that exit non-zero on failure.

### 3. Dependency Correctness — PASS

Single plan, `depends_on: []`, wave 1. No dependency graph to analyze.

### 4. Key Links — PASS

`must_haves.key_links` covers all five wiring points with explicit regex patterns. Task 2's automated verify counts import occurrences (expect 1) and call-site occurrences (expect 2) for `migrateCharacterNodeData` and verifies all 14 hydration casts (7 fields × 2 sites) using a Node.js script that exits 1 on any mismatch.

### 5. Scope Sanity — PASS

2 tasks, 7 files (4 new lib modules, 1 modified store, 2 package files). No wizard component, no preset slice, no ResultViewer.tsx, no constants deletion, no i18n keys, no backend changes. The deferred-ideas list in 05-CONTEXT.md is honored.

### 6. Anti-Pattern Compliance — PASS

- **Wholesale node.data replace**: `toCharacterDataPatch` is typed over `Partial<CharacterConfig>` — non-character keys (mediaId, aiBrief, prompt, etc.) cannot appear in the output by type. Confirmed.
- **Null sentinel**: RESEARCH.md §4 pseudocode and the PLAN.md Step D action both emit `null` (not `undefined`) for cleared fields, citing client.ts:191–194.
- **English keys**: `migrate.ts` maps `charCountry` → `CHARACTER_COUNTRIES[n].tag` which are English strings ("Vietnamese", "Japanese", …). Schema stores values as `z.string().optional()` with no i18n helper imports.
- **Flat keys**: D-01 locked, all fields are flat top-level `char*` keys. No nested objects.
- **No barrel files**: Explicitly stated in RESEARCH.md §1 and PATTERNS.md §Cross-Cutting. No `index.ts` planned.

### 7. Dual-Hydration-Site Rule — PASS (verified against board.ts)

Both hydration sites exist in board.ts at the confirmed locations:
- `loadInitialBoard` — data mapping block, lines 264–288
- `switchBoard` — identical data mapping block, lines 320–344

Task 2 Step C and Step D each address one site by name. The `<done>` criteria for Task 2 explicitly states "exactly 2 call sites — single-site is a P0 regression." The automated verify command counts `migrateCharacterNodeData\(\{` occurrences and exits 1 if not exactly 2. This is the highest-risk item in the phase and it is fully mitigated.

### 8. Executability — PASS

Every step provides: exact file paths, npm install commands, complete function signatures with types, full implementation pseudocode (not pseudocode in spirit — actual TypeScript), and exact board.ts line numbers for insertion. An executor can run this plan top-to-bottom without any additional research.

### 9. Verification Rubric — PASS

The plan's `<success_criteria>` section maps each of the 7 criteria to a requirement ID tag. `<verification>` contains 9 checks with observable, automated-where-possible steps. `must_haves.truths` has 7 user-observable truth statements. All map to ROADMAP.md Phase 5 success criteria.

### 10. CLAUDE.md Compliance — PASS

Named exports only, relative imports, 2-space indent, double-quoted strings, semicolons, trailing commas — all required and confirmed against the `storyboardPrompt.ts` template pattern. `tsc -b --noEmit` (via `npm run lint`) is the lint gate in both task verify blocks. No frontend test runner introduced.

### 11. Research Open Questions — WARNING (non-blocking)

`05-RESEARCH.md` has an `## Open Questions` section without a `(RESOLVED)` suffix. However, both questions are de facto answered by the plan:

1. **CHARACTER_VIBES import in buildCharacterPrompt.ts** — Plan Task 1 Step C explicitly includes the import and notes "CHARACTER_VIBES import is research-cleared in §3."
2. **charExtras hydration cast** — Plan Task 2 Step B explicitly excludes `charExtras` from the interface and hydration cast with a clear rationale (dialog-local, not persisted, Phase 6 WIZARD-03 owns it).

The plan resolves both questions. The RESEARCH.md heading is a documentation gap only; it does not impede execution.

---

## Issues

### WARNING-01: RESEARCH.md open questions section not marked resolved

- **Dimension:** research_resolution
- **Severity:** WARNING
- **Description:** `05-RESEARCH.md` `## Open Questions` section lacks the `(RESOLVED)` suffix. Both questions are answered in the plan, but the file heading is not updated.
- **Fix:** Rename the section to `## Open Questions (RESOLVED)` and add resolution annotations to each question. Non-blocking — executor can proceed.

### WARNING-02: RESEARCH.md module-boundary table omits CHARACTER_VIBES import for buildCharacterPrompt.ts

- **Dimension:** pattern_compliance
- **Severity:** WARNING
- **Description:** `05-RESEARCH.md` §1 Module Boundaries table lists `buildCharacterPrompt.ts` imports as `./schema` only, but the plan correctly adds `../constants/character` for `CHARACTER_VIBES`. The table is an inconsistency in the research doc, not in the plan. If an executor reads the table first they may momentarily think the import is wrong.
- **Fix:** Update the §1 table to add `../constants/character (CHARACTER_VIBES)` for `buildCharacterPrompt.ts`. Non-blocking — the plan's action section is authoritative and correct.

---

## Watch-Out Notes for Execution

1. **The count in Task 2's verify script is authoritative.** The script checks for exactly 2 `migrateCharacterNodeData({` call sites. If it returns anything other than 2, the second hydration site was missed. Do not override or skip this check.

2. **`toCharacterDataPatch` is the exported function name** (not `toDataPatch` as the RESEARCH.md §4 pseudocode header shows). The plan's `must_haves.artifacts` and `<done>` criteria both say `toCharacterDataPatch`. Ensure the `export function` line uses that name.

3. **`charExtras` is intentionally absent from `FlowboardNodeData` in Phase 5.** The field is in `CharacterConfigSchema` for the schema's standalone correctness but is NOT cast in the hydration map. TypeScript will not flag this (the field is optional in the schema). Phase 6 WIZARD-03 adds persistence and the hydration cast together. Do not add it preemptively.

4. **The FRAMING_ANCHORS verbatim strings in RESEARCH.md §3 differ slightly from the 4-item list in PATTERNS.md.** RESEARCH.md §3 has the authoritative 4-string list (with the full "strictly front-on orientation..." and "no glasses, no hat..." multi-clause strings). PATTERNS.md has a shorter placeholder version. Use RESEARCH.md §3 strings verbatim — the plan's Task 1 Step C says "copy them verbatim from RESEARCH.md §3."

5. **A/B parity check in verification step 7 requires the old `GenerationDialog.buildCharacterPrompt` to still be present.** Phase 5 does not touch `GenerationDialog.tsx`, so this is guaranteed — but the executor should confirm the old function is still at lines 45–74 before running the comparison.

---

## CHECK COMPLETE

**Verdict: APPROVE**

The Phase 5 plan is sound, complete, and executable. All six requirements are covered by concrete, mechanically specified tasks. The highest-risk item (dual-hydration-site rule) is fully addressed with an automated verify command that will fail immediately if either site is missed. Anti-patterns from CLAUDE.md and the project's shallow-merge contract are explicitly guarded at the type, implementation, and verify levels. Two warnings exist but neither impacts execution correctness. Run `/gsd-execute-phase 05` to proceed.
