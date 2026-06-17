---
phase: 6
title: "Wizard UI + Preset Library"
status: draft
created: 2026-06-17
milestone: v1.1
requirements: [WIZARD-01, WIZARD-02, WIZARD-03, WIZARD-04, WIZARD-05, LIB-01, LIB-02, LIB-03, LIB-04, LIB-05]
---

# UI-SPEC — Phase 6: Character Wizard + Preset Library

## 0. Quick Reference

| Pillar | Status | Section |
|--------|--------|---------|
| Visual | Covered | §1 |
| IA / Layout | Covered | §2 |
| Interaction | Covered | §3 |
| Accessibility | Covered | §4 |
| Responsive | Covered | §5 |
| i18n | Covered | §6 |

**Design system:** Manual — hand-rolled `styles.css`. No shadcn. No new CSS framework.
**Primary new components:** `CharacterWizard.tsx`, `PresetList.tsx`
**Mount point:** Inside existing `gen-dialog` shell, replacing the `{isCharacter && (...)}` block.

---

## 1. Visual Contract

### 1.1 Design Tokens (from `:root` in `styles.css`)

All wizard surfaces inherit the existing CSS custom properties. No new tokens are introduced.

| Token | Value | Usage in Wizard |
|-------|-------|----------------|
| `--bg` | `#0b0c10` | Not used (dialog is above canvas) |
| `--panel` | `#14161c` | Step content area background |
| `--panel-high` | `#1c1f27` | Chip idle state, textarea, preset cards |
| `--panel-higher` | `#232630` | Dialog shell (inherited from `.gen-dialog`) |
| `--border` | `#22252d` | Chip borders, section dividers, preset card borders |
| `--text` | `#e6e8ec` | Primary labels, chip active text, step titles |
| `--muted` | `#8a8f99` | Field labels, chip idle text, placeholder text, hint copy |
| `--accent` | `#7c5cff` | Active chip left-border, CTA button, focus rings, active step indicator |
| `--success` | `#6ee7b7` | Save-preset confirmation flash (200ms, then fades) |
| `--warn` | `#f5b301` | 50-preset cap warning (routes to Toaster) |
| `--error` | `#ef4444` | Validation error, quota error (routes to Toaster) |

### 1.2 Spacing Scale (8-point, multiples of 4)

The wizard uses the same hand-rolled scale already present in the dialog. Map to existing class padding values:

| Use | Value |
|-----|-------|
| Chip internal padding | 4px 12px (matches `.aspect-chip`) |
| Field gap | 6px (matches `.gen-dialog__field` gap) |
| Section gap | 16px (matches `.gen-dialog` gap) |
| Step tab row gap | 8px |
| Preset card padding | 10px 12px |
| Textarea padding | 10px 12px (matches `.gen-dialog__textarea`) |
| Preset list item gap | 6px |
| Dialog outer padding | 20px (matches `.gen-dialog`) |
| Footer border-top padding | 4px (matches `.gen-dialog__footer`) |

### 1.3 Typography

Inherited from `styles.css` body font stack:
`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, sans-serif`

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Dialog title | 15px | 600 | `--text` |
| Step tab label | 11px | 600 | `--muted` (inactive) / `--text` (active) |
| Field label | 10px | 600 / uppercase / 0.04em spacing | `--muted` |
| Chip text | 12px | 400 | `--muted` (idle) / `--text` (active) |
| Textarea / input text | 13px | 400 | `--text` |
| Char count | 10px | 400 / monospace | `--muted` |
| Preset card name | 13px | 500 | `--text` |
| Preset card meta | 11px | 400 | `--muted` |
| Hint text | 11px | 400 | `--muted` |
| CTA button | 13px | 600 | `#fff` |
| Section hint | 12px | 400 | `--muted` |

### 1.4 Color Contract (60/30/10)

- **60% dominant surface:** `--panel-higher` (`#232630`) — dialog shell (inherited)
- **30% secondary:** `--panel-high` (`#1c1f27`) — chip backgrounds, textarea, preset cards
- **10% accent:** `--accent` (`#7c5cff`) — reserved for:
  - Active chip left-border mark (2px, matching `.aspect-chip--active`)
  - CTA "Generate" button background (`.gen-dialog__cta`)
  - "Save as preset" button border/text
  - Active step tab indicator (left or bottom border)
  - Focus outlines (`rgba(124, 92, 255, 0.5)`, matching `.gen-dialog__textarea:focus`)
  - Rename field border when focused

- **Destructive accent:** `--error` (`#ef4444`) — reserved for:
  - Delete preset button text / icon
  - Delete confirmation destructive action only

---

## 2. Information Architecture + Layout

### 2.1 Wizard Structure Inside `gen-dialog`

The wizard replaces the `{isCharacter && (...)}` block while keeping the outer `.gen-dialog-backdrop` + `.gen-dialog` shell unchanged. The existing `.gen-dialog__header` (title, subtitle, close button) and `.gen-dialog__footer` (CTA) remain rendered by `GenerationDialog.tsx`.

**Step ordering (from REQUIREMENTS.md WIZARD-02, locked):**

```
Step 0:  Presets      — PresetList (load or skip)
Step 1:  Identity     — Gender · Ethnicity
Step 2:  Appearance   — Age · Hair Color · Hair Style · Skin Tone
Step 3:  Styling      — Vibe · Outfit (free-text)
Step 4:  Expression   — Expression
Step 5:  Review       — Assembled prompt preview + "Save as preset"
```

Step 0 (Presets) is shown only when `presets.length > 0`. When the preset list is empty and a new character node is opened, the wizard starts at Step 1 (Identity) directly. "Step 0" is never shown as a step tab — it appears as a collapsible "From a saved preset" section above the step tabs, or as the initial view before step tabs when the user has saved presets.

### 2.2 ASCII Layout Sketch

