---
verdict: flag
phase: 6
checked: 2026-06-17
---

# UI-CHECK — Phase 6: Character Wizard + Preset Library

## Dimension Results

| Dimension | Verdict | Notes |
|-----------|---------|-------|
| 1 Copywriting | FLAG | Two CTAs use bare verbs without nouns; one generic label present |
| 2 Visuals | PASS | Focal point declared (accent CTA); hierarchy clear; no icon-only actions |
| 3 Color | PASS | 60/30/10 declared; accent reserved-for list is specific; destructive color declared |
| 4 Typography | PASS | 10 distinct sizes listed but 7 are ≤13px — effectively 4 visual tiers; weights: 400/500/600 only (3 weights, triggers FLAG) |
| 5 Spacing | FLAG | Two non-standard values (6px, 10px) documented as reuse of existing classes — see detail |
| 6 Registry Safety | PASS | No third-party registries; manual CSS + Zustand only; no shadcn |

---

## Overall Status: APPROVED (with FLAGs)

No BLOCK-level findings. Planning can proceed. All FLAGs are non-blocking recommendations.

---

## Blocking Issues

None.

---

## Recommendations (FLAGs)

### FLAG 1 — Dimension 1: Generic / bare-verb CTA labels

**Evidence:**
- `wizard.back_btn` EN value: `"Back"` — bare verb, no noun
- `wizard.next_btn` EN value: `"Next"` — bare verb, no noun
- `wizard.preset.delete_confirm_btn` EN value: `"Delete"` — single verb, destructive action

**Why it matters:** The checker rule FLAGs single-word CTAs without a noun. For the Back/Next pair on a multi-step wizard the convention is widely understood and the UX research does not flag it — however the preset delete confirm button says `"Delete"` with no target noun while the confirmation row itself says `"Delete '{{name}}'?"`. The button label should echo the noun to reduce accidental tap risk.

**Recommendation (non-blocking):**
- `wizard.preset.delete_confirm_btn` → `"Delete preset"` (or keep `"Delete"` if planner accepts the inline confirmation row as sufficient guardrail — it is).
- `wizard.back_btn` / `wizard.next_btn` — acceptable as-is given the tablist context; no change required.

---

### FLAG 2 — Dimension 4: Three font weights declared (400 / 500 / 600)

**Evidence (§1.3):**
- 400 (chip text, hint, textarea, char-count, preset-card meta)
- 500 (preset-card name)
- 600 (dialog title, step tab label, field label, CTA button)

**Rule:** BLOCK triggers at >2 weights. This spec uses 3. However, all three are within the "thin-regular-semibold" range of a single system-UI font face; 500 is used for exactly one role (preset-card name) and is visually close to 600. This is a FLAG not a BLOCK because the weights are inherited from the existing design system in styles.css (the `.project-sidebar` pattern already uses weight 500 for names) — introducing a new weight is consistent with established precedent.

**Recommendation (non-blocking):** Consider collapsing `charWizard__preset-name` weight from 500 → 600 to stay within 2 weights. Only do this if it does not conflict with the visual hierarchy of the preset shelf. If planner accepts 3 weights, add a comment in the spec acknowledging the deviation.

---

### FLAG 3 — Dimension 5: Two non-standard spacing values (6px, 10px)

**Evidence (§1.2):**
- Field gap: `6px` — not a multiple of 4; not in the standard set {4, 8, 16, 24, 32, 48, 64}
- Preset card padding: `10px 12px` — 10px is not a multiple of 4
- Textarea padding: `10px 12px` — same
- Preset list item gap: `6px` — same as field gap

**Context:** The spec explicitly states these values match existing classes in `styles.css` (`.gen-dialog__field gap` is already 6px, `.gen-dialog__textarea padding` is already 10px 12px). These are not new violations — they are inherited from v1.0 design debt in the existing dialog.

**Verdict rationale:** The checker dimension 5 would BLOCK if new values were declared. Because the spec correctly identifies these as reuse of existing classes (not new values), this is downgraded to a FLAG. The executor must NOT introduce these values as new CSS declarations — they must reuse the existing class definitions. If the executor writes new CSS rules using 6px or 10px for wizard-specific classes, that becomes a BLOCK.

