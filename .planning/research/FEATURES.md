# Feature Research

**Domain:** Guided character-creation wizard + saveable character preset library for AI image generation (Google Flow / GEM_PIX_2)
**Researched:** 2026-06-16
**Confidence:** HIGH

---

## Context: What Exists and What Is Changing

The current system in `frontend/src/constants/character.ts` is a frozen 3-axis preset picker:
- 2 genders (hardcoded Vietnamese labels: "Nam" / "Nữ")
- 7 nationalities (hardcoded Vietnamese labels, Asian-centric)
- 6 vibe presets (baked prompt token arrays: Clean Girl, Douyin, Old Money, Cold Girl, K-Pop, Casual)

Dispatch in `GenerationDialog.tsx` calls `buildCharacterPrompt(gender, country, vibe, extras)` which splices tokens together in a fixed order, front-loading the framing anchor ("Studio portrait headshot of a [country] [gender] character, subject directly faces camera…") before vibe tokens. The framing is correct and must be preserved.

The replacement must produce the same or better prompt token quality while exposing a richer, user-authored field set instead of frozen presets.

---

## Field Category Analysis

### What AI image generation tools use for character portrait prompts

Research across OpenArt Character Builder (4-step: Vibe → Gender → Ethnicity → Age), Midjourney `--cref` workflows, ComfyUI character LoRA nodes, Leonardo AI character consistency docs, Higgsfield Soul ID, and Stable Diffusion WebUI style presets reveals a consistent set of "layer groups" that expert users think in:

| Layer Group | What It Controls | Token Weight Priority |
|-------------|------------------|-----------------------|
| Identity / Origin | Ethnicity, nationality cue | HIGH — front of prompt, diffusion models weight early tokens more |
| Gender | Male / Female / Non-binary | HIGH — subject descriptor |
| Age | Age range (teenager / 20s / 30s / 40s / 50s+) | HIGH — changes face structure |
| Face / Skin | Skin tone, face shape | MEDIUM — often inherited from ethnicity cue |
| Hair | Color + style (length, texture, arrangement) | MEDIUM — visually prominent |
| Outfit / Styling | Clothing category, material, color | MEDIUM — can override vibe |
| Makeup / Grooming | Makeup level, specific looks | MEDIUM — existing vibe tokens already encode this |
| Expression | Emotion, gaze direction | MEDIUM — affects downstream usability as character ref |
| Lighting | Studio type, natural light | MEDIUM — affects mood and downstream compositing |
| Environment / Backdrop | Background color, setting | LOW — for character refs, backdrop should stay clean/neutral |
| Framing / Camera | Shot framing, lens, angle | MUST preserve — front-facing anchors are the key invariant |