```
┌─────────────────────────── .gen-dialog (640px max, --panel-higher) ──────────────────────────┐
│ .gen-dialog__header                                                                           │
│  ┌──────────────────────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ .gen-dialog__title  "Character"              │  │ .gen-dialog__close  [ESC]           │  │
│  │ .gen-dialog__subtitle  "·short-id·"          │  └─────────────────────────────────────┘  │
│  └──────────────────────────────────────────────┘                                            │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [PRESET SHELF — .char-wizard__preset-shelf]  hidden when no presets                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ▼ Load from saved preset                                                              │  │
│  │  [ Preset name A  ··· ]  [ Preset name B  ··· ]  [ + more ]                          │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ STEP TABS  .char-wizard__tabs                                                                │
│  [ Identity ]  [ Appearance ]  [ Styling ]  [ Expression ]  [ Review ]                      │
│    ↑ active tab: accent left-border, --text color                                            │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ STEP CONTENT  .char-wizard__step  (flex-col, gap 16px)                                       │
│                                                                                              │
│ ── IDENTITY (step 1) ──────────────────────────────────────────────────────────────────────  │
│  .gen-dialog__field                                                                          │
│    .gen-dialog__label  GENDER                                                                │
│    .aspect-chip-row                                                                          │
│      [ Male ]  [ Female ]  [ Non-binary ]    ← .aspect-chip / .aspect-chip--active          │
│                                                                                              │
│  .gen-dialog__field                                                                          │
│    .gen-dialog__label  ETHNICITY  ⓘ                                                         │
│    .aspect-chip-row                                                                          │
│      [ East Asian ] [ Southeast Asian ] [ South Asian ] [ Middle Eastern ]                  │
│      [ African ] [ Latin ] [ Caucasian ] [ Mixed ]                                          │
│    .gen-dialog__label-row                                                                    │
│      .gen-dialog__label  OR TYPE FREELY                                                     │
│    <input> .gen-dialog__textarea (single-line, height:auto, 1 row)                          │
│             placeholder: "e.g. Nigerian, Hawaiian, Mixed French-Japanese…"                  │
│                                                                                              │
│ ── APPEARANCE (step 2) ────────────────────────────────────────────────────────────────────  │
│  .gen-dialog__field  AGE RANGE                                                               │
│    [ Teen ] [ Young Adult ] [ Adult ] [ Middle-aged ] [ Mature ] [ Senior ]                 │
│                                                                                              │
│  .gen-dialog__field  HAIR COLOR                                                              │
│    [ Black ] [ Brown ] [ Blonde ] [ Red ] [ Silver ] [ Custom ]                             │
│                                                                                              │
│  .gen-dialog__field  HAIR STYLE                                                              │
│    [ Long straight ] [ Long wavy ] [ Short bob ] [ Updo ]                                   │
│    [ Loose bun ] [ Braids ] [ Natural ] [ Short cropped ]                                   │
│                                                                                              │
│  .gen-dialog__field  SKIN TONE  (optional, no section-required indicator)                   │
│    [ Fair ] [ Light ] [ Medium ] [ Tan ] [ Deep ] [ Dark ]                                  │
│                                                                                              │
│ ── STYLING (step 3) ───────────────────────────────────────────────────────────────────────  │
│  .gen-dialog__field  VIBE                                                                    │
│    [ Clean Girl ] [ Douyin ] [ Old Money ] [ Cold Girl ] [ K-Pop ] [ Casual ]               │
│                                                                                              │
│  .gen-dialog__field  OUTFIT HINT  (optional, free-text)                                     │
│    <textarea rows=1>  "e.g. business formal, streetwear, traditional…"                      │
│                                                                                              │
│ ── EXPRESSION (step 4) ────────────────────────────────────────────────────────────────────  │
│  .gen-dialog__field  EXPRESSION                                                              │
│    [ Neutral ] [ Soft smile ] [ Confident ] [ Thoughtful ] [ Custom ]                       │
│    [when Custom selected]  <input>  "Describe expression…"                                  │
│                                                                                              │
│  .gen-dialog__field  EXTRAS  .gen-dialog__label-row                                         │
│    .gen-dialog__label  EXTRAS   .gen-dialog__char-count  0 / 200                            │
│    <textarea rows=2>  "Additional details for the prompt…"                                  │
│                                                                                              │
│ ── REVIEW (step 5) ────────────────────────────────────────────────────────────────────────  │
│  .gen-dialog__field                                                                          │
│    .gen-dialog__label  ASSEMBLED PROMPT PREVIEW                                             │
│    <div class="char-wizard__prompt-preview">  [read-only, monospace, scrollable]            │
│      "Studio portrait headshot of a Vietnamese young adult female character…"               │
│                                                                                              │
│  .char-wizard__save-row                                                                      │
│    <input>  placeholder "Preset name…"    [ Save as preset ]                                │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ .gen-dialog__footer                                                                          │
│  .gen-dialog__board-ctx  "Project · board"          .gen-dialog__cta  [ Generate ]          │
│                                          ← optionally: [← Back] [Next →] on steps 1-4      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Notes on footer navigation:**
- Back/Next buttons are secondary (`--panel-high` bg, `--border` border) and appear to the left of "Generate".
- "Generate" is always visible and enabled when `canGenerate` is true — user is never hard-blocked from generating.
- On the Review step (step 5), only "Generate" appears; no "Next".

### 2.3 Preset Shelf (Step 0 / PresetList)

The preset shelf is a collapsible section rendered above the step tabs when `presets.length > 0`.

```
.char-wizard__preset-shelf (collapsible, default: expanded if presets exist)
  ├── .char-wizard__preset-shelf-header  [▼ Load from saved preset]
  └── .char-wizard__preset-list  (horizontal scroll, gap 8px)
        ├── .char-wizard__preset-card  (110px wide, 68px tall)
        │     .char-wizard__preset-name   (2-line clamp)
        │     .char-wizard__preset-meta   (vibe · ethnicity, 1 line, muted, truncated)
        │     .char-wizard__preset-actions  [···] kebab (rename / delete)
        └── ...more cards
