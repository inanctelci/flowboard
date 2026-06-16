# Pitfalls Research

**Domain:** React 18 + Zustand SPA — multi-step wizard, structured node.data fields, saveable library, preset removal with migration
**Researched:** 2026-06-16
**Confidence:** HIGH (grounded in live codebase reading of all affected files)

---

## Critical Pitfalls

### Pitfall 1: Wholesale `node.data` Replace Disguised as a Struct Migration

**What goes wrong:**
When converting the wizard's structured output (`{ charGender, charEthnicity, charAge, charHair, charOutfit, charVibe, charExpression, charLighting }`) into a PATCH call, a developer constructs the full `data` object from wizard state and sends it. This silently deletes all other fields on the node — `mediaId`, `mediaIds`, `aiBrief`, `aspectRatio`, `renderedAt`, `imageModel`, `prompt`, `briefPlan`, etc. — because the backend merges only one level deep (CLAUDE.md `frontend/src/api/client.ts:196-219` docblock).

**Why it happens:**
The wizard knows all the character fields and it is natural to build `data: { charGender: ..., charEthnicity: ..., charVibe: ... }` as a fresh object. When the developer forgets that `patchNode` is a shallow-merge PATCH (not a PUT), the existing node media is lost instantly. The v1.0 retrospective already documented an identical regression: `aspectRatio` was wiped on every image gen by an auto-brief patch that reconstructed the full data blob.

**How to avoid:**
Send only the delta — the specific character struct keys that changed. Never construct the full `data` blob in the wizard submit path. Before adding any new top-level key (`charEthnicity`, `charAge`, etc.), verify it does not collide with existing keys in `FlowboardNodeData` (`store/board.ts:31-97`): `type`, `shortId`, `title`, `status`, `prompt`, `thumbnailUrl`, `mediaId`, `mediaIds`, `slotErrors`, `variantCount`, `aspectRatio`, `aiBrief`, `aiBriefStatus`, `autoPromptStatus`, `renderedAt`, `imageModel`, `videoQuality`, `charCountry`, `charVibe`, `charGender`, `error`, `storyboardGrid`. The wizard submit must call `patchNode(dbId, { data: wizardDelta })` where `wizardDelta` is only the fields that changed.

**Warning signs:**
- After submitting the wizard, `node.data.mediaId` is undefined on the canvas even though the node had an uploaded photo.
- ResultViewer shows "pending" for a node that had rendered media.
- `aiBrief` disappears from the brief hint after a wizard re-open.

**Phase to address:** Data-model phase (the phase that defines `FlowboardNodeData` extensions and the PATCH contract for the wizard).

---

### Pitfall 2: `null` Sentinel Confusion — Clearing vs. Omitting New Fields

**What goes wrong:**
The shallow-merge contract uses `null` as the explicit "delete this key" sentinel (`client.ts:196-219`). When adding new wizard fields (`charEthnicity`, `charAge`, etc.), a developer might send `undefined` for fields the user left blank, expecting them to simply not appear. `JSON.stringify` drops `undefined` silently, so the first save creates the key with a real value; a subsequent "clear field" sends `undefined` again — the stale value survives in SQLite because the merge never received a delete instruction.

**Why it happens:**
The existing character stamp pattern in `GenerationDialog.tsx:646-654` already uses a conditional guard (`if (charCountry) charStamp.charCountry = charCountry`) that means clearing is never signaled — it only sets when truthy. A wizard with explicit "none" selections must distinguish "user cleared this" (send `null`) from "user did not touch this" (omit key).

**How to avoid:**
For every wizard field that the user can explicitly clear (set to no selection), map the cleared state to `null` in the PATCH delta, not `undefined`. Write a helper `toDataPatch(wizardState: WizardState): DataPatch` that maps `""` / `null` / `undefined` form values to explicit `null` so clearing always propagates. The `DataPatch` type (`client.ts:206`) already accepts `null` values — lean into it.

**Warning signs:**
- Clearing a field in the wizard, saving, then reopening shows the old value still selected.
- SQLite `data` column still holds the old key after the user explicitly blanked it.
- `localizedCountryLabel(data.charCountry)` returns a label in ResultViewer after the user switched to a free-text ethnicity field.

**Phase to address:** Data-model phase.

---

### Pitfall 3: Shipped Boards Break Because `localizedCountryLabel` / `localizedVibeLabel` Return `null` for Unknown Keys