The existing `buildCharacterPrompt` already front-loads framing anchors correctly. The new wizard must keep this behavior: framing anchors are NOT user-configurable fields, they are appended automatically at dispatch.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any "guided character creation" replacement must have. Missing any = users immediately feel the tool regressed.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Gender selector (expanded) | Every character tool starts with gender; current system has it | LOW | Expand to 3 options: Male / Female / Non-binary. Retain toggle-to-deselect (gender can be left unspecified to let model decide). |
| Ethnicity / origin free-form or multi-select | Current "country" picker is 7 Asian nationalities with Vietnamese labels — the primary user complaint. Users expect to express "Japanese", "Moroccan", "Brazilian" without a locked country list | MEDIUM | Replace `CHARACTER_COUNTRIES` with either (a) a curated multi-region list (~20 options: East Asian, South Asian, Southeast Asian, Middle Eastern, African, Latin American, European, American) or (b) a short free-text field. Free-text is lower complexity and higher expressiveness. Both work; option (a) is more consistent for library search. |
| Age range selector | Age dramatically changes face structure; any serious character tool exposes it | LOW | 5–6 buckets: Teenager (15–19), Young Adult (20s), Adult (30s), Middle-aged (40s), Mature (50s+). Buckets beat sliders because they map to discrete prompt tokens. |
| Aesthetic / vibe selector | Existing vibes (Clean Girl, Douyin, etc.) are the most-used dimension — proven value. Users expect a "style" dimension | LOW | Keep the vibe concept; internationalize labels; allow adding new vibes without code changes (move to a config array). |
| Hair color + style | Hair is the most visually distinctive element of a character after face | MEDIUM | Two sub-fields: color (Black / Brown / Blonde / Red / Silver / Custom) + style (Long straight / Long wavy / Short bob / Updo / Loose bun / Braids / Natural / Short cropped). Can be implemented as two chip rows. |
| Extras / freeform override | Existing `charExtras` textarea covers what no preset can | LOW | Keep exactly as-is; 200 char limit. Place it last as the escape hatch. |
| i18n of all new fields | The repo just shipped EN+TR at 424-key parity; any new UI strings must follow the same discipline | LOW | Add keys under a new `character.*` namespace group; run `check-i18n-parity.mjs` to stay green. |
| Prompt assembled at dispatch (not stored as string) | This is already the architecture. Users expect regeneration to be possible from saved fields | NONE | Preserve `buildCharacterPrompt` pattern; store structured fields on `node.data`, assemble at dispatch. |
| Character data visible in ResultViewer | Current system shows `charCountry` and `charVibe` as pills under the model badge. Users expect their choices to be readable after generation | LOW | Extend to show all new structured fields as metadata pills. `ResultViewer.tsx` already calls `localizedCountryLabel` / `localizedVibeLabel`. |

### Differentiators (Competitive Advantage)