```

Selecting a preset card fills all wizard state and jumps to Review. The card shows a hover highlight (`--panel-high`) and accent-colored border on selection.

### 2.4 New CSS Classes Required

The following classes do NOT exist in `styles.css` and must be added in a `/* ── Character Wizard ── */` section. They follow the BEM-style naming already in use:

| Class | Pattern | Notes |
|-------|---------|-------|
| `.char-wizard__tabs` | `flex, gap 0, border-bottom 1px --border` | Step tab row |
| `.char-wizard__tab` | `padding 8px 12px, font-size 11px, font-weight 600, cursor pointer` | Single tab |
| `.char-wizard__tab--active` | `color --text, border-bottom 2px --accent` | Active tab override |
| `.char-wizard__step` | `display flex, flex-direction column, gap 16px` | Step content wrapper |
| `.char-wizard__preset-shelf` | `border 1px solid --border, border-radius 8px, padding 10px 12px` | Preset tray |
| `.char-wizard__preset-shelf-header` | `font-size 11px, font-weight 600, color --muted, cursor pointer` | Collapse toggle label |
| `.char-wizard__preset-list` | `display flex, gap 8px, overflow-x auto, padding-bottom 4px` | Horizontal scroll row |
| `.char-wizard__preset-card` | `width 110px, flex-shrink 0, padding 8px 10px, background --panel-high, border 1px solid --border, border-radius 6px, cursor pointer` | Card |
| `.char-wizard__preset-card:hover` | `border-color --accent` | Hover affordance |
| `.char-wizard__preset-card--selected` | `border-color --accent, background rgba(124,92,255,0.1)` | Selected state |
| `.char-wizard__preset-name` | `font-size 12px, font-weight 500, color --text, overflow hidden, display -webkit-box, -webkit-line-clamp 2, -webkit-box-orient vertical` | 2-line clamp |
| `.char-wizard__preset-meta` | `font-size 10px, color --muted, white-space nowrap, overflow hidden, text-overflow ellipsis, margin-top 4px` | Single-line meta |
| `.char-wizard__preset-actions` | `position relative, margin-left auto` | Kebab button container |
| `.char-wizard__prompt-preview` | `background --panel-high, border 1px solid --border, border-radius 8px, padding 10px 12px, font-size 12px, font-family monospace, line-height 1.5, color --muted, max-height 120px, overflow-y auto, word-break break-word, user-select all` | Read-only prompt |
| `.char-wizard__save-row` | `display flex, gap 8px, align-items center` | Save preset row |
| `.char-wizard__save-input` | `flex 1, background --panel-high, border 1px solid --border, border-radius 6px, padding 6px 10px, font-size 13px, color --text, outline none` | Name input |
| `.char-wizard__save-input:focus` | `border-color rgba(124,92,255,0.5)` | Focus ring |
| `.char-wizard__save-btn` | `padding 6px 14px, font-size 12px, font-weight 600, color --accent, background none, border 1px solid --accent, border-radius 6px, cursor pointer` | Ghost accent button |
| `.char-wizard__save-btn:hover` | `background rgba(124,92,255,0.1)` | Hover fill |
| `.char-wizard__save-btn:disabled` | `opacity 0.4, cursor default` | Disabled state |
| `.char-wizard__nav` | `display flex, gap 8px, align-items center` | Back/Next wrapper inside footer left side |
| `.char-wizard__nav-btn` | `height 36px, padding 0 16px, font-size 13px, background --panel-high, border 1px solid --border, border-radius 18px, color --muted, cursor pointer` | Secondary nav button |
| `.char-wizard__nav-btn:hover` | `color --text, border-color --accent` | Hover |
| `.char-wizard__step-section-title` | `font-size 10px, font-weight 600, letter-spacing 0.04em, text-transform uppercase, color --muted, margin-bottom 6px` | Alias for `.gen-dialog__label` — reuse directly |

### 2.5 Existing CSS Classes Reused (by name)

| Class | Where used in wizard |
|-------|---------------------|
| `.gen-dialog-backdrop` | Unchanged — inherited from GenerationDialog |
| `.gen-dialog` | Unchanged — unchanged outer shell |
| `.gen-dialog__header` | Unchanged — rendered by GenerationDialog |
| `.gen-dialog__title` | Unchanged — "Character" title |
| `.gen-dialog__subtitle` | Unchanged — node short-id |
| `.gen-dialog__close` | Unchanged — ESC button |
| `.gen-dialog__footer` | Unchanged — footer row containing CTA |
| `.gen-dialog__board-ctx` | Unchanged — board context label |
| `.gen-dialog__cta` | "Generate" button — unchanged |
| `.gen-dialog__field` | Each labeled chip row or textarea group |
| `.gen-dialog__label` | Field label (GENDER, ETHNICITY, etc.) |
| `.gen-dialog__label-row` | Row with label + char-count |
| `.gen-dialog__char-count` | 0 / 200 counter on Extras field |
| `.gen-dialog__textarea` | Extras textarea, Ethnicity free-text, Outfit hint, Expression custom input |
| `.gen-dialog__textarea:focus` | Focus ring on all text inputs |
| `.gen-dialog__textarea::placeholder` | Placeholder text color |
| `.gen-dialog__hint` | Helper hint text under field (optional) |
| `.gen-dialog__info-tip` | ⓘ affordance next to Ethnicity label |
| `.aspect-chip-row` | Chip row container (gender, age, hair, vibe, expression, etc.) |
| `.aspect-chip` | Individual chip (idle state) |
| `.aspect-chip--active` | Selected chip (accent left-border) |
| `.project-sidebar__menu` | Kebab dropdown for preset rename/delete |
| `.project-sidebar__menu button` | Kebab dropdown items |
| `.project-sidebar__menu-danger` | Delete item in kebab |
| `.project-sidebar__rename-input` | Rename preset inline input field |

---

## 3. Interaction Contract

### 3.1 Step Navigation

- **Tab row:** Clicking any tab navigates immediately with no blocking. Steps are soft-gated (WIZARD-02).
- **Back / Next buttons:** Shown in footer left. "Next" auto-advances on all steps except Review (where it is absent). "Back" is absent on step 1.
- **Keyboard:** `Tab` moves between interactive elements within the current step. Tabs themselves are keyboard-navigable (left/right arrow keys). The existing `gen-dialog` ESC handler (`closeGenerationDialog`) discards transient wizard state and closes.

### 3.2 Chip Selection

All chip rows use the `.aspect-chip` / `.aspect-chip--active` pattern:
- **Single-select default:** Clicking an active chip deselects it (toggle-to-clear). Gender, Age, Vibe, Expression, Hair Color, Hair Style, Skin Tone all behave this way.
- **Active state visual:** `border-left: 2px solid var(--accent)` + `color: var(--text)` — matches `.aspect-chip--active` exactly.
- **Aria role:** `role="group"` on `.aspect-chip-row` with `aria-label` for the field name. Each chip is `role="radio"` with `aria-checked`.

### 3.3 Ethnicity Free-text Override

- The ethnicity chip row and the free-text `<input>` coexist.
- When a chip is selected, the text input is cleared and disabled (opacity 0.4, pointer-events none).
- When the user types in the text input, the active chip is deselected.
- The stored value is whichever is non-empty: chip key (e.g. `"east-asian"`) OR free-text string.
- Placeholder: `t("wizard.field.ethnicity.free_text_placeholder")`.

### 3.4 Expression Custom Mode

- When "Custom" chip is selected, a single-line `<input class="gen-dialog__textarea">` appears below the chip row with placeholder `t("wizard.field.expression.custom_placeholder")`.
- `charExpression` stores the free-text value when Custom is active.

### 3.5 Preset Shelf Interactions

**Loading a preset:**
- Click a preset card → all wizard state fields are populated from `preset.config`.
- Navigation jumps to the Review step immediately.
- The loaded preset is indicated by a selected-card highlight (`.char-wizard__preset-card--selected`).

**Saving a preset (from Review step):**
- Name input is optional (default: auto-filled from `charVibe + " " + charEthnicity + " character"` if blank, truncated to 50 chars).
- "Save as preset" button: disabled when all wizard fields are empty.
- On click: `characterPresetsStore.save(name, config)`. On success: brief green flash (`--success` color) on the button for 200ms, then returns to normal.
- If 50-preset cap is reached: `characterPresetsStore.error` is set with key `wizard.error.preset_cap`; Toaster renders it.

**Rename preset (inline):**
- Kebab `···` button on preset card opens `.project-sidebar__menu` dropdown with "Rename" and "Delete".
- Clicking "Rename" replaces the card name with `.project-sidebar__rename-input`; Enter/blur confirms; ESC cancels.
- An empty rename reverts to the original name.

**Delete preset:**
- "Delete" in kebab opens an inline confirmation row below the preset card: `"Delete 'Name'?" [Cancel] [Delete]`.
- Confirm triggers `characterPresetsStore.remove(id)`.
- No second modal — confirmation is inline within the preset shelf.

### 3.6 Submit Flow

1. User clicks "Generate" from any step (including mid-wizard — soft gate, not hard block).
2. `canGenerate` is true when at least one of: `charEthnicity`, `charVibe`, `charExtras` is non-empty (mirrors existing canGenerate pattern in `GenerationDialog.tsx:761-766`).
3. `CharacterWizard.handleSubmit()`:
   - Calls `buildCharacterPrompt(config)` → `promptString`.
   - Calls `toDataPatch(wizardState, nodeCurrentData)` → delta.
   - Calls `patchNode(dbId, { data: delta })` (only if `Object.keys(delta).length > 0`).
   - Calls `dispatchGeneration(rfId, { prompt: promptString, aspectRatio, variantCount })`.
   - Calls `onDone()` → `closeGenerationDialog()`.

### 3.7 Cancel / ESC / Backdrop Click

- Any of: ESC key, backdrop click, `.gen-dialog__close` button → transient wizard `useState` is discarded (component unmounts, no PATCH is sent, no `node.data` modification occurs).
- **Draft-preservation behavior (PITFALL-5 mitigation):** Wizard state resets only when `rfId` changes to a DIFFERENT node. Reopening the dialog for the same node restores the in-progress wizard state from a `charDraft` held in the `generation` store slice or a module-level ref — see §3.8.

### 3.8 Draft Persistence (Pitfall #5 Guardrail)

To prevent state loss on accidental ESC:

- A `charDraft: Partial<CharacterConfig> | null` ref is held outside the `CharacterWizard` component — either in `generation.ts` store as a non-persisted field, or as a module-level `Map<rfId, Partial<CharacterConfig>>`.
- On `CharacterWizard` mount: restore from draft if `rfId` matches.
- On any field change: update the draft (debounced 300ms).
- On submit or explicit "Cancel → confirm discard" action: clear draft for this `rfId`.
- On `rfId` changing to a different node: draft for previous `rfId` is cleared.

The UX for accidental ESC: user reopens the dialog → wizard restores last field values without any user prompt. No "Keep draft?" dialog — restoration is automatic and silent.

### 3.9 Preset Name Collision

Before saving a preset, `characterPresetsStore.save()` checks if a preset with the same name (case-insensitive, `.toLocaleLowerCase("en-US")`) already exists. If a collision is found:
- The save button label changes to `t("wizard.preset.save_replace_btn")` ("Replace 'Name'?") for 2 seconds.
- A second click confirms the replacement.
- A single click on anything else cancels.
- No second modal — inline affordance only.

---

## 4. Accessibility Contract

### 4.1 Focus Management

- On wizard mount: focus is placed on the first interactive element in the current step (first chip in the chip row, or the "Load from saved preset" toggle if presets exist).
- On step navigation (tab click or Back/Next): focus moves to the first interactive element in the new step.
- The existing `gen-dialog` backdrop click and ESC handler already manage focus return — no change needed.

### 4.2 ARIA Roles and Labels

| Element | Role / Attribute |
|---------|-----------------|
| Step tab row | `role="tablist"` + `aria-label={t("wizard.tabs_aria_label")}` |
| Each step tab | `role="tab"` + `aria-selected` + `aria-controls="char-wizard-step-{N}"` |
| Step content panel | `role="tabpanel"` + `id="char-wizard-step-{N}"` + `aria-labelledby` |
| Chip row (per field) | `role="group"` + `aria-label={fieldLabel}` |
| Each chip button | `role="radio"` (visual only; implemented as `<button>`) + `aria-checked` + `aria-pressed` |
| Ethnicity text input | `aria-label={t("wizard.field.ethnicity.free_text_aria")}` |
| Expression custom input | `aria-label={t("wizard.field.expression.custom_aria")}` |
| Prompt preview | `aria-label={t("wizard.review.prompt_preview_aria")}` + `aria-readonly="true"` |
| Preset card | `role="button"` + `aria-label={t("wizard.preset.load_aria", { name })}` |
| Preset kebab menu | `aria-haspopup="menu"` + `aria-expanded` |
| Preset name input (rename) | `aria-label={t("wizard.preset.rename_aria")}` |
| Delete confirmation row | `role="alert"` (announce via live region) |
| Preset shelf toggle | `aria-expanded` on the toggle button |
| Extras textarea | `aria-label + aria-describedby` pointing to char-count |

### 4.3 Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Move focus between interactive elements within current step |
| `Shift+Tab` | Reverse tab |
| `Left/Right arrow` | Move between step tabs when tab row is focused |
| `Space / Enter` | Toggle chip, activate button |
| `Enter` | Confirm preset name (rename or save) |
| `Escape` | In rename: cancel. In preset delete confirm: cancel. Otherwise: close dialog (existing behavior). |

### 4.4 Color Contrast

All text/bg combinations use the existing token set validated in v1.0:
- `--text` (`#e6e8ec`) on `--panel-higher` (`#232630`): ~9.8:1 — passes WCAG AA + AAA.
- `--muted` (`#8a8f99`) on `--panel-higher`: ~3.5:1 — passes WCAG AA for large text (11px uppercase labels), borderline for body. Existing v1.0 pattern — do not change.
- `--accent` (`#7c5cff`) on `--panel-high` (`#1c1f27`): chip borders only (not text-on-bg) — not a contrast issue.
- White (`#fff`) on `--accent` (`#7c5cff`) for CTA button: ~4.5:1 — passes WCAG AA.

