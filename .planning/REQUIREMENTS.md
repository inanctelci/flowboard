# Requirements: Flowboard v1.1 — Character Creation Rework

**Defined:** 2026-06-16
**Core Value:** Replace the frozen 3-axis character preset picker (2 genders, 7 Vietnamese-labelled nationalities, 6 baked-token vibes) with a guided multi-step wizard producing structured, reusable character configurations — so users can express the diversity of characters the canvas is built for.

## v1.1 Requirements

Each requirement maps to exactly one roadmap phase. Verification is manual / TS-strict / parity-CI driven (no frontend test runner — established in v1.0).

### Data Model + Prompt Assembler

- [ ] **DATA-01**: `FlowboardNodeData` extended with flat top-level character fields (`charGender`, `charEthnicity`, `charAge`, `charHair`, `charSkinTone`, `charOutfit`, `charExpression`, `charLighting`) — no nested `character: { ... }` object (avoids shallow-merge PATCH wholesale-replace anti-pattern documented in `CLAUDE.md` and `frontend/src/api/client.ts:196-219`)
- [ ] **DATA-02**: `CharacterConfig` Zod schema (`zod@^4`) as single source of truth; TypeScript type derived via `z.infer<>`; runtime parse on every localStorage read (prevents corrupt-state-blocks-app risk)
- [ ] **DATA-03**: Pure prompt-assembler module `frontend/src/lib/character/buildCharacterPrompt.ts` (following `lib/storyboardPrompt.ts` pattern) — deterministic token ordering, framing anchors (frontal face, both eyes, no occlusion, head-and-shoulders) preserved at fixed positions
- [ ] **DATA-04**: `toDataPatch(wizardState, originalData)` helper emits only changed keys for `patchNode`; cleared fields → `null` (delete sentinel); untouched fields omitted entirely; verified that submit does not wipe `mediaId` / `aiBrief` / other non-character data
- [ ] **DATA-05**: Stable English keys / user-typed English prose stored in `node.data` for every structured field — never translated display labels (locale-independent boards; assembler stays correct on any installed locale)

### Wizard UI

- [ ] **WIZARD-01**: Multi-step guided wizard component (`components/character/CharacterWizard.tsx`) mounted inside the existing `GenerationDialog` `{isCharacter && (...)}` block — replaces the inline preset picker, reuses existing modal backdrop / focus trap / ESC handler
- [ ] **WIZARD-02**: Wizard steps: Identity → Appearance → Styling → Expression → Review. Step headers are navigation guidance, not hard gates — user can jump to any step at any time; only minimum-viable fields are required for submit
- [ ] **WIZARD-03**: Closed-enum fields rendered as chip rows (gender, age range, expression, vibe, hair color, hair style, optional lighting); free-text fields for ethnicity-override and an "extras" escape hatch (200-char cap)
- [ ] **WIZARD-04**: Review step shows the assembled prompt preview (read-only) via `buildCharacterPrompt` — users see exactly what gets dispatched
- [ ] **WIZARD-05**: Cancel / ESC / backdrop click discards transient wizard state; submit calls existing `dispatchGeneration()` boundary unchanged (no new generation pipeline)

### Preset Library

- [ ] **LIB-01**: New `frontend/src/store/characterPresets.ts` Zustand slice with `zustand/middleware/persist` to `localStorage` (versioned key `flowboard.character.presets.v1`); `partialize` excludes any transient fields
- [ ] **LIB-02**: "Save as preset" action available from the wizard Review step — user names the preset; full `CharacterConfig` is persisted
- [ ] **LIB-03**: `PresetList` UI on wizard Step 0 lets the user load a saved preset to pre-fill all wizard fields (clone-then-edit pattern, not edit-in-place — prevents accidental overwrite of a shared preset mid-wizard)
- [ ] **LIB-04**: Rename and delete presets inline in the wizard; deletes confirm before applying
- [ ] **LIB-05**: 50-preset cap with warning toast on save; localStorage quota / parse errors route to a store `error` slot consumed by `Toaster` — no silent failure, no app crash if the persisted blob is corrupt

### Removal + Migration