**What goes wrong:**
`ResultViewer.tsx:656-670` calls `localizedCountryLabel(data.charCountry)` and `localizedVibeLabel(data.charVibe)` and renders pills only when they return non-null. The current implementations in `constants/character.ts:122-147` include a `default` branch that falls back to the raw `.label` from the constants array. When the constants file is deleted and those functions are removed, existing nodes with `charCountry: "vn"` and `charVibe: "clean"` either throw (import error) or silently return `null` (if the helper is replaced with one that only covers the new structured model), and the pills disappear without any error.

**Why it happens:**
The coupling is in two directions: the keys stored on `node.data` are the old preset keys (`vn`, `jp`, `clean`, `douyin`), and ResultViewer looks them up via the helper functions that reference the now-deleted constants array. Removing the file or gutting the helpers simultaneously breaks all shipped boards.

**How to avoid:**
The migration phase must preserve backward-compat display for the old keys before deleting the constants file. Options: (1) keep `legacyCountryLabel` and `legacyVibeLabel` as frozen maps in a migration shim module until a backfill script has updated all existing nodes, or (2) make the new label resolver accept both old keys (`"vn"`) and new structured values (`"Vietnamese"`). The backfill must PATCH the SQLite `node.data` for every character node to convert `charCountry`/`charVibe` into the new schema before the constants file is touched. Only after `tsc -b --noEmit` passes with the shim removed should the delete be committed.

**Warning signs:**
- Boards created before v1.1 open with missing country/vibe pills in ResultViewer but no console error.
- `localizedCountryLabel("vn")` returns `null` in a dev console test after the refactor.
- TypeScript reports no error because the return type is already `string | null` — no static signal of the behavioral change.

**Phase to address:** Migration phase (must run before constants deletion).

---

### Pitfall 4: Prompt Regression — Framing Anchors Lost or Reordered

**What goes wrong:**
The existing `buildCharacterPrompt` in `GenerationDialog.tsx:46-74` has a carefully ordered sequence: subject line → pose anchors → vibe tokens → extras → framing anchors → negative constraints. The comment explicitly notes "diffusion models weight earlier tokens more — vibe tokens like 'editorial / magazine beauty' otherwise pull toward fashion 3/4 turns." When the wizard replaces this with a new assembler that reorganizes the order (e.g. puts hair/outfit before the frontal-face lock, or omits the negative constraints at the end), generated images start showing off-axis heads, profile views, or occluded faces — silently, because there is no test.

**Why it happens:**
The new wizard has distinct fields (hair, outfit, expression, lighting) that feel natural to append in step order. A developer building `buildWizardPrompt` from scratch may not preserve the exact token ordering or the closing negatives ("no glasses, no hat, no mask, no occlusion", "no head tilt, no head turn", "photorealistic, ultra-detailed, consistent character reference"). The old `tokens[]` arrays from the vibe presets were a compact way to carry multi-clause prompt fragments — replacing them with single-sentence field values flattens the structure and drops the multi-clause density.

**How to avoid:**
Keep the prompt assembler as a pure function in its own module (`lib/buildCharacterPrompt.ts`) with an explicit ordering contract documented in comments. The framing anchors and negatives must be hardcoded at fixed positions (not user-editable). Run A/B validation: generate a batch with the old function and the new function using the same logical inputs, compare outputs. Gate the wizard phase on this comparison before deleting the old assembler.