Features that go beyond parity and distinguish Flowboard's character creation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Named character library with save / reuse | The single biggest gap in the current system. Users build a character config they like, then lose it on board change. "Save as 'Mei — clean office casual'" and reuse across boards is the stated user need in the milestone | MEDIUM | Persist to the existing `references` table with `kind="character"`. A saved character is a named snapshot of the structured fields (gender, ethnicity, age, hair, vibe, extras, etc.) — NOT just a generated image. The generated image can be associated as a thumbnail but is separate from the config. The ReferencesPanel already has pin / rename / delete / search / drag-to-canvas. Reusing a saved character config means loading its fields back into the wizard on a new character node. |
| Load character config into wizard from library | Users can pick a saved character from the library and have the wizard pre-filled with that config, then modify and re-dispatch | MEDIUM | Requires a "Load into wizard" action in ReferencesPanel or a "From library" button in the wizard. The config is just JSON on the reference's `data` field (currently `aiBrief` / `aspectRatio` but could carry `charConfig` JSON). |
| Rendered prompt preview (collapsible) | Show the assembled prompt token string in a read-only expandable section below the wizard so power users can verify what will be sent to Flow. Not editable (that's the extras field's job), but transparent | LOW | A `<details>` element or toggle button that calls `buildCharacterPrompt(...)` with current state and renders the output. This is unique: most tools hide the assembled prompt. Flowboard users are technically curious (they already see auto-prompts get surfaced in the textarea). |
| Outfit field as a distinct structured field | Current vibe tokens bake outfit into makeup/hair/outfit bundles. An explicit outfit field (e.g., "Business formal", "Streetwear", "Casual", "Traditional dress", "Swimwear", "Custom") decouples the vibe aesthetic from the clothing, enabling "K-Pop vibe with business formal outfit" combinations the current system can't express | MEDIUM | Adds one chip-row or short select. Token order: outfit tokens append after vibe tokens, before lighting tokens. |
| Expression as a distinct structured field | Expressions affect downstream usability (a character with a neutral expression is more reusable as a reference than one with a forced smile). Making it explicit is a differentiator over tools that bake expression into vibe | LOW | 5 options: Neutral / Soft smile / Confident / Thoughtful / Custom. Neutral = default for new characters (maximizes downstream reference reuse). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like obvious improvements but would make the rework worse.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 5+ step wizard (separate screen per dimension) | "Guided = more steps" intuition; game character creators (RPGs, MMOs) use 7–12 step wizards | Character creation is NOT a signup flow. Each step adds navigation overhead (Back / Next buttons, progress bar, state persistence across steps). For 8–10 fields, a single scrollable pane with collapsible section groups beats a wizard: users can scan everything at once, reorder on return visits, and skip dimensions they don't care about. Research (Tinyform 2025, Eleken wizard pattern guide) confirms wizards are optimal for 3–7 genuinely sequential decisions; 8+ fields with lateral dependencies → single page wins. The existing dialog IS the wizard shell; adding steps means adding a step router inside the dialog which is friction for a local single-user tool. | Single scrollable dialog with grouped sections (Identity → Appearance → Styling → Expression/Lighting). Keep "Extras" at the bottom. One Submit button. |
| 100+ preset ethnicity dropdown (every country) | Completeness feels respectful | Any enumerated country list will offend by omission or mis-categorization. A "Haitian" user picking "African" or "Caribbean" shouldn't have to find their country in a list of 200. Maintenance cost is high. | Broad regional buckets (8–10 regions) + free-text override field. Let the user type exactly what they mean when buckets are insufficient. |
| AI-assisted field inference from photo | "Upload a reference photo and auto-fill the fields" | This is explicitly out of scope (the milestone chose "Guided wizard with structured fields" NOT "AI-assisted brief from photo"). Mixing both approaches in v1.1 risks scope creep and introduces an LLM dependency into the character wizard path | Defer to a separate milestone. Existing vision service (`services/vision.py`) already does photo → brief for image nodes; connecting it to the character wizard is a Phase 2 feature. |
| Real-time preview / live prompt preview image | Show a generated image as you fill in the wizard fields | Requires generating an image per field change, consuming Flow credits. The credit model is real money; preview-on-change is a fast path to accidental over-spend. | Show the rendered prompt text (text preview, not image preview). Users dispatch explicitly when ready. |
| Per-field locking (lock hair, unlock vibe) | Midjourney `--cw` style partial locking | Adds cognitive overhead (two states per field: locked/unlocked) and is primarily useful for batch variation workflows. The existing variant stepper (1–4 variants) already handles variation. | Use the extras field for override text. The "locked fields" concept is better deferred to a "variations" feature where users explicitly mark which dimensions should vary. |
| Character age as a numeric slider | "More precise is better" | Diffusion models respond to age range descriptors ("a woman in her 30s"), not exact integers. A slider from 18–80 would need to map to descriptors anyway, adding complexity without expressiveness gain. | Age range buckets map directly to prompt tokens and are more honest about model behavior. |
| Sharing characters to a community library | Other users on the same instance can use my characters | Flowboard is explicitly local-only and single-user. No auth boundary, no multi-user identity. Sharing is not architecturally possible without a server-side user model. | ReferencesPanel drag-to-canvas already covers all cross-board reuse within one user's instance. |
| Thumbnail generation for the saved character config (separate from generated image) | "Show me what this character looks like in the library" | A saved character config (field JSON) has no image until a generation is dispatched. Generating a thumbnail on save means consuming a credit just to organize. | The first generated image from a character node can be optionally saved to the library with the config. Thumbnail = generated result. If no image yet, show a placeholder avatar icon. |

---

## Feature Dependencies

```
[Structured fields on node.data]
    └──requires──> [Data model migration: charCountry/charVibe → charEthnicity/charAge/charHair/charOutfit/charExpression]
                       └──requires──> [Backfill existing nodes (load without console errors)]

[Named character library]
    └──requires──> [Structured fields on node.data]
    └──requires──> [References table carries charConfig JSON]
    └──enhances──> [Existing ReferencesPanel (pin/rename/delete/search already built)]

[Load config into wizard from library]
    └──requires──> [Named character library]
    └──requires──> [Wizard pre-fill from charConfig]

[Rendered prompt preview]
    └──requires──> [buildCharacterPrompt updated for new fields]
    └──enhances──> [Wizard UX — power user transparency]

[Outfit field]
    └──requires──> [Structured fields]
    └──enhances──> [Vibe field — decouples aesthetic from clothing]

[Expression field]
    └──requires──> [Structured fields]
    └──conflicts──> [Vibe tokens that bake in expression (must be stripped from vibe tokens)]

[i18n of new wizard strings]
    └──requires──> [Structured fields UI complete]
    └──requires──> [check-i18n-parity.mjs stays green]
```