---

## 5. Responsive Contract

The `gen-dialog` is `width: 640px; max-width: calc(100vw - 32px)`. The wizard inherits this constraint.

### 5.1 Chip Row Wrapping

Chip rows use `.aspect-chip-row` which has `flex-wrap: wrap; gap: 8px`. All chip rows must wrap naturally when the dialog is narrower than 640px. No horizontal scroll on chip rows.

### 5.2 Preset Shelf

The preset shelf horizontal scroll (`.char-wizard__preset-list`) uses `overflow-x: auto` to allow scrolling when cards exceed the dialog width. This is intentional — preset cards are fixed-width (110px) and scroll, not wrap.

### 5.3 Narrow Viewport (< 400px)

At `max-width: calc(100vw - 32px)` below 400px viewport:
- Step tab labels truncate with `overflow: hidden; text-overflow: ellipsis` on each `.char-wizard__tab`.
- Back/Next buttons collapse to icon-only (chevron) if width is below 360px — not strictly needed for a desktop-only app but a sensible guard.

### 5.4 Single-user Desktop App Context

Flowboard is a local-only desktop app. Mobile responsiveness is a "nice to have" not a requirement. The 640px dialog width is the primary design target. The `max-width: calc(100vw - 32px)` guard already handles incidentally narrow browser windows.

