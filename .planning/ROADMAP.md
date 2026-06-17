# Roadmap — Flowboard

## Milestones

- ✅ **v1.0 — Frontend i18n (English + Turkish)** — Phases 1–4 (shipped 2026-06-10, archived 2026-06-16) — see [`milestones/v1.0-ROADMAP.md`](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 — Character Creation Rework** — Phases 5–7 (shipped 2026-06-17, archived 2026-06-17) — see [`milestones/v1.1-ROADMAP.md`](milestones/v1.1-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 — Frontend i18n (Phases 1–4) — SHIPPED 2026-06-10</summary>

- [x] Phase 1: Infra + Audit (2/2 plans) — i18n wiring, BUGS-01/02/03 fixed, STRING-INVENTORY.md
- [x] Phase 2: English Extraction (5/5 plans) — 414 keys across 20 area prefixes, ~90 files retrofitted
- [x] Phase 3: Turkish + Switcher (executed) — 424-key Turkish parity + SettingsPanel language picker
- [x] Phase 4: Polish + Verify — CONTRIBUTING-i18n.md, check-i18n-parity.mjs, MAINTAINER-CHECKLIST.md

</details>

<details>
<summary>✅ v1.1 — Character Creation Rework (Phases 5–7) — SHIPPED 2026-06-17</summary>

- [x] Phase 5: Data Model + Migration Foundation (1/1 plan) — Zod schema, prompt assembler, delta-only PATCH helper, convert-on-read migration
- [x] Phase 6: Wizard UI + Preset Library (1/1 plan, 4 waves) — 5-step CharacterWizard + PresetList + characterPresets slice + 102 i18n keys + GenerationDialog swap
- [x] Phase 7: Constants Removal + i18n Audit (1/1 plan, 5 steps) — DELETE constants/character.ts, ResultViewer pills via new fields + legacy shim, EN/TR 511/511 release gate

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Infra + Audit | v1.0 | 2/2 | Complete | 2026-06-10 |
| 2. English Extraction | v1.0 | 5/5 | Complete | 2026-06-10 |
| 3. Turkish + Switcher | v1.0 | — | Complete | 2026-06-10 |
| 4. Polish + Verify | v1.0 | — | Complete (4 items deferred) | 2026-06-10 |
| 5. Data Model + Migration Foundation | v1.1 | 1/1 | Complete | 2026-06-17 |
| 6. Wizard UI + Preset Library | v1.1 | 1/1 | Complete | 2026-06-17 |
| 7. Constants Removal + i18n Audit | v1.1 | 1/1 | Complete (9 UAT items deferred) | 2026-06-17 |

---

*Last updated: 2026-06-17 — v1.1 milestone closed and archived*