**Warning signs:**
- Generated character images start showing 3/4-angle views or slight head tilts.
- Framing anchors ("head and shoulders", "both eyes equally visible") do not appear in the dispatched prompt string (inspect via the ResultViewer's prompt display).
- The new assembler's comma-joined output differs significantly in token density from the old `.tokens.join(", ")` output for the same logical character.

**Phase to address:** Wizard UI phase (the assembler ships alongside the wizard), validated before removing the old builder.

---

### Pitfall 5: Wizard State Lost on Close/Reopen (Step Regression)

**What goes wrong:**
The wizard is mounted inside `GenerationDialog` or as a sibling dialog. When the user partially fills steps (identity → appearance) then closes the dialog (accidentally hits ESC or backdrop), all wizard state is lost. On reopen, the wizard starts at step 1 with blank fields. If the wizard mounts as local `useState` inside the dialog component, it resets every time `rfId` in the generation store transitions `null → non-null` because the `useEffect` on `[rfId]` at `GenerationDialog.tsx:392` already calls `setCharGender(null)`, `setCharCountry(null)`, etc. to reset form state on open.

**Why it happens:**
The existing reset-on-open pattern (`GenerationDialog.tsx:445-448`) was intentional for the old single-screen character section. The wizard's multi-step state should NOT be reset on every open — at minimum it should persist until the user explicitly clears or submits. But if wizard step/field state lives in `useState` inside the dialog, the component unmount/remount cycle (or the intentional reset in the useEffect) wipes it.

**How to avoid:**
Lift wizard-in-progress state above the dialog. Either: (a) keep a `charDraft: WizardState` in the generation store or a dedicated wizard store slice, initialized when the dialog opens for a character node and cleared only on submit or explicit "Start Over"; (b) keep local state but don't call the reset setters until the user explicitly clicks "Start Over" — only reset when `rfId` changes to a DIFFERENT node, not on every open/close of the same node. The current `useEffect` must check `if (rfId !== prevRfId)` before resetting character fields.

**Warning signs:**
- User fills steps 1-3 of the wizard, presses ESC accidentally, reopens — form is blank.
- Character nodes show a "half-filled" wizard in the UI that does not match `node.data` (data was not yet saved mid-steps).
- Browser back/forward navigation causes step regression on the canvas.

**Phase to address:** Wizard UI phase.

---

### Pitfall 6: Multi-Step Validation Trap — Last-Step Submit Rejects Valid Data

**What goes wrong:**
A common wizard anti-pattern: validation is run across ALL fields at the submit step, so a user who intentionally left "expression" blank on step 4 (it should be optional) gets a blocking error on step 5 preventing submit. Alternatively, the inverse: per-step validation is so strict that the wizard blocks "Next" on step 2 if the user has not selected every optional field, effectively making optional fields required.

**Why it happens:**
Developers conflate "the form has fields" with "all fields are required." For the character wizard: gender, ethnicity, and vibe are the high-signal mandatory fields; hair, expression, and lighting are optional enhancers. Treating them symmetrically in validation produces either over-blocking (strict) or no feedback (permissive with all validation deferred to submit).

**How to avoid:**
Define a `REQUIRED_FIELDS` set per step explicitly in the wizard constants before coding validation. The existing `canGenerate` check in `GenerationDialog.tsx:761-766` shows the right pattern: gate submit on the minimum viable signal, not on form completeness. For the character wizard: submit should be enabled when at least one of (ethnicity, vibe, extras) is non-empty — the same lightweight gate as the current `charGender !== null || charCountry !== null || charExtras.trim().length > 0`. Step navigation should never block on optional fields.

**Warning signs:**
- User can click "Next" from step 1 to step 2 but gets blocked on step 2 because they did not select a hair style (optional).
- Submit on the review step shows a validation error for a field the user intentionally left blank.
- `canGenerate` is `false` with all mandatory fields filled because an optional field is empty.

**Phase to address:** Wizard UI phase.

---

### Pitfall 7: `charCountry`/`charVibe` Key Collision After Schema Shift

**What goes wrong:**
The new wizard introduces `charEthnicity` as a free-text field replacing `charCountry`. The old key `charCountry` holds values like `"vn"`, `"jp"` on shipped nodes. If the wizard write path reuses the key name `charCountry` for the new free-text value (e.g. `charCountry: "Vietnamese"` instead of the old enum `"vn"`), the ResultViewer's `localizedCountryLabel("Vietnamese")` returns `null` for a new node because it only covers the old enum keys. If the write path uses a new key `charEthnicity`, then the ResultViewer code reading `data.charCountry` shows nothing for new nodes.

**Why it happens:**
Reusing the same key name for semantically different data is tempting to avoid migration cost. But the old value is an enum key (`"vn"`) while the new value is a display label (`"Vietnamese"`). The lookup functions (`localizedCountryLabel`, `localizedVibeLabel`) do a switch/find on the old enum keys — they will silently fall through for free-text values.

**How to avoid:**
Introduce new field names for the new structured model: `charEthnicity` (free text or new enum), `charVibeId` (new wizard key), so old and new nodes are distinguishable by key presence. The ResultViewer rendering block must be updated to handle both: `data.charCountry` (old enum → label via shim) and `data.charEthnicity` (new free text → display directly). TypeScript's `FlowboardNodeData` interface must be updated with both optional fields and the old fields deprecated-but-not-deleted until after migration.

**Warning signs:**
- `tsc -b --noEmit` passes but `localizedCountryLabel(data.charCountry)` returns unexpected values.
- New wizard saves `charCountry: "Vietnamese"` and ResultViewer shows "Vietnamese" as raw text instead of a localized label (because the switch fell through to the `default: return CHARACTER_COUNTRIES.find(...)?.label` branch, which is now undefined).
- After migration, some nodes show country pills and some do not, with no console errors.

**Phase to address:** Data-model phase (key naming contract), migration phase (backfill old keys).

---

### Pitfall 8: i18n Parity Break — en.json Gets Wizard Keys Without tr.json Update

**What goes wrong:**
The developer adds wizard keys to `en.json` (e.g. `"wizard.step.identity"`, `"wizard.field.ethnicity_placeholder"`, `"wizard.step.appearance"`) during the wizard UI phase and commits. `scripts/check-i18n-parity.mjs` exits code 1 on the next run because `tr.json` is missing these keys. If the parity script is not in the CI gate, it may not be discovered until the Turkish translation pass — at which point the wizard UI has already shipped with English fallback leaking through in Turkish mode.

**Why it happens:**
The wizard has the largest single-PR key addition since v1.0 (estimated 40-60 new keys for step labels, field labels, placeholders, validation messages, review section headers, library CTA). Adding them to one file at a time is the natural edit flow.

**How to avoid:**
Run `node scripts/check-i18n-parity.mjs` as part of the commit checklist (or add it to the `npm run lint` command). Always add a key to BOTH `en.json` and `tr.json` in the same commit, even if the Turkish value is an empty string (the script warns on empty values but does not fail). The fastest path: draft the TR values as machine-translated placeholders with a `TODO: native review` comment in the key value, so the file stays at parity. Never commit en.json edits without touching tr.json.

**Warning signs:**
- `node scripts/check-i18n-parity.mjs` exits non-zero after the wizard PR.
- Turkish UI shows English strings in wizard steps (fallback leaking).
- `tsc -b --noEmit` passes (TypeScript only validates key existence in `en.json` via `CustomTypeOptions`), so there is no static signal of the TR gap.

**Phase to address:** i18n phase (but the wizard UI phase must enforce this at every commit, not only in a dedicated i18n phase).

---

### Pitfall 9: Dynamic-Key Anti-Pattern in Wizard Step Labels

**What goes wrong:**
The wizard has step labels (e.g. "Identity", "Appearance", "Styling", "Expression/Lighting", "Review"). A developer translates these with dynamic key construction: `t(\`wizard.step.${currentStep}\`)`. The `i18n.ts` file already documents this prohibition: "Never use dynamic key construction: `t(\`prefix.\${variable}\`)` breaks static analysis." TypeScript's `CustomTypeOptions` declaration merging will not catch this — it only type-checks string literals passed to `t()`. The dynamic key silently returns the key name itself (e.g. "wizard.step.1") when the variable does not correspond to an existing key.

**Why it happens:**
A 5-step wizard with sequential labels is the textbook use case where dynamic keys feel elegant. The existing v1.0 retrospective flagged this exact pattern (v1.0 BUGS reference: "dynamic-key anti-pattern flagged in v1.0 retrospective").

**How to avoid:**
Enumerate all step label keys explicitly: `const STEP_LABELS: Record<WizardStep, string> = { identity: t("wizard.step.identity"), appearance: t("wizard.step.appearance"), ... }`. This looks repetitive but is the only pattern that TypeScript can statically verify and that survives key renames. Map the wizard step enum to explicit `t()` calls at render time, not in a loop with interpolation.

**Warning signs:**
- `t("wizard.step.identity")` works but `t(\`wizard.step.\${step}\`)` returns the key string itself for any step.
- `tsc -b --noEmit` passes (dynamic keys are not type-checked).
- Adding a new step requires no update to the translation files because the key is never statically referenced.

**Phase to address:** Wizard UI phase.

---

### Pitfall 10: Saveable Library Name Collision with `Reference` Row `label` Field

**What goes wrong:**
The "saveable character library" stores named character configurations. If implemented by creating `Reference` rows (the existing cross-board library) with `kind: "character"`, then the `label` field on `Reference` (client.ts:730-748) is the only name field. The existing "Save to Library" from `NodeCard.tsx` and `ResultViewer.tsx` already creates `Reference` rows with `kind: "character"` and labels like `aiBrief.slice(0, 80)` or `#shortId`. A saved character configuration with a user-chosen name collides with this auto-label behavior. The `listReferences` API has no way to distinguish "auto-saved media snapshot" from "user-named character preset."

**Why it happens:**
The Reference table is the obvious storage target for "saved characters" because it already exists and `kind: "character"` is already defined. But its semantic is "a saved media snapshot" (it requires a `media_id`), not "a saved character configuration" (which might not yet have generated media). The library use case requires storing the wizard field values, not just a `media_id`.

**How to avoid:**
Either: (a) add a new `tags` entry convention (e.g. `tags: ["__char_preset__"]`) to distinguish preset rows from snapshot rows — fragile and semantic pollution; (b) add a new `char_config: Record<string, unknown>` JSON column to the `Reference` table — requires backend Pydantic/DB changes (out of scope per CLAUDE.md); (c) use `localStorage` for the character library with a versioned key (`flowboard.char_library.v1`) — keeps it frontend-only, no schema changes needed, and the library is local to the user anyway given the app is single-user local-only. The LocalStorage path avoids all backend scope creep and matches the app's local-first character.

**Warning signs:**
- After saving a named character preset, `listReferences({ kind: "character" })` returns a mix of media snapshots and character configs with no distinguishing marker.
- Deleting a "character preset" from the library inadvertently deletes the `Reference` row that powers downstream cross-board use of that character image.
- The `ReferencesPanel` shows character configuration presets alongside media thumbnails with no visual distinction.

**Phase to address:** Library phase.

---

### Pitfall 11: LocalStorage Quota and StrictMode Double-Mount

**What goes wrong:**
The character library stores named configurations in `localStorage`. In React 18 StrictMode (which this app uses — `main.tsx:8`), effects run twice in development. A naive `useEffect(() => { localStorage.setItem(key, serialize(library)) }, [library])` fires twice on every state change in dev — harmless for reads but potentially confusing during debugging. The real risk: if a user builds up a large library of character configurations with long wizard fields (e.g. the full `tokens[]` arrays plus extras), the serialized JSON can approach the 5 MB localStorage quota. A quota-exceeded exception silently fails if not caught, losing the save without user feedback.

**Why it happens:**
localStorage is the natural frontend-only persistence mechanism and the existing `i18n.ts` already uses it for locale state. The StrictMode double-mount is well-known but the specific risk is the interaction with a write-heavy effect. The quota risk is underestimated because individual character configs seem small, but accumulating hundreds of them with full prompt token arrays can grow.

**How to avoid:**
Wrap every `localStorage.setItem` in a try/catch that routes to the generation store's `error` slot (same pattern used throughout the codebase). Cap the library at a reasonable maximum (e.g. 50 presets) with a warning toast when approaching the limit. For the StrictMode double-mount: the effect write is idempotent (writing the same value twice is harmless) so no special handling needed, but avoid effects that DELETE and RE-CREATE during the double-invoke (e.g. don't clear the key then set it in two separate effects — a crash between the two steps leaves the library empty).