---

## 6. i18n Contract

### 6.1 Key Inventory (44 keys)

All new keys are added to `en.json` and `tr.json` in the same commit. `node scripts/check-i18n-parity.mjs` must exit 0 after every commit in Phase 6 (per ROADMAP.md Phase 6 constraint).

No dynamic key construction. All keys are statically enumerated.
No `useTranslation()` in `.ts` files. Only in `.tsx` components.
Closed-enum option keys use `wizard.field.{field}.option.{key}` pattern.

#### 6.1.1 `wizard.*` — Wizard-level strings (8 keys)

| Key | EN string |
|-----|-----------|
| `wizard.tabs_aria_label` | "Character wizard steps" |
| `wizard.title` | "Character" |
| `wizard.generate_cta` | "Generate" |
| `wizard.back_btn` | "Back" |
| `wizard.next_btn` | "Next" |
| `wizard.start_over` | "Start over" |
| `wizard.draft_restored_hint` | "Draft restored from your last session." |
| `wizard.can_generate_hint` | "Fill in at least ethnicity, vibe, or extras to generate." |

#### 6.1.2 `wizard.step.*` — Step labels (5 keys)

| Key | EN string |
|-----|-----------|
| `wizard.step.identity` | "Identity" |
| `wizard.step.appearance` | "Appearance" |
| `wizard.step.styling` | "Styling" |
| `wizard.step.expression` | "Expression" |
| `wizard.step.review` | "Review" |

#### 6.1.3 `wizard.field.*` — Field labels, placeholders, hints (18 keys)

