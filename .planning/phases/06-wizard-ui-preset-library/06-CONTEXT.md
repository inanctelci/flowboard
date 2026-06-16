# Phase 6: Wizard UI + Preset Library - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Mode:** --auto (autonomous discuss; all gray areas resolved from research, Phase 5 outcomes, and UI-SPEC + UI-CHECK)

<domain>
## Phase Boundary

Phase 6 ships the **user-facing character creation flow** built on the Phase 5 data contract. Deliverables:

1. `CharacterWizard.tsx` component mounted inside `GenerationDialog`'s existing `{isCharacter && (...)}` block — replaces the inline preset picker.
2. 5 wizard steps (Identity → Appearance → Styling → Expression → Review) with **soft step gating** (user can jump between steps; only "minimum viable" enforced at Review submit).
3. Per-step chip rows for closed enums; free-text for ethnicity-override and 200-char "extras".
4. Review step renders the assembled prompt preview via `buildCharacterPrompt` (read-only).
5. New `frontend/src/store/characterPresets.ts` Zustand slice with `zustand/middleware/persist` to localStorage key `flowboard.character.presets.v1`.
6. PresetList UI inside the wizard (Step 0 area) to load saved presets; "Save as preset" on Review; rename + delete inline.
7. 50-preset cap with toast; localStorage quota / Zod parse failures route to a store `error` slot consumed by `Toaster`.
8. EN + TR i18n keys (~102 keys per UI-SPEC) added in parallel to wizard code. `scripts/check-i18n-parity.mjs` exits 0 at phase close.

**In scope:** All requirements WIZARD-01..05, LIB-01..05. Plus a small schema extension (`charHairColor` + `charHairStyle` replacing the composite `charHair`) decided in UI-SPEC §Q5 and locked here.

**Not in scope this phase:** ResultViewer.tsx pill updates, constants deletion, the i18n release-audit pass — all Phase 7.

**Requirements covered:** WIZARD-01, WIZARD-02, WIZARD-03, WIZARD-04, WIZARD-05, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05 (10 of 23 v1.1 requirements).

</domain>

<decisions>
## Implementation Decisions

### Wizard mount + lifecycle (WIZARD-01, WIZARD-05)

- **D-01:** `<CharacterWizard rfId onDone />` mounts at the existing `{isCharacter && (...)}` block in `frontend/src/components/GenerationDialog.tsx` (UI-CHECK confirmed the line). Reuse the dialog backdrop, focus trap, ESC handler — no second modal layer.
- **D-02:** Submit calls `dispatchGeneration(rfId, opts)` through the existing generation store boundary — unchanged. Phase 6 does NOT touch the generation pipeline; the wizard composes a `CharacterConfig`, derives the prompt via `buildCharacterPrompt`, calls `patchNode` via `toCharacterDataPatch`, then invokes `dispatchGeneration`.
- **D-03:** **WIZARD-05 honored literally: discard-on-cancel.** ESC / backdrop click / Cancel button discards transient wizard state — NO draft preservation across reopen. The UI-CHECK flagged a spec proposal for a module-level `Map<rfId, Partial<CharacterConfig>>` draft cache; that is OUT of Phase 6. Reason: requirement clarity beats UX nicety; reopen-with-blank is the user's documented expectation; draft preservation can be added in v1.x if real user friction emerges. SPEC §3.8's draft-preservation copy must be ignored or amended; the planner enumerates this as a SPEC-divergence note in PLAN.

### Wizard steps + validation (WIZARD-02, WIZARD-03, WIZARD-04)

