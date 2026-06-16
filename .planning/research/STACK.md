# Technology Stack: v1.1 Character Creation Rework

**Project:** Flowboard v1.1 — Character Wizard + Preset Library
**Researched:** 2026-06-16
**Scope:** Frontend-only additions to React 18.3 + TS 5.6 strict + Vite 5.4 + Zustand 5 + react-i18next 17

---

## Summary Verdict

**Add nothing for form handling or UI primitives.** Add Zod for schema validation. Use
`zustand/middleware/persist` for the preset library (already bundled with Zustand 5).
Piggy-back the existing References table for cross-board preset persistence as a fast
follow. The project's 5 704-line `styles.css` + hand-rolled modal patterns already
solve every wizard layout need.

---

## Decision Table (New Additions Only)

| Concern | Decision | Version | Add to package.json? |
|---------|----------|---------|----------------------|
| Structured field validation | Zod | 4.4.3 | YES — `zod` (prod dep) |
| Wizard step state | Zustand slice (hand-rolled) | — | NO (Zustand 5 already present) |
| Character preset persistence | `zustand/middleware/persist` + `localStorage` | — | NO (ships with Zustand 5) |
| Form library | None — hand-rolled controlled `useState` | — | NO |
| Stepper / wizard library | None — hand-rolled step index in slice | — | NO |
| UI primitives (dialog, tabs) | None — extend existing `gen-dialog` CSS pattern | — | NO |
| IndexedDB / idb-keyval | Not needed — `localStorage` is adequate | — | NO |
| Headless UI / Radix UI | Not needed — existing hand-rolled accessible modals suffice | — | NO |
| React Hook Form | Not needed — wizard fields are short, low-frequency, and already controlled | — | NO |

---

## Detailed Rationale

### Form Handling: Hand-Roll Controlled State (No React Hook Form, No Formik)

**Verdict: Do NOT add a form library.**

The current `GenerationDialog` uses 14 `useState` calls for ~8 fields plus async state.
The proposed character wizard has a similar field count (gender / ethnicity / age / hair
/ outfit / vibe / expression / lighting / preset name) spread over 4–5 steps. That is
squarely within the project's established hand-rolled pattern.

React Hook Form 7.79.0 provides real value when:
- Forms have 20+ fields with complex cross-field validation,
- Fields are rendered dynamically from a schema,
- Performance at the field level matters (typing into a long list).

None of those apply here. The character wizard has a fixed field set, static layout,
and no per-keystroke validation requirement. Introducing RHF would add a new pattern
the codebase does not use anywhere, require wrapping every chip-button in `Controller`
(since the project uses button chips, not `<input>` elements), and widen the learning
surface for OSS contributors.

Formik is older, heavier, and less TypeScript-native than RHF. It is disqualified for
the same reasons plus bundle weight.

**Pattern to follow:** mirror `GenerationDialog` — one `useState` per wizard field,
step index in Zustand, submission logic in a `handleSubmit` function that builds the
prompt string and calls `dispatchGeneration`.

### Validation: Add Zod 4.4.3

**Verdict: Add Zod; use it narrowly.**