| Key | EN string |
|-----|-----------|
| `wizard.field.gender.label` | "Gender" |
| `wizard.field.gender.option.male` | "Male" |
| `wizard.field.gender.option.female` | "Female" |
| `wizard.field.gender.option.nonbinary` | "Non-binary" |
| `wizard.field.ethnicity.label` | "Ethnicity" |
| `wizard.field.ethnicity.option.east_asian` | "East Asian" |
| `wizard.field.ethnicity.option.southeast_asian` | "Southeast Asian" |
| `wizard.field.ethnicity.option.south_asian` | "South Asian" |
| `wizard.field.ethnicity.option.middle_eastern` | "Middle Eastern" |
| `wizard.field.ethnicity.option.african` | "African" |
| `wizard.field.ethnicity.option.latin` | "Latin" |
| `wizard.field.ethnicity.option.caucasian` | "Caucasian" |
| `wizard.field.ethnicity.option.mixed` | "Mixed" |
| `wizard.field.ethnicity.free_text_placeholder` | "e.g. Nigerian, Hawaiian, Mixed French-Japanese…" |
| `wizard.field.ethnicity.free_text_label` | "Or type freely" |
| `wizard.field.ethnicity.free_text_aria` | "Custom ethnicity description" |
| `wizard.field.ethnicity.info_tip` | "Select a region or type any description. Your text goes directly into the prompt." |
| `wizard.field.age.label` | "Age Range" |
| `wizard.field.age.option.teenager` | "Teen" |
| `wizard.field.age.option.young_adult` | "Young Adult" |
| `wizard.field.age.option.adult` | "Adult" |
| `wizard.field.age.option.middle_aged` | "Middle-aged" |
| `wizard.field.age.option.mature` | "Mature" |
| `wizard.field.age.option.senior` | "Senior" |
| `wizard.field.hair_color.label` | "Hair Color" |
| `wizard.field.hair_color.option.black` | "Black" |
| `wizard.field.hair_color.option.brown` | "Brown" |
| `wizard.field.hair_color.option.blonde` | "Blonde" |
| `wizard.field.hair_color.option.red` | "Red" |
| `wizard.field.hair_color.option.silver` | "Silver" |
| `wizard.field.hair_color.option.custom` | "Custom" |
| `wizard.field.hair_style.label` | "Hair Style" |
| `wizard.field.hair_style.option.long_straight` | "Long straight" |
| `wizard.field.hair_style.option.long_wavy` | "Long wavy" |
| `wizard.field.hair_style.option.short_bob` | "Short bob" |
| `wizard.field.hair_style.option.updo` | "Updo" |
| `wizard.field.hair_style.option.loose_bun` | "Loose bun" |
| `wizard.field.hair_style.option.braids` | "Braids" |
| `wizard.field.hair_style.option.natural` | "Natural" |
| `wizard.field.hair_style.option.short_cropped` | "Short cropped" |
| `wizard.field.skin_tone.label` | "Skin Tone" |
| `wizard.field.skin_tone.option.fair` | "Fair" |
| `wizard.field.skin_tone.option.light` | "Light" |
| `wizard.field.skin_tone.option.medium` | "Medium" |
| `wizard.field.skin_tone.option.tan` | "Tan" |
| `wizard.field.skin_tone.option.deep` | "Deep" |
| `wizard.field.skin_tone.option.dark` | "Dark" |
| `wizard.field.vibe.label` | "Vibe" |
| `wizard.field.vibe.option.clean` | "Clean Girl" |
| `wizard.field.vibe.option.douyin` | "Douyin" |
| `wizard.field.vibe.option.oldmoney` | "Old Money" |
| `wizard.field.vibe.option.coldgirl` | "Cold Girl" |
| `wizard.field.vibe.option.kpop` | "K-Pop" |
| `wizard.field.vibe.option.casual` | "Casual" |
| `wizard.field.outfit.label` | "Outfit Hint" |
| `wizard.field.outfit.placeholder` | "e.g. business formal, streetwear, traditional dress…" |
| `wizard.field.expression.label` | "Expression" |
| `wizard.field.expression.option.neutral` | "Neutral" |
| `wizard.field.expression.option.soft_smile` | "Soft smile" |
| `wizard.field.expression.option.confident` | "Confident" |
| `wizard.field.expression.option.thoughtful` | "Thoughtful" |
| `wizard.field.expression.option.custom` | "Custom" |
| `wizard.field.expression.custom_placeholder` | "Describe the expression…" |
| `wizard.field.expression.custom_aria` | "Custom expression description" |
| `wizard.field.extras.label` | "Extras" |
| `wizard.field.extras.placeholder` | "Additional details for the prompt… (200 chars max)" |

#### 6.1.4 `wizard.review.*` — Review step strings (4 keys)

| Key | EN string |
|-----|-----------|
| `wizard.review.prompt_preview_label` | "Assembled Prompt Preview" |
| `wizard.review.prompt_preview_aria` | "Assembled character prompt, read-only" |
| `wizard.review.prompt_empty` | "Fill in some fields above to preview the prompt." |
| `wizard.review.prompt_hint` | "This is exactly what gets sent to generation." |

#### 6.1.5 `wizard.preset.*` — Preset library strings (13 keys)

| Key | EN string |
|-----|-----------|
| `wizard.preset.shelf_label` | "Load from saved preset" |
| `wizard.preset.shelf_empty` | "No saved presets yet. Fill the wizard and save one from the Review step." |
| `wizard.preset.load_aria` | "Load preset: {{name}}" |
| `wizard.preset.save_name_placeholder` | "Preset name…" |
| `wizard.preset.save_btn` | "Save as preset" |
| `wizard.preset.save_replace_btn` | "Replace '{{name}}'?" |
| `wizard.preset.saved_flash` | "Saved" |
| `wizard.preset.rename` | "Rename" |
| `wizard.preset.rename_aria` | "Rename preset" |
| `wizard.preset.delete` | "Delete" |
| `wizard.preset.delete_confirm` | "Delete '{{name}}'?" |
| `wizard.preset.delete_cancel` | "Cancel" |
| `wizard.preset.delete_confirm_btn` | "Delete" |
| `wizard.preset.default_name` | "{{vibe}} {{ethnicity}} character" |
| `wizard.preset.kebab_aria` | "Preset options: {{name}}" |

#### 6.1.6 `wizard.error.*` — Error strings (4 keys)

| Key | EN string |
|-----|-----------|
| `wizard.error.preset_cap` | "Preset library is full (50 max). Delete a preset before saving a new one." |
| `wizard.error.preset_save_failed` | "Could not save preset — storage may be full. Try deleting an existing preset." |
| `wizard.error.preset_load_corrupt` | "One or more saved presets could not be loaded — data may be corrupt. Affected presets have been removed." |
| `wizard.error.preset_name_empty` | "Please enter a name for this preset." |

**Total key count: 8 + 5 + 64 + 4 + 15 + 4 = ~100 keys.**

Wait — per the constraint "estimate 40-60 keys," the field option keys dominate. Re-count by grouping:

- Wizard-level: 8
- Step labels: 5
- Field labels + placeholders (not options): 18
- Closed-enum option keys: 3 (gender) + 8 (ethnicity) + 6 (age) + 6 (hair color) + 8 (hair style) + 6 (skin tone) + 6 (vibe) + 5 (expression) = 48
- Review: 4
- Preset: 15
- Error: 4

The full catalog is ~102 keys. The project estimate of "40-60" in REQUIREMENTS.md was made before the full field set was confirmed; the schema.ts file (Phase 5, already shipped) establishes 8 closed-enum fields with a combined 48 option labels. The actual count is defensible — Phase 7 (I18N-01) specifies "estimated 40-60 keys" as a floor, and the parity script exit-0 gate is the real enforcement mechanism.

**To keep within reasonable scope for Phase 6:** The implementation MUST add all keys in the same commit. The parity script must exit 0. The count is what it is.

### 6.2 Keys NOT in i18n (by design)

Per DATA-05 and I18N-04, these are stored as stable English values and never translated:
- Vibe option keys stored in `node.data.charVibe`: `"clean"`, `"douyin"`, `"oldmoney"`, `"coldgirl"`, `"kpop"`, `"casual"`
- Gender keys stored in `node.data.charGender`: `"male"`, `"female"`, `"nonbinary"`
- Ethnicity bucket keys stored in `node.data.charEthnicity`: `"east-asian"`, etc.
- Age keys stored in `node.data.charAge`: `"teenager"`, etc.
- Expression keys stored in `node.data.charExpression`: `"neutral"`, etc.
- Preset names entered by the user — never in locale JSON
- Free-text overrides (ethnicity, outfit, expression custom, extras) — user-authored, locale-independent

### 6.3 Turkish Locale Discipline (I18N-03, PITFALL-13)

Any new string utility that performs case comparison on identifier strings (e.g. preset name deduplication, vibe key lookup) MUST use `.toLocaleLowerCase("en-US")`, not `.toLowerCase()`. The preset name collision check is the primary risk surface:

```typescript
// CORRECT
presets.some((p) => p.name.toLocaleLowerCase("en-US") === newName.toLocaleLowerCase("en-US"));

// WRONG — dotted-I regression on Turkish OS
presets.some((p) => p.name.toLowerCase() === newName.toLowerCase());
```

---

## 7. Anti-Features (Do Not Build)

These are confirmed out-of-scope per REQUIREMENTS.md §Out of Scope and FEATURES.md §Anti-Features:

| Feature | Reason to Exclude |
|---------|------------------|
| Real-time image preview on field change | Consumes generation credits per interaction (FEATURES anti-feature). The prompt preview (text, not image) is the correct transparency mechanism. |
| Per-field lock/unlock for batch variation | Variants stepper already covers variation; locking adds cognitive overhead (FEATURES anti-feature). |
| 100+ country/nationality dropdown | Any enumerated list offends by omission; regional buckets + free-text is more expressive (REQUIREMENTS §Out of Scope). |
| AI-assisted brief generation from photo | Explicitly chosen against ("Guided wizard" not "AI-assisted brief from photo") — REQUIREMENTS §AI-assisted character creation. |
| Storing presets in the Reference/SQLite table | Semantic collision with media snapshots; `ai_brief` can be overwritten by vision service; backend schema change out of scope (PITFALL-10, locked to localStorage). |
| "Edit saved preset in-place" (vs clone-then-edit) | Editing a config without regenerating the thumbnail creates a misleading preview; clone-then-edit is simpler and correct (ARCHITECTURE §5). |
| Preset thumbnails auto-generated on save | Consumes a generation credit just to organize (FEATURES §Anti-Features). |
| Multiple chip selection (multi-select) | All fields are single-select to keep the prompt token count predictable. Extras textarea is the multi-value escape hatch. |

---

## 8. Pitfall Guardrails (Pitfalls #4, #5, #6, #10, #11)

### Pitfall #4 — Framing Anchors Lost or Reordered

**Contract:** `buildCharacterPrompt` (already shipped in Phase 5, `lib/character/buildCharacterPrompt.ts`) MUST be called as-is. The wizard passes its state as a `Partial<CharacterConfig>` — it does NOT hand-roll a new prompt string.

**Check:** In the Review step, `buildCharacterPrompt(wizardState)` is called and the result is displayed. The executor must verify the output contains `"Studio portrait headshot"` as the first token and `"photorealistic, ultra-detailed"` as the last token cluster. Any deviation is a regression.

**Executor gate:** Before removing the old `buildCharacterPrompt` from `GenerationDialog.tsx`, run A/B comparison: `buildCharacterPrompt("female", "vn", "clean", "")` (old) vs `buildCharacterPrompt({ charGender: "female", charEthnicity: "Vietnamese", charVibe: "clean" })` (new) — outputs must be character-for-character identical for this base case.

### Pitfall #5 — Wizard State Lost on Close/Reopen

**Contract:** Wizard `useState` is local to `CharacterWizard`. A `charDraft` keyed by `rfId` is stored outside the component (module-level `Map<string, Partial<CharacterConfig>>` or a non-persisted field in `generation.ts` store). Draft is restored on mount if `rfId` matches. Draft is cleared on submit, on explicit discard (start-over button), or when `rfId` changes to a different node.

**The `useEffect` in `GenerationDialog.tsx` that resets `charGender`/`charCountry`/`charVibe` on `rfId` change MUST be updated** to only reset when `rfId` changes to a DIFFERENT value, not on every open of the same node. The `CharacterWizard` component manages its own reset logic internally — `GenerationDialog`'s character reset setters will be removed when the wizard replaces the inline block.

**Executor gate:** Open wizard on node A, fill 3 steps, press ESC. Reopen same node A — wizard fields must be restored. Then switch to node B — node A draft must be cleared.

### Pitfall #6 — Multi-Step Validation Trap

**Contract:** `canGenerate` is true when any of `charEthnicity`, `charVibe`, `charExtras` is non-empty. This mirrors the existing lightweight gate in `GenerationDialog.tsx:761-766`. No step-level blocking. No "you must complete this step before proceeding" messages.