**Warning signs:**
- A `QuotaExceededError` appears in the browser console but no user-facing error is shown.
- Library saves silently fail after reaching ~50 configurations.
- In development, library writes appear to fire twice in the React DevTools profiler.

**Phase to address:** Library phase.

---

### Pitfall 12: Variant-Edge Pinning Still Resolves Old `charVibe` Key After Wizard

**What goes wrong:**
Edge pinning (`source_variant_idx` on `EdgeDTO`) binds a specific variant of the upstream character node to the downstream image/video gen. The `patchEdge` call stores a numeric variant index. This is unaffected by the wizard migration. However: `ResultViewer.tsx:656-670` reads `data.charVibe` from the character node to render a vibe pill. After the wizard migration renames this to `charVibeId` (or replaces it entirely), the ResultViewer code that previously looked up `localizedVibeLabel(data.charVibe)` now reads `undefined`. The pill disappears. This is purely a display regression — the variant edge pinning and the generation dispatch are not affected.

**Why it happens:**
The ResultViewer import `import { localizedCountryLabel, localizedVibeLabel } from "../constants/character"` is a direct coupling that breaks when the constants file is deleted or those functions are removed. The type `FlowboardNodeData` marks these fields as `charCountry?: string; charVibe?: string` — removing them from the interface without updating ResultViewer causes a TypeScript error, but only if the functions that use them are also updated in the same PR.