### Dependency Notes

- **Structured fields require data migration:** Existing nodes have `charCountry` / `charVibe` / `charGender` keys on `node.data`. The new schema renames some (country → ethnicity), adds new ones, and deletes the old constants file. Nodes with old keys must load without errors — the wizard reads new keys with old-key fallbacks on hydration.
- **Expression conflicts with vibe tokens:** Current vibe token arrays bake in expression descriptors ("relaxed friendly expression with a gentle subtle smile"). When expression becomes a separate field, its tokens must be stripped from vibe arrays to avoid duplication / conflict. The vibe tokens cover makeup + hair + outfit + mood + lighting + backdrop; expression and lighting should be peeled out as standalone fields.
- **Named library requires references table can carry config JSON:** The current `Reference` table has `aiBrief` (text) and `aspectRatio` (string). Persisting full character config requires either (a) a new column on `Reference` or (b) encoding the config JSON into an existing blob field. Since the milestone explicitly defers backend schema changes, the config can be JSON-encoded into a new `charConfig` field on `node.data` and stored in the references `aiBrief` field as a sentinel-prefixed string, OR a new optional column is added. The right call is a new nullable `char_config` JSON column on `Reference` — this is a simple additive migration, not a schema overhaul.

---

## MVP Definition

### Launch With (v1.1)

Minimum to call the character creation rework "done" and close the milestone.

- [ ] Replace `CHARACTER_COUNTRIES` / `CHARACTER_GENDERS` / `CHARACTER_VIBES` dropdown picker with structured field pane inside `GenerationDialog` (character node only)
- [ ] Structured fields: gender (3 options), ethnicity (regional buckets + free-text override), age range (6 buckets), vibe (keep existing 6 + extensibility), hair color + style (two chip rows), expression (5 options), extras textarea
- [ ] `buildCharacterPrompt` updated to assemble from new field set (framing anchors preserved, expression + lighting decoupled from vibe tokens)
- [ ] Structured fields persisted on `node.data` (`charGender`, `charEthnicity`, `charAge`, `charHair`, `charOutfit`, `charExpression`, `charVibe`, `charExtras`)
- [ ] ResultViewer metadata grid shows new fields (extending existing `localizedCountryLabel` → `localizedEthnicityLabel` pattern)
- [ ] Backfill / migration: existing nodes with old `charCountry` / `charVibe` keys load without console errors (hydration reads old keys with sane fallbacks)
- [ ] Named character library: "Save to library" action on character nodes that saves the structured config as a named entry in the References table (`kind="character"`, config JSON in `char_config` column)
- [ ] ReferencesPanel: character library entries display character config summary (vibe + ethnicity + age) in the card body; "Load into wizard" button pre-fills the wizard on a target character node
- [ ] i18n: all new wizard strings in `en.json` + `tr.json` at parity; `check-i18n-parity.mjs` stays green
- [ ] Delete `constants/character.ts` CHARACTER_GENDERS / CHARACTER_COUNTRIES / CHARACTER_VIBES after migration (or restructure the file to just export the new config arrays)

### Add After Validation (v1.x)

- [ ] Outfit as a distinct structured field — trigger: users report "K-Pop vibe but I want business formal" and the extras workaround is too verbose
- [ ] Rendered prompt preview toggle — trigger: at least one maintainer or contributor requests transparency into the assembled token string; already low-complexity
- [ ] Expanded ethnicity: regional buckets → curated multi-select list with ~20 named options — trigger: users report regional buckets feel too coarse

### Future Consideration (v2+)