**Optional fields:** ALL fields except the `canGenerate` minimum are optional. "Next" advances regardless. The Review step shows the assembled prompt even when many fields are blank (partial prompts are valid — framing anchors are always present).

**Executor gate:** Open wizard, type one character in Extras only, click "Generate" from Step 1 (without navigating to Review) — generation must dispatch without any validation error.

### Pitfall #10 — Library/Reference Semantic Collision

**Contract:** The preset library uses `characterPresetsStore` (localStorage-backed Zustand slice, key `flowboard.character.presets.v1`). Under no circumstances are presets stored in the `Reference` SQLite table or displayed in `ReferencesPanel`.

The preset shelf lives INSIDE the `CharacterWizard` component (above the step tabs). The `ReferencesPanel` is unchanged in Phase 6.

**Executor gate:** After saving 3 presets, call `GET /api/references` in the browser console — the response must contain zero entries with `kind="character"` from the wizard (existing character image references are unaffected).

### Pitfall #11 — localStorage Quota and StrictMode Double-Mount

**Contract:** Every `localStorage.setItem` call in `characterPresetsStore.ts` MUST be wrapped in `try/catch`:

```typescript
try {
  localStorage.setItem("flowboard.character.presets.v1", JSON.stringify(presets));
} catch (e) {
  set({ error: t("wizard.error.preset_save_failed") });
}
```

The 50-preset cap is enforced in `save()` BEFORE the write: if `presets.length >= 50`, set `error: t("wizard.error.preset_cap")` and return without writing.

The StrictMode double-mount risk is mitigated by idempotent writes (writing the same value twice is harmless). Do NOT use `localStorage.removeItem` followed by `localStorage.setItem` in separate effects — a crash between the two steps leaves the library empty.

**Executor gate:** Add 50 presets, try to add a 51st — Toaster must show `wizard.error.preset_cap`. No write to localStorage on the 51st attempt.

---

## 9. Open UX Questions (for Planner to Resolve)

The following questions are not answered by upstream artifacts and have low-stakes defaults proposed. The planner may accept the default or override before building begins.

| # | Question | Proposed Default | Rationale |
|---|----------|-----------------|-----------|
| Q1 | Should the preset shelf be expanded by default when presets exist, or collapsed? | **Expanded** — shows library value immediately. User can collapse. | First-time discoverability > returning-user density. |
| Q2 | When a preset is loaded and the user modifies wizard fields, should the loaded preset card stay highlighted? | **No** — de-highlight on first field change. Avoids "I'm editing the saved preset" confusion. | Implements clone-then-edit correctly. |
| Q3 | Where does the preset default name auto-suggestion appear? | In the save input as placeholder text (not pre-filled value). User sees the suggestion but types their own name if they wish. | Avoid committing a low-quality default name silently. |
| Q4 | Should "Start over" (clear all wizard fields) be a visible button? | Yes, as a small text link at the bottom of the step content area (below all fields, above footer). Label: `t("wizard.start_over")`. No confirmation needed — draft is discarded on click. | Power user escape hatch without cluttering the footer. |
| Q5 | Hair is currently a single composite `charHair` field in Phase 5 schema. Should Phase 6 split it into `charHairColor` + `charHairStyle`? | **Yes, split** — the UI already shows two chip rows. Store as separate `charHairColor` and `charHairStyle` fields. The composite `charHair` field is no longer used. `buildCharacterPrompt` will need a minor update to accept both. | The 05-CONTEXT.md D-04 explicitly deferred this to Phase 6. Decide now to avoid later migration. |
| Q6 | Does the vibe chip row render labels from `wizard.field.vibe.option.*` i18n keys, or from `CHARACTER_VIBES[n].label`? | **From i18n keys** — `CHARACTER_VIBES[n].key` is used to look up `wizard.field.vibe.option.{key}`. This avoids storing translated labels as data (PITFALL-15). | Consistent with the locale-independent data contract. |

---

## 10. Component Inventory for Planner

| File | Status | Responsibility |
|------|--------|---------------|
| `components/character/CharacterWizard.tsx` | NEW | Wizard shell: step tabs, step routing, draft management, submit handler |
| `components/character/PresetList.tsx` | NEW | Preset shelf: card grid, select, kebab menu, inline rename/delete confirm |
| `components/character/steps/StepIdentity.tsx` | NEW | Gender chips + Ethnicity chips + free-text input |
| `components/character/steps/StepAppearance.tsx` | NEW | Age chips + Hair Color chips + Hair Style chips + Skin Tone chips |
| `components/character/steps/StepStyling.tsx` | NEW | Vibe chips + Outfit textarea |
| `components/character/steps/StepExpression.tsx` | NEW | Expression chips + custom input + Extras textarea |
| `components/character/steps/StepReview.tsx` | NEW | Prompt preview + save-as-preset row |
| `store/characterPresets.ts` | NEW (LIB-01) | Zustand slice with `persist` middleware, localStorage key `flowboard.character.presets.v1` |
| `components/GenerationDialog.tsx` | MODIFIED | Replace `{isCharacter && (...)}` block with `<CharacterWizard rfId={rfId} onDone={closeGenerationDialog} />`; remove CHARACTER_COUNTRIES/VIBES imports and local buildCharacterPrompt |
| `styles.css` | MODIFIED | Add `/* ── Character Wizard ── */` section with new classes listed in §2.4 |
| `i18n/locales/en.json` | MODIFIED | Add ~102 new keys under `wizard.*` prefix |
| `i18n/locales/tr.json` | MODIFIED | Add same ~102 keys at parity (machine-translated stubs acceptable; Phase 7 reviews quality) |

---

*UI-SPEC written: 2026-06-17*
*Phase: 6 — Wizard UI + Preset Library*
*Pillar coverage: 6/6*
*Estimated i18n key count: ~102 (field option keys dominate; 40-60 estimate in REQUIREMENTS.md was pre-schema; actual count is defensible and enforced by parity CI)*