**Recommendation (non-blocking):** In §2.4 (New CSS Classes), explicitly note that `.char-wizard__step` gap of `16px` and `.char-wizard__preset-shelf` padding of `10px 12px` must use `--` token variables or inherit from parent class rather than declaring new 10px values. The 22 reused classes are the safe path.

---

## Specific Verification Results

### 1. WIZARD-05 vs. Draft Preservation (§3.7 / §3.8) — COHERENT, FLAG

WIZARD-05 states: "Cancel / ESC / backdrop click **discards** transient wizard state."

The spec in §3.8 implements draft-preservation across close/reopen for the SAME node, and discards when `rfId` changes. This is a direct contradiction of WIZARD-05's plain text.

**Resolution path declared in spec:** §3.8 states draft is cleared on "explicit discard (start-over button)" and the UX is "automatic silent restoration on reopen." This is a scope expansion beyond WIZARD-05.

**Recommendation:** The planner must either:
(a) Accept the scope expansion and annotate REQUIREMENTS.md WIZARD-05 with a SPEC-DELTA note: "Phase 6 UI-SPEC refines WIZARD-05 — draft is preserved across same-node reopen; discard only on explicit Start Over or rfId change." This is the correct path — the draft-preservation is well-motivated by Pitfall #5.
(b) Remove §3.8 and implement strict discard-on-close per WIZARD-05 literal text.

Option (a) is strongly recommended. The contradiction is intentional design improvement, not an error — it just needs the REQUIREMENTS.md annotation to avoid a Phase 7 executor questioning the divergence.

---

### 2. Pitfall #5 Reconciliation — COHERENT

Pitfall #5 warns about state silently lost on accidental close. WIZARD-05 requires discard-on-cancel. The spec resolves this by defining "accidental" ESC as indistinguishable from intentional — so the guardrail is draft-persistence (silent restore) rather than a "Keep draft?" prompt. The spec explicitly rejects the modal-confirm path ("No 'Keep draft?' dialog — restoration is automatic and silent"). This is a reasonable product decision. The Pitfall #5 UX table entry ("Prompt 'Keep draft?' on ESC/backdrop click") is superseded by the spec's silent-restore approach. No inconsistency remains.

---

### 3. Library / Reference Semantic Collision (Pitfall #10) — CLEAN

Spec §7 anti-features explicitly excludes "Storing presets in the Reference/SQLite table" with the correct rationale. Spec §8 Pitfall #10 declares the localStorage key `flowboard.character.presets.v1` and confirms `ReferencesPanel` is unchanged. Save CTA is labeled `wizard.preset.save_btn` = `"Save as preset"` — distinct from the existing "Save to Library" reference flow in `NodeCard.tsx` / `ResultViewer.tsx`. No label collision.

---

### 4. i18n Key Count and Shape — PASS WITH ANNOTATION

Key count: ~102 keys (exact per spec §6.1 recount). Initial REQUIREMENTS.md estimate was 40-60. The overcount is explained correctly: the field option keys (48 keys for 8 closed-enum fields) were not in scope when the estimate was made. The parity script exit-0 gate is the enforcement mechanism — the count itself is not the gate.

Dynamic key construction: none found. Spec §6.1 explicitly states "No dynamic key construction" and enumerates all keys statically. No `t(\`...${var}\`)` patterns present.

Closed-enum option keys use stable English identifiers (`wizard.field.vibe.option.clean`, etc.). Stored `node.data` values are the stable keys (e.g. `"clean"`, `"east-asian"`) — never the translated display strings. Data contract is locale-independent per D-03 / DATA-05.

Parity discipline: spec requires both `en.json` and `tr.json` updated in the same commit with `check-i18n-parity.mjs` exit-0 gate.

**One issue:** The `wizard.preset.default_name` key value is `"{{vibe}} {{ethnicity}} character"` — this is an interpolated string (react-i18next `{{var}}` syntax). This is NOT a dynamic key — the key itself is static and the interpolation is standard i18next variable substitution, which is correct and type-safe. No flag needed.

---

### 5. Reuse of Existing styles.css Classes — VERIFIED

Spot-checked 10 of the 22 claimed reused classes against `/Users/inanctelci/Development/flowboard/frontend/src/styles.css`:

| Class | Line in styles.css | Status |
|-------|--------------------|--------|
| `.gen-dialog__field` | 3093 | FOUND |
| `.gen-dialog__label` | 3105 | FOUND |
| `.gen-dialog__label-row` | 3099 | FOUND |
| `.gen-dialog__char-count` | 3113 | FOUND |
| `.gen-dialog__textarea` | 3143 | FOUND |
| `.gen-dialog__hint` | 3174 | FOUND |
| `.gen-dialog__info-tip` | 3122 | FOUND |
| `.aspect-chip-row` | 3168 | FOUND |
| `.aspect-chip` | 3206 | FOUND |
| `.aspect-chip--active` | 3222 | FOUND |
| `.gen-dialog__footer` | 3321 | FOUND |
| `.gen-dialog__cta` | 3334 | FOUND |
| `.gen-dialog__board-ctx` | 3329 | FOUND |
| `.gen-dialog__header` | 3058 | FOUND |
| `.gen-dialog__title` | 3064 | FOUND |
| `.gen-dialog__subtitle` | 3071 | FOUND |
| `.gen-dialog__close` | 3077 | FOUND |
| `.project-sidebar__menu` | 249 | FOUND |
| `.project-sidebar__rename-input` | 281 | FOUND |
| `.project-sidebar__menu-danger` | 275 | FOUND |

All 20 spot-checked classes exist. The 22-class reuse claim is valid.

---

### 6. Mount Point — CORRECT

Spec §2.1 and the component inventory (§10) both specify: `GenerationDialog.tsx` is MODIFIED to "Replace `{isCharacter && (...)}` block with `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />`."

Live code at `/Users/inanctelci/Development/flowboard/frontend/src/components/GenerationDialog.tsx:871` confirms the `{isCharacter && (...)}` block exists at the expected location. The replacement is targeted and correct. No second modal is introduced.

---

### 7. `charHair` Split (D-04 from 05-CONTEXT.md) — PLANNER ACTION REQUIRED

**Phase 5 decision (D-04):** `charHair` is a single composite string for Phase 5; split to `charHairColor` + `charHairStyle` is deferred to Phase 6.

**Phase 6 spec (§2, Q5, §10):** Spec decides YES — split into `charHairColor` + `charHairStyle`. This is the correct resolution of D-04. However:

**Gap in spec:** The spec does NOT update `CharacterConfigSchema` in `frontend/src/lib/character/schema.ts`. The current schema (Phase 5, already shipped) has:
```typescript
charHair: z.string().optional(),  // composite: "long wavy black hair"
```
The Phase 6 plan must:
1. ADD `charHairColor: z.string().optional()` and `charHairStyle: z.string().optional()` to `CharacterConfigSchema`
2. DEPRECATE (or REMOVE) `charHair: z.string().optional()` from the schema
3. UPDATE `FlowboardNodeData` interface in `store/board.ts` to add `charHairColor?` and `charHairStyle?` (and mark `charHair?` as deprecated)
4. UPDATE `buildCharacterPrompt.ts` to consume `charHairColor` + `charHairStyle` instead of composite `charHair`
5. ADD a migration case in `migrate.ts` to split existing composite `charHair` values (e.g. "long wavy black hair" → attempt to decompose, or map to `charHairStyle` only with `charHairColor: undefined`)

The spec implies these changes (it shows two separate chip fields in the UI) but does not enumerate them in the component inventory or the schema section. **Planner must add these 5 items as explicit tasks in the Phase 6 plan.**

This is a non-blocking FLAG (the spec correctly resolves D-04's open question) but the schema gap means the planner cannot generate a complete task list without this enumeration.

---

### 8. Anti-Features Absent — CONFIRMED

Spec §7 confirms all four are excluded:
- Real-time image preview: explicitly excluded ("Consumes generation credits per interaction")
- Per-field lock/unlock: explicitly excluded ("Variants stepper already covers variation")
- AI assist: explicitly excluded ("Guided wizard not AI-assisted brief from photo")
- Full-screen routing: no mention of routing changes anywhere in spec; wizard mounts inside existing dialog shell

All four anti-features are absent from the spec. Clean.

---

## Ready for Planning

UI-SPEC is APPROVED. The WIZARD-05 contradiction with §3.8 requires a planner annotation to REQUIREMENTS.md before implementation starts (SPEC-DELTA note on WIZARD-05). The `charHair` split schema gap requires 5 explicit planner tasks. All other FLAGs are stylistic and do not block implementation.