- [ ] **MIGRATE-01**: Convert-on-read migration in `loadInitialBoard` hydration path — `lib/character/migrate.ts` maps legacy `charCountry` → `charEthnicity` via the existing `CHARACTER_COUNTRIES[n].tag` mapping; legacy `charVibe` retained as-is until WIZARD ships, then mapped or dropped. No automatic PATCHes on startup.
- [ ] **MIGRATE-02**: `CHARACTER_GENDERS`, `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, `localizedCountryLabel`, `localizedVibeLabel` deleted from `frontend/src/constants/character.ts` only after every call site is updated (grep gate: zero results for those symbols outside the migration shim)
- [ ] **MIGRATE-03**: `ResultViewer.tsx` reads pills from new structured fields with a temporary `charCountry` fallback shim; verified against an opened v1.0 board (pills render with correct localized labels) before the shim is removed
- [ ] **MIGRATE-04**: A v1.0 board with old `charCountry: "vn"` / `charVibe: "clean"` nodes loads without console errors, the wizard opens with pre-filled fields, and generation dispatches the same shape of prompt as v1.0 (regression diff captured in a planning note)

### i18n Coverage

- [ ] **I18N-01**: All new wizard / preset / character-field strings added to `en.json` and `tr.json` at parity (estimated 40–60 keys); `node scripts/check-i18n-parity.mjs` exits 0 on every commit through the milestone
- [ ] **I18N-02**: Stale `character.country.*` and legacy `character.vibe.*` keys removed from both locale files in the same commit as `MIGRATE-02`
- [ ] **I18N-03**: Any new string utility uses `.toLocaleLowerCase("en-US")` / `.toLocaleUpperCase("en-US")` to prevent Turkish dotted-i regressions (same class of bug as v1.0's BUGS-02)
- [ ] **I18N-04**: No dynamic i18n key construction in the wizard or preset library; no `useTranslation()` in `.ts` files; product / brand names stay in `constants/`, never in locale JSON (v1.0 discipline preserved)

## Future Requirements

Deferred to v1.x or beyond. Tracked but not in this milestone.

### AI-assisted character creation

- **AI-01**: AI-assisted brief generation from a reference photo upload (vision service already exists; wire-up is a separate milestone)
- **AI-02**: AI-suggested fills for individual wizard fields (single-field suggest API on the structured form)

### Variation & advanced control

- **VAR-01**: Per-field lock/unlock for batch variation (Midjourney-`--cw`-style — current variants handle the simple cases)
- **VAR-02**: Real-time image preview on field change (deferred: consumes generation credits per interaction)

### Library evolution

- **LIB-FUTURE-01**: Round-trip presets to the `Reference` SQLite table for true persistence across machine wipes (requires backend schema change — explicitly out of scope for v1.1; revisit when cross-device sync is a real ask)
- **LIB-FUTURE-02**: Preset thumbnails generated from a one-shot dispatch on save

### Field-set evolution

- **FIELD-01**: Lighting as a fully decoupled user-facing field (currently still partially encoded inside vibe tokens; full decoupling requires auditing all 6 vibe token arrays — a content decision deferred)
- **FIELD-02**: Expanded ethnicity multi-select (~20 named options) — trigger: users report regional buckets are too coarse
- **FIELD-03**: Outfit as a fully independent field for "K-Pop vibe + business formal"-style combinations (table-stakes per FEATURES research, but reuses the same wizard surface — promoted out of v1.1 only if the wizard rebuild proves heavier than expected; otherwise can be folded in)

## Out of Scope

Explicitly excluded for v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Backend Pydantic / SQLModel schema changes | User-locked at milestone scoping; the milestone is a frontend-only rework. `Node.data` is already a free-form JSON column — no migration needed. Reference table extension deferred to LIB-FUTURE-01. |
| AI-assisted brief generation from photo | User-chose "Guided wizard (multi-step)" creation model, explicitly not "AI-assisted brief from photo". The vision service stays for its current uses. |
| Contributor documentation updates | User-locked at milestone scoping. `CONTRIBUTING-i18n.md` from v1.0 stays current; new wizard internals don't need contributor docs yet. |
| New frontend test runner | Established v1.0 constraint. TypeScript strict + i18n parity script remain the correctness gates; manual UAT for wizard / library flows. |
| Right-to-left language support | Deferred from v1.0; EN + TR are LTR. Revisit when an RTL locale is contributed. |
| Cross-device preset sync | `localStorage` is sufficient for a single-user local app; user explicitly declined backend changes that would be required for sync. |
| Pluralization / ICU MessageFormat beyond library defaults | v1.0 discipline preserved — keep keys flat and human-readable. |
| Translating user-authored content (preset names, free-text overrides, board / node labels) | Locale-independent storage rule from v1.0 — user data stays as the user typed it. |
| Real-time image preview on field change | FEATURES research anti-feature: consumes generation credits per interaction. |
| Per-field lock/unlock for batch variation | FEATURES research anti-feature: variants already cover the simple cases. |
| 100+ country dropdown | FEATURES research anti-feature: enumerated list offends by omission; regional buckets + free-text override are more expressive. |
| Wholesale `node.data` replacement (any path) | CLAUDE.md / `frontend/src/api/client.ts:196-219` documented anti-pattern. All wizard writes must be deltas via `toDataPatch`. |

## Traceability

Phase mapping populated by the roadmapper. All v1.1 requirements covered.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 5 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 5 | Pending |
| DATA-04 | Phase 5 | Pending |
| DATA-05 | Phase 5 | Pending |
| WIZARD-01 | Phase 6 | Pending |
| WIZARD-02 | Phase 6 | Pending |
| WIZARD-03 | Phase 6 | Pending |
| WIZARD-04 | Phase 6 | Pending |
| WIZARD-05 | Phase 6 | Pending |
| LIB-01 | Phase 6 | Pending |
| LIB-02 | Phase 6 | Pending |
| LIB-03 | Phase 6 | Pending |
| LIB-04 | Phase 6 | Pending |
| LIB-05 | Phase 6 | Pending |
| MIGRATE-01 | Phase 5 | Pending |
| MIGRATE-02 | Phase 7 | Pending |
| MIGRATE-03 | Phase 7 | Pending |
| MIGRATE-04 | Phase 7 | Pending |
| I18N-01 | Phase 7 | Pending |
| I18N-02 | Phase 7 | Pending |
| I18N-03 | Phase 7 | Pending |
| I18N-04 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-16*
*Last updated: 2026-06-16 — traceability filled by roadmapper (Phases 5–7)*