Without a test runner, the only automated correctness gate is `tsc -b --noEmit`. Zod
fills a precise gap: parsing the character preset blob that comes back from
`localStorage` (or the References table's `ai_brief` JSON field) into a typed
`CharacterConfig` object at runtime. Without a schema parser, `JSON.parse` returns
`unknown` and every field access requires a type assertion — which silently accepts
corrupt or migration-mismatched data.

Zod 4 ships in two variants: `zod` (full, ~17.7 KB gzipped for a simple schema) and
`zod/mini` (~6.9 KB). For a local desktop app with no bandwidth constraints this
difference is immaterial. Use the standard `zod` import for ecosystem familiarity.

Scope Zod to two places only:
1. `CharacterConfig` schema — parse preset blobs loaded from `localStorage`.
2. Wizard form data — derive the `CharacterConfig` TypeScript type from the schema via
   `z.infer<typeof CharacterConfigSchema>` so the type stays in sync with the runtime
   validator automatically.

Do NOT use Zod for React form field-level validation (that is what the "required"
attribute and `charGender !== null` guards already handle inline). Adding Zod-driven
per-field error messages on chip-button rows is over-engineering.

**Why not Valibot 1.4.1?** Valibot is 90% smaller but the DX gap matters here: its
API is unfamiliar to most React OSS contributors, the method-naming differs from Zod
(`v.object` vs `z.object`), and the ecosystem integrations (RHF `zodResolver`,
TanStack Query) are more mature on Zod. Since bundle size is irrelevant (local-only
app), Zod's ergonomics win.

**Why not Yup 1.7.1?** Yup predates TypeScript-first design; its types require
separate declaration merging and inference is weaker than Zod. Disqualified.

**Installation:**
```bash
npm install zod
```

### Wizard Step State: Hand-Roll a Zustand Slice

**Verdict: No stepper library. Add a `characterWizard` Zustand slice.**

The existing six slices (board / chat / generation / pipeline / references / settings)
cover the full feature set. A character wizard needs: `step: number`, `fields:
CharacterConfig`, `open: boolean`, `presets: NamedPreset[]`. These map cleanly onto a
new `store/characterWizard.ts` following the exact pattern of `store/generation.ts`
(open/close actions, field setters, error slot).

Libraries like `react-stepper`, `react-step-wizard`, or Headless UI's `Tab` primitive
would add a dependency to manage a `step` integer. The step index is not UI state
requiring aria management — it is a number the wizard renders as a progress bar. The
existing `styles.css` already has backdrop + modal + chip-row CSS.

The `open` flag mirrors how `generation.ts` exposes `openDialog` — the wizard is a
modal triggered from the character `NodeCard`, same as `GenerationDialog`. No new
modal primitive is needed.

### Preset Persistence: `zustand/middleware/persist` + `localStorage`

**Verdict: Use `zustand/middleware/persist` against `localStorage`. Already bundled.**

`zustand/middleware/persist` is already present in
`node_modules/zustand/middleware/persist.d.ts` — it ships with Zustand 5. No new
install needed.

The existing codebase uses manual `localStorage` read/write in `store/settings.ts`
and `store/board.ts` (19 lines total). The `persist` middleware automates this with
automatic hydration, versioned migration support (`version` + `migrate` options), and
partial-state whitelisting (`partialize`). It is strictly better than hand-rolling for
a blob as structured as `CharacterPreset[]`.

**Why not idb-keyval + IndexedDB?** `idb-keyval` 6.2.5 is 55 KB unzipped and solves
a problem this project does not have. IndexedDB is valuable for: non-serializable
objects (class instances, Blobs), large binary data, or concurrent cross-tab access.
Character presets are small flat JSON objects (under 2 KB total for 20 presets). The
existing codebase stores the active board ID, locale preference, panel open state, and
model preferences in `localStorage` without issues. There is no motivation to
introduce async hydration (which the persist middleware handles differently from sync
`localStorage`, requiring Suspense or a hydration flag).

**Why not the existing References table?** Persisting named presets to the SQLite
`Reference` table (via `POST /api/references`) is architecturally clean and would make
presets cross-board automatically — but it requires shoehorning a `CharacterConfig`
blob into the `ai_brief` text field (the only freeform column on `Reference`). This
is an abuse of the data model for what is out-of-scope backend work. Use
`localStorage` for v1.1, and plan a dedicated `CharacterPreset` route as a fast
follow if cross-device or cross-install use emerges (it won't for a local app).

**Persist key:** `"flowboard.charPresets.v1"` — versioned so future migrations
(`migrate` option) can transform old shapes without silent data corruption.

**Schema of persisted state:**
```typescript
// Derive from Zod schema — single source of truth
interface CharacterConfig {
  gender: string | null;        // "male" | "female" | null (free field, not enum-locked)
  ethnicity: string | null;     // free text replacing charCountry
  age: string | null;           // "20s" | "30s" | "teen" | "senior" | null
  hair: string | null;          // free text
  outfit: string | null;        // free text
  vibe: string | null;          // "clean" | "douyin" | ... | free text
  expression: string | null;    // free text
  lighting: string | null;      // free text
  extras: string;               // carry-over from current charExtras
}

interface NamedPreset {
  id: string;                   // crypto.randomUUID()
  name: string;                 // user-typed label
  config: CharacterConfig;
  createdAt: string;            // ISO-8601
}
```

### UI Primitives: Extend Existing CSS (No Radix, No Headless UI, No react-aria)

**Verdict: Do NOT add a headless component library.**

The existing `styles.css` has:
- `gen-dialog-backdrop` + `gen-dialog` — full modal with keyboard trap, ESC close,
  aria-modal, focus management (150+ lines). The wizard is the same modal with a step
  progress header above the field area.
- `project-modal-backdrop` + `project-modal` — second independent modal pattern with
  fade + pop animations.
- `aspect-chip-row` + `aspect-chip` — the exact chip-button picker used for gender,
  country, vibe. Reused verbatim for wizard steps.
- `settings-panel-backdrop` — a third modal instance.

All three existing modals implement focus traps, aria attributes, and ESC handling
hand-rolled in their respective components. Adding Radix UI `@radix-ui/react-dialog`
(peer deps: `@types/react`, `@types/react-dom`, `react`, `react-dom`) would introduce
an abstraction on top of a pattern the project already solves in ~150 lines of CSS and
~50 lines of React.

Radix UI would be justified if: building a design system used across 10+ components,
needing `@radix-ui/react-tooltip` / `@radix-ui/react-popover` for existing UI too, or
working in a team where the accessibility contract must be enforced externally. None
apply.

Headless UI 2.2.10 (by the Tailwind team) is designed for Tailwind CSS projects.
Flowboard uses vanilla CSS.

react-aria-components 1.18.0 is thorough but heavyweight for this use case, and its
rendering model (compound components with slot props) differs from the project's
function-component style.

**What to do instead:** copy the `gen-dialog` modal skeleton, replace the single
"fields area" with a `{steps[currentStep]}` render, add a step-progress bar `<div>`
above the header (`class="wizard-steps"`), add CSS for it in `styles.css`. Total
additional CSS: ~60–80 lines. Total additional JSX: ~100 lines for the shell + one
component per step.

---

## What NOT to Add (Hard Constraints)

| Library | Why Explicitly Excluded |
|---------|------------------------|
| React Hook Form / Formik | Form fields are button chips + one textarea; RHF's uncontrolled-input optimization does not apply; adds `Controller` wrapper overhead to every chip |
| Yup | Weaker TS types than Zod; older API |
| Valibot | Bundle advantage irrelevant in local app; unfamiliar API reduces OSS contributor ramp |
| idb-keyval / IndexedDB | Async hydration adds complexity; presets are tiny JSON; overkill |
| Radix UI / Headless UI / react-aria | Project has 3 hand-rolled accessible modals already; adding a primitive library to build a 4th is a dependency for its own sake |
| react-stepper / any step wizard library | A `step: number` in Zustand is sufficient; these libraries lock in their own rendering and aria model |
| zustand-indexeddb | Third-party non-official; `persist` middleware is sufficient |
| TanStack Form | No benefit beyond RHF in this context; smaller ecosystem than RHF |

---

## Complete Installation Delta

```bash
# Only one new runtime dependency:
npm install zod

# Nothing else. zustand/middleware/persist is already bundled with zustand@^5.
```

**Bundle size impact:** Zod standard adds ~17.7 KB gzipped to the bundle. Current
bundle post-v1.0: ~580 KB. New total: ~598 KB. Acceptable for a local app.

---

## Integration Notes for Existing Stack

### With react-i18next

Wizard step labels, field labels, preset library panel strings, and validation error
messages all go through `t()`. Use the same flat-namespace pattern as v1.0. Target
prefix: `wizard.*` (step labels), `charField.*` (field names), `preset.*` (preset
library panel). Run `scripts/check-i18n-parity.mjs` after adding keys — it stays
green as the gate.

Zod error messages are internal (used for `localStorage` parse failures, logged to
`console.warn`); they are not user-visible. Do not route Zod errors through `t()`.

### With Zustand 5

New slice: `store/characterWizard.ts`. Follows `create<CharacterWizardState>((set, get) => ...)`.
The `persist` middleware wraps only the `presets` sub-slice (use `partialize` to
exclude transient state like `step` and `open`):

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCharacterWizardStore = create<CharacterWizardState>()(
  persist(
    (set, get) => ({ /* state + actions */ }),
    {
      name: "flowboard.charPresets.v1",
      partialize: (state) => ({ presets: state.presets }),
    },
  ),
);
```

`error: string | null` + `clearError()` follow the store convention so `Toaster.tsx`
picks up preset save errors automatically (priority: below chat, above board).

### With TypeScript strict

`CharacterConfig` and `NamedPreset` are derived from Zod schemas via `z.infer<>`:

```typescript
import { z } from "zod";

export const CharacterConfigSchema = z.object({
  gender: z.string().nullable(),
  ethnicity: z.string().nullable(),
  // ... rest of fields
});

export type CharacterConfig = z.infer<typeof CharacterConfigSchema>;
```

This is the single source of truth — the type matches the validator. TypeScript strict
mode enforces all access is checked.

### With node.data (FlowboardNodeData)

`charCountry` / `charVibe` / `charGender` already exist on `FlowboardNodeData`. The
wizard extends this with additional structured fields (ethnicity, age, hair, outfit,
expression, lighting). New fields are added to the `FlowboardNodeData` interface in
`store/board.ts` as optional strings — they shallow-merge onto the existing JSON
column via the existing `PATCH /api/nodes/{id}` mechanism without any backend schema
change.

Migration: on wizard open, if a node has `charCountry` / `charVibe` / `charGender`
from v1.0, map them to the new field names in the wizard's initial state. Keep reading
`charCountry` etc. at ResultViewer render time until a migration pass clears them.

### With existing character.ts constants

`CHARACTER_GENDERS`, `CHARACTER_COUNTRIES`, `CHARACTER_VIBES` are deleted when the
wizard ships. The `localizedGenderLabel` / `localizedCountryLabel` / `localizedVibeLabel`
helpers in `character.ts` are deleted; display labels for wizard field values come
from the i18n catalog directly. The `buildCharacterPrompt` function in
`GenerationDialog.tsx` is moved into a new `lib/characterPrompt.ts` module that
accepts `CharacterConfig` instead of the three legacy enum keys.

---

## Sources

- [npm: react-hook-form 7.79.0](https://www.npmjs.com/package/react-hook-form)
- [npm: zod 4.4.3](https://www.npmjs.com/package/zod)
- [npm: valibot 1.4.1](https://www.npmjs.com/package/valibot)
- [npm: idb-keyval 6.2.5](https://www.npmjs.com/package/idb-keyval)
- [npm: @radix-ui/react-dialog 1.1.17](https://www.npmjs.com/package/@radix-ui/react-dialog)
- [npm: @headlessui/react 2.2.10](https://www.npmjs.com/package/@headlessui/react)
- [npm: react-aria-components 1.18.0](https://www.npmjs.com/package/react-aria-components)
- [Zustand persist middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data)
- [Zod v4 release (InfoQ, 2025-08)](https://www.infoq.com/news/2025/08/zod-v4-available)
- [Zod v4 vs Valibot bundle size comparison](https://dev.to/whoffagents/zod-v4-vs-valibot-runtime-validation-in-2026-i-benchmarked-both-3jnc)
- [Multi-step form with Zustand + RHF + Zod discussion (react-hook-form)](https://github.com/orgs/react-hook-form/discussions/6382)
- [Headless UI alternatives: Radix vs React Aria vs Ark UI (LogRocket)](https://blog.logrocket.com/headless-ui-alternatives-radix-primitives-react-aria-ark-ui/)
- [Zustand with IndexedDB discussion](https://github.com/pmndrs/zustand/discussions/2475)