**How to avoid:**
Before deleting any function from `constants/character.ts`, run `grep -r "localizedCountryLabel\|localizedVibeLabel\|charCountry\|charVibe" frontend/src/` to enumerate ALL call sites. Update every call site in the same commit that removes the function. The migration phase checklist must include this grep as a verification step.

**Warning signs:**
- `tsc -b --noEmit` reports errors on `data.charVibe` or `localizedVibeLabel` after the constants file is touched.
- In a build that compiles cleanly, ResultViewer shows no country/vibe pills for any character node (both old and new).
- `grep` in the codebase finds `charVibe` usage in ResultViewer that was not updated.

**Phase to address:** Migration phase.

---

### Pitfall 13: Turkish Dotted-I Regression in New Wizard String Processing

**What goes wrong:**
v1.0 fixed BUGS-02: `humanizeBackendError` was calling `.toLowerCase()` (system locale) instead of `.toLocaleLowerCase("en-US")` which caused Turkish dotted-I transformation (`"i"` → `"İ"` uppercase, `"I"` lowercase → `"ı"`) to break the error token matching. The same bug can re-enter in the wizard's new string handling code if any utility performs case-insensitive comparison or normalization of wizard field values using the system locale instead of a fixed locale.

**Why it happens:**
JavaScript's `String.prototype.toLowerCase()` uses the runtime locale, which on a Turkish OS (TR-TR locale) maps `"I" → "ı"` and `"İ" → "i"` instead of the ASCII-safe behavior. New string utilities written for the wizard (e.g. normalizing ethnicity free-text input, validating vibe keys, searching the character library) may call `.toLowerCase()` without specifying `"en-US"`.