- [ ] AI-assisted field inference from photo upload — trigger: v1.1 wizard UX validated; separate milestone, uses existing vision service
- [ ] Character variation system (lock/unlock per-field for batch variation) — trigger: users use variants heavily and want controlled variation axes
- [ ] Lighting as a distinct structured field — currently encoded in vibe tokens; exposing it requires refactoring vibe token arrays further

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Structured fields on node.data (gender, ethnicity, age, vibe, hair, expression, extras) | HIGH | MEDIUM | P1 |
| Updated buildCharacterPrompt + framing anchor preservation | HIGH | LOW | P1 |
| Backfill migration (old keys load without errors) | HIGH | LOW | P1 |
| Named character library (save config to References) | HIGH | MEDIUM | P1 |
| i18n for new wizard strings (EN+TR parity) | HIGH | LOW | P1 |
| ReferencesPanel "Load into wizard" action | MEDIUM | MEDIUM | P1 |
| ResultViewer metadata for new fields | MEDIUM | LOW | P1 |
| Rendered prompt preview toggle | MEDIUM | LOW | P2 |
| Outfit as a distinct structured field | MEDIUM | LOW | P2 |
| Expanded ethnicity multi-select | LOW | MEDIUM | P3 |
| AI-assisted brief from photo | HIGH | HIGH | Defer |

---

## Competitor Feature Analysis

| Feature | OpenArt Character Builder | Midjourney --cref | Higgsfield Soul ID | Flowboard v1.1 Approach |
|---------|--------------------------|-------------------|--------------------|--------------------------|
| Wizard step count | 4 steps (Vibe → Gender → Ethnicity → Age) | No wizard; parameter flags | Upload-based (no field wizard) | Single scrollable pane, 6–8 grouped field sections |
| Ethnicity | Named option in step 3 | Prompt text | Derived from uploaded photo | Regional buckets + free-text override |
| Age | Named option in step 4 | Prompt text | Derived from photo | 6 age-range buckets |
| Hair | Not a dedicated step; part of post-generation editing | Prompt text | Derived from photo | Color chip row + style chip row |
| Outfit / Vibe | "Look Vibe" is step 1 | Prompt text | Not structured | Named vibes (keep existing 6) + optional outfit field (v1.x) |
| Expression | Post-generation editing; "expression sliders" | Prompt text | Not structured | 5-option chip row |
| Save to library | Project-level persistence; character reuse across generations | No library; use `--cref` with URL | "Soul ID" = persistent character asset | References table entry with charConfig JSON |
| Load from library | Yes — character persists in project | No — must re-attach `--cref` URL | Yes — Soul ID is reusable | "Load into wizard" pre-fill action |
| Prompt transparency | Hidden | Hidden (parameter flags only) | Hidden | Optional rendered prompt preview (collapse/expand) |
| Cross-board reuse | Within platform project | Across all Midjourney uses | Across all Higgsfield uses | Via References panel (existing drag-to-canvas) |

---

## Wizard Step Count and Ordering Recommendation

**Recommendation: Single scrollable pane with 4 grouped sections, no step routing.**

Rationale:
- The `GenerationDialog` is already a modal dialog with a single Generate button. Adding Next/Back step navigation inside a dialog adds a router with no real benefit for 8–10 fields.
- OpenArt's 4-step wizard works because it is a full-screen experience with image generation after each step. Flowboard's dialog is compact and modal; multiple steps would feel claustrophobic.
- Wizard UI literature (Eleken, Tinyform 2025) recommends steps only when fields are logically gated by prior answers. Character fields are mostly independent — hair choice doesn't gate outfit choice.
- Single-page with visible grouping headers (collapsible on mobile, always expanded on desktop) achieves all the organizational benefit of steps without navigation friction.

**Proposed field grouping order:**

```
1. IDENTITY     Gender · Ethnicity
2. APPEARANCE   Age range · Hair color · Hair style
3. STYLING      Vibe / Aesthetic
4. EXPRESSION   Expression
5. EXTRAS       Freeform override textarea (200 chars)
```

Lighting is NOT a user-facing field in v1.1. It is encoded in vibe tokens. If vibe tokens are later refactored to remove lighting (future work), lighting becomes a P2 field.

