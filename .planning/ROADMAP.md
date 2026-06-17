# Roadmap — Flowboard

## Milestones

- ✅ **v1.0 — Frontend i18n (English + Turkish)** — Phases 1–4 (shipped 2026-06-10, archived 2026-06-16) — see [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 — Character Creation Rework** — Phases 5–7 (in progress)

## Phases

<details>
<summary>✅ v1.0 — Frontend i18n (Phases 1–4) — SHIPPED 2026-06-10</summary>

- [x] Phase 1: Infra + Audit (2/2 plans) — i18n wiring, BUGS-01/02/03 fixed, STRING-INVENTORY.md
- [x] Phase 2: English Extraction (5/5 plans) — 414 keys across 20 area prefixes, ~90 files retrofitted
- [x] Phase 3: Turkish + Switcher (executed) — 424-key Turkish parity + SettingsPanel language picker
- [x] Phase 4: Polish + Verify — CONTRIBUTING-i18n.md, check-i18n-parity.mjs, MAINTAINER-CHECKLIST.md

</details>

### v1.1 — Character Creation Rework (Phases 5–7)

- [x] **Phase 5: Data Model + Migration Foundation** — Stable field schema, prompt assembler, convert-on-read migration for v1.0 boards (COMPLETE 2026-06-17)
- [x] **Phase 6: Wizard UI + Preset Library** — Multi-step character wizard mounted in GenerationDialog; saveable named-preset library wired into the wizard (completed 2026-06-17)
- [ ] **Phase 7: Constants Removal + i18n Audit** — Delete legacy preset constants, update ResultViewer, finalize EN+TR key parity as release gate

## Phase Details

### Phase 5: Data Model + Migration Foundation
**Goal**: The structured character field schema and convert-on-read migration are in place so every downstream phase writes to a stable, locale-independent contract
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, MIGRATE-01
**Phase constraints**:
  - No backend Pydantic/DB schema changes (Node.data is already a free-form JSON column; no migration needed)
  - Shallow-merge PATCH contract for node.data enforced: toDataPatch emits only changed keys; cleared fields map to null (delete sentinel); unmodified fields omitted
  - Stable English keys stored in node.data; never translated display labels (locale-independent boards)
  - scripts/check-i18n-parity.mjs exits 0 at phase close (no new locale keys introduced yet, so this is a no-change gate)
  - v1.0 boards with charCountry / charVibe continue to load without console errors throughout this phase
**Success Criteria** (what must be TRUE):
  1. A character node's FlowboardNodeData accepts all new flat fields (charGender, charEthnicity, charAge, charHair, charSkinTone, charOutfit, charExpression, charLighting) and TypeScript strict mode compiles without errors
  2. Passing a CharacterConfig blob with unexpected or missing keys to the Zod schema throws a parse error and routes to the store error slot rather than crashing the app
  3. buildCharacterPrompt produces a deterministic prompt string with framing anchors preserved at fixed positions and no "undefined" or "null" tokens for any partial field combination
  4. Loading a v1.0 board with charCountry: "vn" / charVibe: "clean" nodes converts to charEthnicity on read without console errors and without writing any automatic PATCHes to the backend
  5. Submitting a wizard-like patch via patchNode leaves node.data.mediaId and node.data.aiBrief intact (shallow-merge contract verified manually)
**Plans**: 1 plan
- [x] 05-01-PLAN.md — Land FlowboardNodeData char* extension, Zod schema, prompt assembler, delta-only DataPatch helper, idempotent charCountry→charEthnicity migration wired into both hydration sites (DONE 2026-06-17, commits 0a69182 + 68792b4)
**UI hint**: no

### Phase 6: Wizard UI + Preset Library
**Goal**: Users can create and reuse structured character configurations through a guided wizard with a named-preset library, replacing the old dropdown preset picker
**Depends on**: Phase 5
**Requirements**: WIZARD-01, WIZARD-02, WIZARD-03, WIZARD-04, WIZARD-05, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05
**Phase constraints**:
  - Wizard state is transient (useState inside CharacterWizard); persisted to node.data only on final submit — never per-step
  - No wholesale node.data replacement: wizard submit calls patchNode with the wizard field delta only
  - EN + TR i18n keys for all wizard and library strings added in the same commit (parity CI gate per commit throughout this phase)
  - No dynamic key construction (t(`wizard.step.${step}`) pattern prohibited); no useTranslation() in .ts files
  - Product/brand names stay in constants/, never in locale JSON
  - scripts/check-i18n-parity.mjs exits 0 at phase close
  - v1.0 boards with old charCountry / charVibe nodes load and the wizard opens with pre-filled fields
**Success Criteria** (what must be TRUE):
  1. User can open the character wizard from GenerationDialog (replacing the old preset picker), navigate between Identity, Appearance, Styling, Expression, and Review steps freely without hard-blocking validation on optional fields
  2. The Review step shows a read-only assembled prompt preview via buildCharacterPrompt, and submitting dispatches generation through the existing dispatchGeneration boundary unchanged
  3. User can save a named character preset from the Review step; the preset appears in the library list on wizard Step 0 and can be loaded to pre-fill all wizard fields
  4. User can rename and delete presets inline; delete shows a confirmation; adding a 51st preset shows a warning toast instead of silently failing; a corrupt localStorage blob routes to the Toaster rather than crashing the app
  5. Canceling or pressing ESC discards transient wizard state; a v1.0 board node with old charCountry / charVibe opens the wizard with fields pre-filled from the converted values
**Plans**: TBD
**UI hint**: yes

### Phase 7: Constants Removal + i18n Audit
**Goal**: Legacy character preset constants are deleted with zero call-site survivors, ResultViewer renders pills correctly for both old and new board nodes, and the full EN+TR key catalog is audited as the v1.1 release gate
**Depends on**: Phase 5, Phase 6
**Requirements**: MIGRATE-02, MIGRATE-03, MIGRATE-04, I18N-01, I18N-02, I18N-03, I18N-04
**Phase constraints**:
  - CHARACTER_GENDERS, CHARACTER_COUNTRIES, CHARACTER_VIBES, localizedCountryLabel, localizedVibeLabel deleted only after grep gate passes (zero results outside migration shim)
  - ResultViewer reads charEthnicity (new) with charCountry fallback shim; shim verified against an opened v1.0 board before removal
  - Stale character.country.* and legacy character.vibe.* keys removed from both locale files in the same commit as MIGRATE-02
  - All new string utilities audited for .toLocaleLowerCase("en-US") compliance (no system-locale .toLowerCase() calls on identifier strings)
  - No dynamic i18n key construction anywhere in wizard or library code; no useTranslation() in .ts files
  - scripts/check-i18n-parity.mjs exits 0 — this is the v1.1 release gate
  - A v1.0 board with charCountry: "vn" / charVibe: "clean" nodes loads without console errors, wizard opens with pre-filled fields, and generation dispatches the same shape of prompt as v1.0 (regression diff captured)
**Success Criteria** (what must be TRUE):
  1. grep -r "CHARACTER_COUNTRIES\|CHARACTER_VIBES\|CHARACTER_GENDERS\|localizedCountryLabel\|localizedVibeLabel" frontend/src/ returns zero results outside the migration shim (and the shim itself is removed or marked as dead code)
  2. Opening a v1.0 board with old charCountry: "vn" and charVibe: "clean" character nodes renders the correct localized country and vibe pills in ResultViewer with no console errors
  3. node scripts/check-i18n-parity.mjs exits 0 with all ~40-60 new wizard keys present in both en.json and tr.json, and all stale character.country.* / character.vibe.* keys removed from both files
  4. grep -r "t(\`" frontend/src/ returns no wizard or library code matches; no useTranslation() call appears in any .ts file (non-component); no dynamic key construction present
**Plans**: TBD
**UI hint**: no

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infra + Audit | v1.0 | 2/2 | Complete | 2026-06-10 |
| 2. English Extraction | v1.0 | 5/5 | Complete | 2026-06-10 |
| 3. Turkish + Switcher | v1.0 | — | Complete | 2026-06-10 |
| 4. Polish + Verify | v1.0 | — | Complete (4 items deferred) | 2026-06-10 |
| 5. Data Model + Migration Foundation | v1.1 | 0/? | Not started | - |
| 6. Wizard UI + Preset Library | v1.1 | 1/1 | Complete   | 2026-06-17 |
| 7. Constants Removal + i18n Audit | v1.1 | 0/? | Not started | - |

---

*Last updated: 2026-06-16 — v1.1 roadmap created (Phases 5–7)*