**How to avoid:**
Any utility that performs case-insensitive comparison of ASCII identifiers (keys, enum values, search matching) must use `.toLocaleLowerCase("en-US")` or `.toLowerCase()` only on values that are guaranteed to be ASCII-safe. The locale JSON keys themselves are lowercase ASCII so `t()` lookups are safe. The risk is in new helper functions that normalize user input. Code review should grep for `.toLowerCase()` in new files added by the wizard PR.

**Warning signs:**
- On a Turkish OS locale, ethnicity field search returns no results for queries containing "I" because the normalized form mismatches.
- A wizard field validation that checks `value.toLowerCase() === "clean"` fails on Turkish OS when the stored value is `"CLEAN"`.
- `node scripts/check-i18n-parity.mjs` passes but the Turkish UI has a subtle mismatch in character library search at runtime.

**Phase to address:** i18n phase; also reviewed in wizard UI phase during code review.

---

### Pitfall 14: `buildCharacterPrompt` Receiving Partial Fields Mid-Wizard

**What goes wrong:**
The wizard persists to `node.data` incrementally: the user might reach step 3 (outfit/hair) and then click "Generate" from the NodeCard's `▶` button without completing steps 4-5. This bypasses the wizard's review step and calls `handleGenerate` which opens `GenerationDialog` which calls the prompt assembler with whatever is currently on `node.data`. If the assembler reads `data.charExpression` (step 4 field) and it is `undefined`, a naive `[...vibeTokens, data.charExpression]` produces `"..., undefined"` in the comma-joined prompt string.

**Why it happens:**
The existing assembler (`GenerationDialog.tsx:46-74`) reads from local dialog state, not from `node.data`, so partial persistence is not an issue today. If the wizard refactor moves field persistence to happen per-step (write to node.data as the user navigates steps), then the prompt assembler must handle missing fields gracefully because the NodeCard's Generate button bypasses the wizard flow entirely.

**How to avoid:**
The prompt assembler must filter `null` / `undefined` / empty-string values before joining. The existing assembler already does `.filter(Boolean).join(", ")` for the main token array — this pattern must be applied to every new field insertion point. Additionally, the wizard should NOT persist to `node.data` on every step navigation — it should persist only on final submit (or explicitly on "Save Draft" if that feature is desired). Keep wizard-in-progress state in the store or local dialog state, not in `node.data`, until the user submits.