This matches the natural mental model a user follows: "Who is this?" → "What do they look like?" → "What's their style?" → "What's their mood?" → "Anything else?"

---

## Character Library Save / Reuse UX Recommendation

**Save action:** A "Save character to library" button appears in the character node's ResultViewer (after a successful generation) or directly in the wizard footer before dispatch. The button triggers a name prompt (inline in the dialog, not a separate modal) and saves to References with `kind="character"`.

**Naming convention:** Free-form user-provided name. Default suggestion: "{vibe} {ethnicity} character" (e.g., "Clean Girl Japanese character"). Users can rename inline in ReferencesPanel (existing rename functionality).

**Thumbnail:** The most recently generated image for the node becomes the thumbnail (`mediaId`). If no generation yet, the library card shows a placeholder character icon.

**Library card display:** Existing ReferencesPanel ReferenceCard component, extended to show `charConfig` summary (1–2 lines: ethnicity + age + vibe). The existing `aiBrief` field currently shows the AI brief in the tooltip; for character library entries it shows the config summary instead.

**Search / filter:** The existing text search in ReferencesPanel already filters by `label`. Character library entries mix with image/visual_asset references. A kind filter chip row (All / Characters / Images / Visual Assets) on the panel header would allow filtering by type — this is a P2 enhancement. For v1.1, character entries appear mixed with other references and are distinguished by the character icon.

**Load into wizard:** A "Use" button on the character library card populates the wizard fields from the saved `charConfig` on the next character node the user opens. Implementation: when the user clicks "Use", the ReferencesStore sets a `pendingCharConfig` state; when the next character GenerationDialog opens, it checks for `pendingCharConfig` and hydrates the form fields, then clears the pending state.

**Edit-in-place vs clone-then-edit:** The saved config is a snapshot. Editing it in the library is not supported in v1.1 (complexity: editing a saved config doesn't re-generate the thumbnail, creating a misleading preview). Instead: load into wizard → modify → generate → save as a new library entry. This is the "clone-then-edit" pattern, simpler to implement and less confusing.

---

## Sources

- OpenArt Character Builder announcement (March 2026): https://openart.ai/blog/character-builder-pr/
- OpenArt Character 2.0 walkthrough: https://scribehow.com/page/OpenArt_Character_20_Update_2026_Everything_You_Need_to_Know__Fxluq97URWauBvge3m5Z2w
- Midjourney character reference workflows: https://medium.com/@impijushsaha/how-to-create-consistent-characters-in-midjourney-the-complete-guide-for-2026-405c3bfbb4e1
- Midjourney --cref guide: https://prompting.systems/blog/how-to-use-midjourney-cref-for-consistent-characters
- Higgsfield Soul ID: https://higgsfield.ai/blog/sould-id-best-character-consistency
- Higgsfield character creator: https://higgsfield.cc/higgsfield-character
- ComfyUI multi-character LoRA workflows: https://civitai.com/articles/21795/comfyui-tutorial-dynamic-multi-character-workflow-workflow-guide
- AI UX Patterns — Preset Styles: https://www.shapeof.ai/patterns/preset-styles
- Wizard UI Pattern (Eleken): https://www.eleken.co/blog-posts/wizard-ui-pattern-explained
- Wizard Design Pattern (UX Planet): https://uxplanet.org/wizard-design-pattern-8c86e14f2a38
- Multi-step forms vs single-step (Ivyforms): https://ivyforms.com/blog/multi-step-forms-single-step-forms/
- Google Vertex AI image prompt guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide
- Stable Diffusion WebUI style presets UX: https://github.com/AUTOMATIC1111/stable-diffusion-webui/issues/10725
- AI portrait prompt structure (BIGVU): https://bigvu.tv/blog/best-ai-portrait-prompts-create-professional-brand-images/
- AI 3D model preset naming conventions (Tripo3D): https://www.tripo3d.ai/blog/explore/ai-3d-model-generator-style-tokens-and-presets-library

---

*Feature research for: Flowboard v1.1 — Character Creation Rework*
*Researched: 2026-06-16*