- **D-04:** 5 steps in fixed order: Identity → Appearance → Styling → Expression → Review. Step header buttons are clickable jump-targets — no hard-blocking validation between optional steps. Step 0 is the PresetList view (Library) that prefills before Step 1; Steps 1–4 are the wizard fields; Step 5 is Review.
- **D-05:** Minimum-viable validation is enforced ONLY on the Review step's "Generate" button. The minimum set: at least one of `{charGender, charEthnicity, charVibe}` is set. If all three are unset, the Generate button is disabled with a tooltip explaining why. This matches Pitfall #6's prevention pattern (no last-step-only validation trap — validation is visible on every step the moment the user lands).
- **D-06:** Closed-enum fields rendered as chip rows: `charGender`, `charAge`, `charSkinTone`, `charHairColor`, `charHairStyle`, `charExpression`, `charLighting`, `charVibe`. Toggle-to-deselect (clicking the active chip clears the value to `undefined`, omitted from `node.data` via `toCharacterDataPatch` if nothing prior, or `null` sentinel if it had been previously set).
- **D-07:** Free-text fields: `charEthnicity` is the only free-text-with-suggestions field (a small select of 8–10 regional bucket presets — see D-13 — plus a free-text override input). `charExtras` is a textarea, 200-char hard cap (Zod-enforced). Both store English / user-typed prose on `node.data` — never translated labels.
- **D-08:** Review step shows the assembled prompt preview via `buildCharacterPrompt(config)` — read-only, monospace-styled. Users see the exact string that will be dispatched. No edit-the-prompt mode in v1.1 (out of scope — defer to v1.x).

### Preset library (LIB-01..05)

- **D-09:** New `frontend/src/store/characterPresets.ts` Zustand slice. Shape: `{ presets: CharacterPreset[], error: string | null, addPreset(name, config), renamePreset(id, name), deletePreset(id), clearError() }`. Type: `CharacterPreset = { id: string; name: string; createdAt: string; config: CharacterConfig }`.
- **D-10:** `zustand/middleware/persist` middleware with:
  - Key: `flowboard.character.presets.v1`
  - `partialize`: only persist `presets` (excludes the transient `error` field).
  - `version: 1` with no migrate function in Phase 6 (future schema bumps add migrate later).
  - Wrap reads through `PersistedPresetSchema.safeParse` (already exported from `frontend/src/lib/character/schema.ts`) inside an `onRehydrateStorage` callback — on parse failure, clear the in-memory presets and set `error: "Saved presets were corrupted and could not be loaded."`. No app crash, no boot loop, no silent loss without user notice.
- **D-11:** PresetList UI inside the wizard, placed as a collapsible section at the top of Step 0 (per UI-SPEC IA). Loading a preset CLONE-fills the wizard fields (clone-then-edit pattern per REQUIREMENTS.md LIB-03 — never edit-in-place to prevent accidental overwrite of a shared preset).
- **D-12:** "Save as preset" lives on the Review step. User types a name in an inline input, presses Enter or "Save" → `addPreset(name, currentConfig)`. Rename and delete are inline in the PresetList rows: pencil icon → input → confirm; trash icon → confirmation tooltip then delete. No separate modal for preset management.
- **D-13:** **50-preset cap (LIB-05):** `addPreset` checks `presets.length` first. At 50, refuse the save and route a friendly error to the `error` slot ("Preset library is full (50/50). Remove a preset to save a new one."). On localStorage quota exception during `persist` write, the catch routes to the `error` slot with "Could not save presets — your browser storage is full." — Toaster surfaces both. No silent failure.

### Schema + data model changes for Phase 6