**Warning signs:**
- Generated prompt contains the string "undefined" or "null" (visible in ResultViewer's prompt section).
- `buildCharacterPrompt` returns a prompt with extra commas or "undefined" tokens when called with partial data.
- Opening the NodeCard's Generate button on a mid-wizard character node dispatches with a malformed prompt.

**Phase to address:** Wizard UI phase.

---

### Pitfall 15: Accidental Translation of Data Fields

**What goes wrong:**
Wizard field values saved to `node.data` (e.g. `charEthnicity: "Vietnamese"`, `charVibe: "Clean Girl"`) are user data, not UI copy. If a developer writes `t("character.vibe.clean")` and stores the RESULT in `node.data.charVibe`, the node becomes locale-specific: a board created in Turkish mode stores `"Temiz Kız"` for the vibe, but the prompt assembler's English lookup for that vibe's tokens fails because the stored value is a Turkish label, not the stable key.

**Why it happens:**
The localization layer is fresh from v1.0 and developers may conflate "display label" (should be localized, read-only UI) with "data value" (should be a stable key or English token, stored in DB). The existing `character.ts` code explicitly documents this boundary with its `localizedCountryLabel` vs `countryLabel` distinction (the non-localized helper was kept "for backend prompt-building where locale-specific UI text must NOT be injected").

**How to avoid:**
Store only stable keys or English prose in `node.data` — never translated strings. The prompt assembler must always receive either: (a) a stable enum key (`"clean"`, `"vn"`) that it looks up in an English-keyed map, or (b) free-text English prose that users typed themselves. Display labels are derived at render time from the stable key via `localizedVibeLabel(data.charVibe)` — they are never persisted. Document this contract explicitly at the top of the new wizard character constants module.

**Warning signs:**
- A character node saved in Turkish mode generates a different prompt than an identical character node saved in English mode.
- `node.data.charVibe` contains `"Temiz Kız"` instead of `"clean"` after dispatch.
- The prompt assembler returns a fallback/empty prompt because the stored vibe key does not match any entry in the token lookup map.

**Phase to address:** Data-model phase (establish the key vs. label contract before any wizard UI is built).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse `charCountry` key for free-text ethnicity | No backfill needed | Old enum values mixed with new free-text; lookup functions return wrong type | Never — use a new key name |
| Skip TR translations for new wizard keys | Faster wizard PR | Turkish UI falls back to English strings; parity CI fails | Only as empty-string placeholders in the same commit |
| Persist wizard fields per-step to `node.data` | "Auto-save" UX feel | Prompt assembler receives partial fields; mid-wizard state visible in ResultViewer | Never — persist only on submit |
| Keep `CHARACTER_COUNTRIES` and `CHARACTER_VIBES` in the constants file "just for the label helpers" while removing from the UI | No migration needed | Dead code accumulates; new contributors are confused about what is still in use | Acceptable as a transitional shim for one milestone then must be deleted |
| Build the library on top of `Reference` rows | No new backend code | Semantic collision between media snapshots and character presets; `ReferencesPanel` shows mixed content | Never — use localStorage for the pure-frontend preset store |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `patchNode` shallow-merge | Sending full `data` blob from wizard submit | Send only the wizard field delta; never reconstruct the full data object |
| `localizedVibeLabel` / `localizedCountryLabel` | Deleting functions before updating all call sites | Grep all call sites first; update ResultViewer and any other reader in the same PR that removes the function |
| `check-i18n-parity.mjs` | Adding en.json keys without tr.json keys | Always add both files in the same commit; run the parity script locally before push |
| `buildCharacterPrompt` assembler | Inserting new fields with `.join(", ")` without null-filtering | Chain `.filter(Boolean)` before `.join` on every new token array |
| `node.data.charVibe` / `charCountry` reads in ResultViewer | Renaming the data field without updating the reader | Update ResultViewer in the same PR as the data-model field rename |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering the entire wizard on every field change | Perceptible lag navigating between steps on low-end hardware | Keep wizard step state in a single store slice; use shallow equality selectors | Not a concern for <10 fields per step; only if the wizard triggers Board re-render |
| LocalStorage read on every render in the library panel | Small but cumulative perf hit if the library list is read inside a Zustand selector | Read localStorage once on mount, cache in Zustand store; subscribe to the store not localStorage directly | Unlikely to be noticed in this single-user app |
| `collectUpstreamRefMediaIds` scans entire edge list per dispatch | Already present in v1.0; not made worse by the wizard | No action needed | Only at scale (thousands of nodes); irrelevant for local single-user |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Wizard requires completing all 5 steps to generate | User abandons wizard; falls back to free-text | Allow submit from any step after step 1; show a "Review" summary without forcing step 5 navigation |
| "Save to Library" overwrites existing preset with same name silently | User loses customized preset | Check for name collision before save; surface a "Replace existing preset named X?" confirmation |
| Wizard does not show a preview of the assembled prompt | User submits without knowing what will be dispatched | Add a collapsible "Preview prompt" section on the review step showing the joined token string |
| Canceling the wizard mid-flow with partial field fills | User loses all progress on close | Prompt "Keep draft?" on ESC/backdrop click; restore draft on reopen |
| Character library shows raw key values (`"vn"`, `"clean"`) in preset names | Confusing to users | Always derive display labels from keys at render time; never store translated labels |

---

## "Looks Done But Isn't" Checklist

- [ ] **Preset removal:** Run `grep -r "CHARACTER_COUNTRIES\|CHARACTER_VIBES\|CHARACTER_GENDERS\|charCountry\|charVibe" frontend/src/` — must return zero results outside of the migration shim before the constants file is deleted.
- [ ] **ResultViewer pills:** Open a v1.0 board (with old `charCountry: "vn"` and `charVibe: "clean"` on nodes) after the migration and verify the pills still render with the correct localized labels.
- [ ] **Parity CI:** `node scripts/check-i18n-parity.mjs` exits 0 after every wizard-related PR.
- [ ] **Prompt assembler:** Generated prompt for a fully-filled wizard character does not contain the string "undefined", "null", or double commas.
- [ ] **Shallow-merge contract:** Open a character node with a generated `mediaId`, open and submit the wizard, verify `node.data.mediaId` is still present after submit.
- [ ] **Wizard state persistence:** Open wizard on a character node, fill steps 1-3, press ESC, reopen — draft is restored (or at minimum no stale data is written to `node.data`).
- [ ] **Turkish dotted-I:** Every new string utility that calls `.toLowerCase()` on user input has been audited; any ASCII identifier comparison uses `.toLocaleLowerCase("en-US")`.
- [ ] **Dynamic key check:** `grep -r "t(\`" frontend/src/` — no dynamic key construction in wizard code.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wholesale data replace wiped node media | HIGH | Restore from SQLite backup; re-upload media; no automated recovery path |
| TR parity broken after wizard ship | LOW | Add missing TR keys, run parity script, commit fix |
| `buildCharacterPrompt` produces malformed output | MEDIUM | Hotfix the assembler; existing generated images are unaffected; only future dispatches produce correct prompts |
| Library localStorage corrupted or quota-exceeded | LOW | Clear `flowboard.char_library.v1` key; user re-saves presets; no permanent data loss |
| ResultViewer pills disappear for old boards | LOW | Re-add the label lookup shim or backfill nodes; display-only regression, no generation impact |
| Turkish dotted-I regression in new code | MEDIUM | Fix the `.toLocaleLowerCase` call; same class as BUGS-02; well-understood fix |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wholesale `data` replace | Data-model phase | After wizard submit, `node.data.mediaId` still present |
| `null` sentinel confusion | Data-model phase | Clear a wizard field, save, reload — field is gone from `node.data` |
| Shipped board pills disappearing | Migration phase | Open a v1.0 board, verify ResultViewer shows country/vibe pills |
| Framing anchors lost | Wizard UI phase | Compare prompt string before/after to old `buildCharacterPrompt` output |
| Wizard state lost on close | Wizard UI phase | ESC and reopen, verify draft or blank-and-intentional behavior |
| Multi-step validation trap | Wizard UI phase | Submit with optional fields blank — no validation error |
| Key collision `charCountry` vs free-text | Data-model phase | TypeScript type audit; grep for mixed usages |
| i18n parity break | i18n phase (enforced at every wizard PR) | `check-i18n-parity.mjs` exits 0 |
| Dynamic-key anti-pattern | Wizard UI phase | `grep -r "t(\`" frontend/src/` returns no wizard code |
| Library/Reference semantic collision | Library phase | `listReferences` returns no character presets; library uses separate storage |
| LocalStorage quota | Library phase | Add 51+ presets, verify error toast fires instead of silent failure |
| Variant-edge pill regression | Migration phase | After migration, ResultViewer still shows pills for character nodes |
| Turkish dotted-I in new code | i18n phase | Code review grep for `.toLowerCase()` in new wizard utilities |
| Partial fields in prompt assembler | Wizard UI phase | Call assembler with `undefined` fields, verify no "undefined" in output |
| Translating data fields | Data-model phase | Switch to Turkish, save character node, switch to English, verify same prompt |

---

## Sources

- Live codebase reading: `frontend/src/constants/character.ts`, `frontend/src/components/GenerationDialog.tsx`, `frontend/src/components/ResultViewer.tsx`, `frontend/src/api/client.ts`, `frontend/src/store/board.ts`, `frontend/src/store/generation.ts`, `frontend/src/i18n/i18n.ts`, `scripts/check-i18n-parity.mjs`, `frontend/src/canvas/NodeCard.tsx`
- `.planning/PROJECT.md` v1.1 milestone spec and v1.0 retrospec
- `CLAUDE.md` conventions and anti-patterns sections

---
*Pitfalls research for: Flowboard v1.1 — Character Creation Rework (wizard + library + preset removal)*
*Researched: 2026-06-16*