- **D-14:** `charHair` split into `charHairColor` + `charHairStyle` (UI-CHECK flag #2 resolved; Phase 5 D-04 anticipated this). Planner tasks must add:
  1. `CharacterConfigSchema` in `frontend/src/lib/character/schema.ts` gets `charHairColor` / `charHairStyle` optional string fields; `charHair` REMAINS in the schema (legacy read-only — Phase 7 may remove if no consumer remains).
  2. `FlowboardNodeData` in `frontend/src/store/board.ts` gets the two new optional string fields.
  3. `buildCharacterPrompt.ts` token order: `charHairColor` then `charHairStyle` (both, comma-separated as a single "hair" segment); fall back to `charHair` legacy if the new pair is absent (preserves A/B parity from Phase 5).
  4. `migrate.ts` adds a step: if `charHair` is set as a composite string and `charHairColor` is unset, decompose by splitting at the first whitespace → `charHairColor = first word`, `charHairStyle = rest`. Idempotent: skip if either new key is already set.
- **D-15:** `charExtras` field is wired into `FlowboardNodeData` in Phase 6 (Phase 5 D-04 deferred this — it was intentionally absent from the Phase 5 interface). The Zod schema already has `.max(200)` on `charExtras`. Hydration mapping in `loadInitialBoard` and `switchBoard` casts it as `string | undefined` (no migration needed; existing nodes lack it).
- **D-16:** Regional bucket presets for the `charEthnicity` free-text field (per FEATURES research "regional buckets 8–10 + free-text override"): East Asian, South Asian, Southeast Asian, Middle Eastern, West African, East African, European, Latin American, North American Indigenous, Pacific Islander. These are stable English values stored on `node.data`. The wizard renders them as suggestion chips above the free-text input. The Zod schema field for `charEthnicity` is `z.string().max(60).optional()` — no closed enum (free-text always allowed).

### Phase 5 carry-forward (INFO observation from 05-VERIFICATION.md)

- **D-17:** `refreshBoardState()` in `frontend/src/store/pipeline.ts` is a THIRD hydration path that Phase 5 did not migrate (Phase 5 research only identified `loadInitialBoard` + `switchBoard`). Phase 6 adds `migrateCharacterNodeData` to `refreshBoardState()` as a small follow-on task in the same PLAN, recovered cheaply because the planner is already touching `pipeline.ts`-adjacent code via dispatch boundaries. Acknowledged as "completing Phase 5 silent gap" — not new scope.

### i18n discipline (WIZARD constraint + I18N-01..04 from Phase 7 honored per-commit)

- **D-18:** All ~102 new wizard / preset / character-field strings land in `en.json` AND `tr.json` at parity in the SAME COMMIT as the code that uses them. `node scripts/check-i18n-parity.mjs` exits 0 on every Phase 6 commit. Phase 7's full audit just removes legacy keys after constants deletion; Phase 6 is responsible for ALL new key parity.
- **D-19:** Key namespace prefixes (per UI-SPEC §6): `wizard.*` (modal chrome), `wizard.step.*` (step names), `wizard.field.*` (field labels + closed-enum option labels), `wizard.preset.*` (preset library UI), `wizard.error.*` (error messages routed to Toaster). NO dynamic key construction (`t(\`wizard.step.${n}\`)` is BANNED — flat literal keys only). NO `useTranslation()` in `.ts` files (only `.tsx`).
- **D-20:** Display labels for closed-enum options come from i18n (`t("wizard.field.gender.option.female")` → "Female" in EN, "Kadın" in TR). Values stored on `node.data` are the stable English keys (`"female"`). The Zod schema enums are the stable English keys. Localization happens at render time only.
- **D-21:** All new string utilities introduced in Phase 6 use `.toLocaleLowerCase("en-US")` / `.toLocaleUpperCase("en-US")` to prevent the Turkish dotted-i regression class (v1.0 BUGS-02). If no new string utilities are needed in Phase 6, this is a no-op gate.

### Discretion delegations (planner / executor decide)

- Exact React component decomposition inside `components/character/` (e.g. one `CharacterWizard.tsx` vs splitting steps into separate files) — planner chooses, but the suggested split is: `CharacterWizard.tsx` (shell + step routing), `WizardStepIdentity.tsx`, `WizardStepAppearance.tsx`, `WizardStepStyling.tsx`, `WizardStepExpression.tsx`, `WizardStepReview.tsx`, `PresetList.tsx`. 7 files. Acceptable to collapse if the planner prefers fewer for v1.
- Naming of the 8–10 regional bucket constants (D-16) — keep them stable English; planner finalizes the exact spelling.
- Toast / inline error UX details (icon, color) — match existing Toaster patterns; styles.css reuse per UI-SPEC.
- ID generation strategy for `CharacterPreset.id` — `crypto.randomUUID()` is fine; `Date.now() + Math.random()` acceptable fallback. Planner picks.
- `onRehydrateStorage` error message exact wording — keep user-readable and routed to i18n via `wizard.error.presetsCorrupted` and `wizard.error.storageFull`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / requirements
- `.planning/PROJECT.md` — v1.1 milestone
- `.planning/REQUIREMENTS.md` — WIZARD-01..05, LIB-01..05 + Out of Scope locks
- `.planning/ROADMAP.md` §"Phase 6: Wizard UI + Preset Library" — 5 success criteria load-bearing

### Phase 5 outputs (Phase 6 builds on these)
- `frontend/src/lib/character/schema.ts` — `CharacterConfigSchema`, `PersistedPresetSchema`, `CharacterConfig` type (shipped)
- `frontend/src/lib/character/buildCharacterPrompt.ts` — deterministic prompt assembler (shipped)
- `frontend/src/lib/character/toDataPatch.ts` — `toCharacterDataPatch` delta-only helper (shipped)
- `frontend/src/lib/character/migrate.ts` — `migrateCharacterNodeData` (shipped — extend with charHair decomposition in Phase 6 per D-14)
- `frontend/src/store/board.ts` — `FlowboardNodeData` (shipped with new char* fields; Phase 6 adds `charHairColor`/`charHairStyle`/`charExtras`)
- `.planning/phases/05-data-model-migration-foundation/05-01-SUMMARY.md` §"A/B Parity Note" — Phase 7 anchor

### Research outputs (Phase 6-relevant)
- `.planning/research/SUMMARY.md`
- `.planning/research/FEATURES.md` — table-stakes vs differentiators vs anti-features; ethnicity regional buckets
- `.planning/research/ARCHITECTURE.md` — wizard mount inside GenerationDialog, localStorage Zustand slice
- `.planning/research/PITFALLS.md` — #4 framing anchors lost, #5 wizard state lost, #6 multi-step validation trap, #10 library/Reference collision, #11 localStorage quota silent failure

### Phase 6 design artifacts
- `.planning/phases/06-wizard-ui-preset-library/06-UI-SPEC.md` — 6-pillar design contract, ~102-key i18n inventory, ASCII layout
- `.planning/phases/06-wizard-ui-preset-library/06-UI-CHECK.md` — APPROVED with 2 planner-action flags (resolved here in D-03 and D-14)

### Codebase canonical files
- `frontend/src/components/GenerationDialog.tsx` — wizard mount site; existing modal infrastructure to reuse
- `frontend/src/components/ReferencesPanel.tsx` — analog for save/list/rename/delete UX (DO NOT change in Phase 6)
- `frontend/src/store/references.ts` — analog Zustand slice with localStorage persistence (panel-open pattern)
- `frontend/src/store/pipeline.ts` — `refreshBoardState()` is the third hydration path Phase 5 missed; Phase 6 closes that gap (D-17)
- `frontend/src/i18n/i18n.ts` — typed key registration via `CustomTypeOptions`
- `frontend/src/i18n/locales/en.json` — extend with `wizard.*` keys
- `frontend/src/i18n/locales/tr.json` — extend with `wizard.*` keys at parity
- `scripts/check-i18n-parity.mjs` — gate (must exit 0 on every commit)
- `frontend/src/styles.css` — reuse `.gen-dialog`, `.aspect-chip`, button/header/footer classes per UI-SPEC
- `frontend/src/components/Toaster.tsx` — consumes store `error` slots; works automatically once we set `error` on `characterPresetsStore`
- `CLAUDE.md` §"Zustand stores", §"React components", §"Naming Patterns", §"Anti-Patterns"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- Existing `GenerationDialog.tsx` modal infrastructure (backdrop, focus trap, ESC handler, footer button row) — wizard reuses, does not duplicate.
- `frontend/src/store/references.ts` localStorage persistence pattern — closest analog for `characterPresets.ts` slice (read for shape consistency).
- `frontend/src/components/Toaster.tsx` automatically picks up new store `error` slots (read its priority order — `chat > pipeline > generation > board`; we'll add `characterPresets` below `board`).
- `CHARACTER_VIBES` from `frontend/src/constants/character.ts` — still imported in Phase 6 by `buildCharacterPrompt.ts` (Phase 5) and by the wizard's vibe chip row for option labels. Deletion deferred to Phase 7.

### Established patterns
- One Zustand slice per concern (CLAUDE.md "Zustand stores"); `create<State>((set, get) => ({ ... }))`.
- Every store with side-effecting actions exposes `error: string | null` + `clearError()`.
- React function components only; PascalCase file names; named exports.
- Relative imports (`../store/characterPresets`, `../lib/character/schema`) — no `@/` alias.
- New types `*Key` for closed-enum string unions (`GenderKey`, `EthnicityKey`, `AgeKey`, etc.) — declared in `lib/character/schema.ts` next to the Zod schema.

### Integration points
- `GenerationDialog.tsx` `{isCharacter && (...)}` block (line ~871 per UI-CHECK) — single replacement site.
- `frontend/src/store/generation.ts` `dispatchGeneration` — call boundary unchanged. Wizard's submit calls this with the same args the old picker did, just with a richer config.
- `frontend/src/store/board.ts` `loadInitialBoard` + `switchBoard` — Phase 6 extends `FlowboardNodeData` with `charHairColor`/`charHairStyle`/`charExtras`; existing migration wrap from Phase 5 stays in place.
- `frontend/src/store/pipeline.ts` `refreshBoardState()` — Phase 6 wraps with `migrateCharacterNodeData` (closing Phase 5's INFO observation).
- `frontend/src/api/client.ts` `patchNode(rfId, patch)` — unchanged. Wizard submits via `toCharacterDataPatch`.

### Constraints to honor
- TypeScript strict (`tsc -b --noEmit`).
- `node scripts/check-i18n-parity.mjs` exits 0 on every commit.
- No new dependencies (Zod + Zustand persist already shipped in Phase 5).
- No CSS framework (no shadcn, no Radix, no Headless UI — UI-SPEC and STACK research already excluded).
- No wholesale `node.data` replace — wizard submit MUST use `toCharacterDataPatch`.
- No backend (`agent/flowboard/`) edits.
- No `ResultViewer.tsx` updates (Phase 7).
- No `CHARACTER_GENDERS|COUNTRIES|VIBES` deletions (Phase 7).

</code_context>

<specifics>
## Specific Ideas

- The wizard's "Generate" button's disabled-state tooltip MUST be i18n-driven and explain the minimum-viable rule plainly (e.g. EN: "Set at least one of Gender, Ethnicity, or Vibe to generate.", TR: equivalent). No silent dead-button.
- The PresetList empty state copy (no saved presets) is a one-line hint, not a marketing flourish. E.g. "Save the current setup as a preset on the Review step."
- The 50-cap message uses the actual count: "Preset library is full (50/50). Remove a preset to save a new one." — not just "Full".
- `toCharacterDataPatch` from Phase 5 is the ONLY way the wizard writes to `node.data`. The plan's verify-block must grep for any direct `data: { ... }` assignment to a character node and fail if found.
- The migration step for `charHair` decomposition (D-14 item 4) must be wrapped in the same idempotency guard as Phase 5's migration: skip if `charHairColor` or `charHairStyle` is already set.

</specifics>

<deferred>
## Deferred Ideas

- Draft preservation across ESC/reopen — explicitly OUT of Phase 6 per D-03; not a future commitment, but listed here so future scope discussions remember we considered it.
- Edit-the-prompt mode on Review step — explicitly out of v1.1; users see read-only assembled prompt only.
- Preset thumbnails generated from a one-shot dispatch on save — in REQUIREMENTS.md Future as `LIB-FUTURE-02`.
- Reference-table-backed presets — `LIB-FUTURE-01` in REQUIREMENTS.md (requires backend schema change, explicitly out of v1.1).
- AI-assisted fills (AI-01, AI-02 in REQUIREMENTS.md Future) — separate milestone.
- Per-field lock/unlock for variation generation (VAR-01) — out.
- Real-time image preview on field change (VAR-02) — out (FEATURES anti-feature).
- Expanded ethnicity multi-select (FIELD-02) — out; regional buckets + free-text are v1.1.
- Outfit as a fully decoupled field with its own chip row (FIELD-03) — Phase 6 keeps it in the `charOutfit` text field (already in schema) but does NOT add a dedicated chip row UI in v1.1 to keep the wizard tight. The schema field stays available for future activation.
- Lighting as a fully decoupled chip row (FIELD-01 / D-15 carry-over consideration) — Phase 6 INCLUDES `charLighting` as a chip row per UI-SPEC, completing this in v1.1. (Note: this moves `FIELD-01` from "deferred" to "delivered" — update REQUIREMENTS.md Future section accordingly during Phase 6 verification.)
- Removal of legacy `charHair` composite field from the schema — deferred to Phase 7 after the wizard ships and we confirm no remaining writes to the composite. Phase 6 keeps both for safety.

</deferred>

---

*Phase: 6-wizard-ui-preset-library*
*Context gathered: 2026-06-17*
*Mode: --auto (one-pass autonomous)*
