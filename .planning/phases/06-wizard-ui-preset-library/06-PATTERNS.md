# Phase 6: Wizard UI + Preset Library — Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 12 (7 new, 5 modified)
**Analogs found:** 10 / 12

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `components/character/CharacterWizard.tsx` | component | request-response | `components/GenerationDialog.tsx` | role-match (same modal shell, chip UX, submit flow) |
| `components/character/PresetList.tsx` | component | CRUD | `components/ReferencesPanel.tsx` | role-match (save/list/rename/delete UX) |
| `components/character/steps/StepIdentity.tsx` | component | transform | `GenerationDialog.tsx` lines 871–903 (chip block) | partial |
| `components/character/steps/StepAppearance.tsx` | component | transform | same chip block | partial |
| `components/character/steps/StepStyling.tsx` | component | transform | same chip block | partial |
| `components/character/steps/StepExpression.tsx` | component | transform | same chip block | partial |
| `components/character/steps/StepReview.tsx` | component | transform | `GenerationDialog.tsx` lines 736–743 (submit) | partial |
| `store/characterPresets.ts` | store | CRUD | `store/settings.ts` + `store/references.ts` | exact (manual localStorage pattern) |
| `components/GenerationDialog.tsx` | component | request-response | self (modified) | — |
| `styles.css` | config | — | self (modified) | — |
| `i18n/locales/en.json` | config | — | self (modified) | — |
| `i18n/locales/tr.json` | config | — | self (modified) | — |

---

## Pattern Assignments

### `store/characterPresets.ts` (store, CRUD + localStorage)

**Primary analog:** `frontend/src/store/settings.ts` lines 87–111 (manual localStorage pattern)
**Secondary analog:** `frontend/src/store/references.ts` lines 79–148 (error slot + CRUD shape)

The project does NOT use Zustand's `persist` middleware — all existing stores roll their own
`loadPersisted` / `persist` helpers with `try/catch`. Phase 6 follows the same hand-rolled
pattern rather than importing `zustand/middleware/persist`.

**Load pattern** (from `settings.ts` lines 94–113):
```typescript
const STORAGE_KEY = "flowboard.character.presets.v1";

function loadPersisted(): CharacterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Validate via Zod — on failure clear + surface error via returned tuple
    const result = PersistedPresetSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function persist(presets: CharacterPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // caller must set error slot — do NOT swallow silently (Pitfall #11)
  }
}
```

**Store shape** (from `references.ts` lines 25–40 + CLAUDE.md Zustand store rules):
```typescript
export interface CharacterPresetsState {
  presets: CharacterPreset[];
  error: string | null;
  addPreset(name: string, config: CharacterConfig): void;
  renamePreset(id: string, name: string): void;
  deletePreset(id: string): void;
  clearError(): void;
}

export const useCharacterPresetsStore = create<CharacterPresetsState>((set, get) => ({
  presets: loadPersisted(),   // synchronous init (settings.ts line 113 pattern)
  error: null,
  addPreset(name, config) {
    if (get().presets.length >= 50) {
      set({ error: i18n.t("wizard.error.preset_cap") });
      return;
    }
    const next = [
      { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), config },
      ...get().presets,
    ];
    try {
      persist(next);
      set({ presets: next });
    } catch {
      set({ error: i18n.t("wizard.error.preset_save_failed") });
    }
  },
  // ... rename, delete follow same try/catch + set pattern
  clearError() { set({ error: null }); },
}));
```

**Key rules:**
- `i18n.t(...)` is allowed in `.ts` store actions — import `i18n` from `"../i18n/i18n"` (not `useTranslation`).
- `error` slot + `clearError()` are mandatory on every store with side-effecting actions (CLAUDE.md).
- Corrupt-on-load: wrap `loadPersisted()` in `PersistedPresetSchema.safeParse`; on failure set `error` in a deferred `useEffect` (or accept silent empty-state; do NOT crash boot).
- Preset name collision check: use `.toLocaleLowerCase("en-US")` — NOT `.toLowerCase()` (BUGS-02 / D-21).

---

### `components/character/CharacterWizard.tsx` (component, request-response)

**Analog:** `frontend/src/components/GenerationDialog.tsx`

**Import pattern** (lines 1–34):
```typescript
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGenerationStore } from "../../store/generation";
import { useBoardStore } from "../../store/board";
import { buildCharacterPrompt } from "../../lib/character/buildCharacterPrompt";
import { toCharacterDataPatch } from "../../lib/character/toDataPatch";
import { patchNode } from "../../api/client";
import { useCharacterPresetsStore } from "../../store/characterPresets";
// Relative imports only — no @/ alias (CLAUDE.md "Import Organization")
```

**State shape** — local `useState` for transient wizard state; module-level draft map outside component:
```typescript
// Module-level draft cache (D-03 + Pitfall #5) — not in Zustand, not persisted
const _draftCache = new Map<string, Partial<CharacterConfig>>();

export function CharacterWizard({ rfId, onDone }: CharacterWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Partial<CharacterConfig>>(
    () => _draftCache.get(rfId) ?? {}
  );
  // ... restore draft on rfId change
  useEffect(() => {
    setConfig(_draftCache.get(rfId) ?? {});
  }, [rfId]);
```

**Submit pattern** (mirroring `GenerationDialog.tsx` lines 735–743):
```typescript
function handleSubmit() {
  const promptString = buildCharacterPrompt(config);
  const delta = toCharacterDataPatch(config, node?.data ?? {});
  if (Object.keys(delta).length > 0) {
    void patchNode(dbId, { data: delta });  // shallow-merge contract — never replace data wholesale
  }
  dispatchGeneration(rfId, { prompt: promptString, aspectRatio, variantCount: 1 });
  _draftCache.delete(rfId);
  onDone();
}
```

**`canGenerate` pattern** (mirroring `GenerationDialog.tsx` lines 760–766):
```typescript
const canGenerate =
  !!config.charEthnicity?.trim() ||
  !!config.charVibe ||
  !!config.charExtras?.trim();
```

**Named export, no default export** (CLAUDE.md "Exports").

---

### Step components — `StepIdentity.tsx`, `StepAppearance.tsx`, `StepStyling.tsx`, `StepExpression.tsx`, `StepReview.tsx`

**Analog:** `GenerationDialog.tsx` lines 871–903 (chip block pattern)

**Chip row pattern** (exact copy from lines 875–886):
```typescript
<div className="aspect-chip-row" role="group" aria-label={t("wizard.field.gender.label")}>
  {options.map((opt) => (
    <button
      key={opt.key}
      type="button"
      role="radio"
      aria-checked={value === opt.key}
      className={`aspect-chip${value === opt.key ? " aspect-chip--active" : ""}`}
      onClick={() => onChange(value === opt.key ? undefined : opt.key)}
    >
      {t(`wizard.field.gender.option.${opt.key}` as const)}
    </button>
  ))}
</div>
```

**No dynamic key construction** — `t(\`wizard.field.${field}.option.${key}\`)` is BANNED (D-19).
Use explicit string literals per option or a typed lookup table of literal keys.

**Props shape** — pass slice of `config` + `onChange` callback; step components are dumb:
```typescript
interface StepIdentityProps {
  gender: CharacterConfig["charGender"] | undefined;
  ethnicity: string | undefined;
  onChange(patch: Partial<CharacterConfig>): void;
}
```

---

### `components/character/PresetList.tsx` (component, CRUD)

**Analog:** `components/ReferencesPanel.tsx` (rename/delete inline UX) and `project-sidebar__menu` kebab pattern already in `styles.css`.

**Kebab / inline rename pattern** — reuse existing CSS classes (UI-SPEC §2.5):
- `.project-sidebar__menu` for kebab dropdown
- `.project-sidebar__menu-danger` for delete item
- `.project-sidebar__rename-input` for rename input

**Store access** (CLAUDE.md selector pattern):
```typescript
const presets = useCharacterPresetsStore((s) => s.presets);
const addPreset = useCharacterPresetsStore((s) => s.addPreset);
// Never destructure the whole store
```

---

## Shared Patterns

### localStorage persistence (hand-rolled, NO zustand/middleware/persist)

**Source:** `frontend/src/store/settings.ts` lines 87–111, `references.ts` lines 44–61
**Apply to:** `store/characterPresets.ts`

Pattern: `loadPersisted()` called synchronously at store init; `persist()` called inside each
mutating action; both wrapped in `try/catch`; quota failure sets `error` slot, never swallows.

### Error slot + Toaster wiring

**Source:** `components/Toaster.tsx` lines 1–66
**Apply to:** `store/characterPresets.ts`, `components/Toaster.tsx` (modified)

Toaster reads stores in priority order (line 20): `chat > pipeline > generation > board`.
Add `characterPresets` below `board` (lowest priority). Requires:
1. Import `useCharacterPresetsStore` in `Toaster.tsx`.
2. Add `presetsError` / `clearPresetsError` to the priority chain.
3. Pattern to copy from lines 10–28.

### `useTranslation` placement rule

**Source:** `frontend/src/i18n/i18n.ts` docblock line 13
- `.tsx` files → `const { t } = useTranslation()`
- `.ts` store/utility files → `import i18n from "../i18n/i18n"; i18n.t(...)`

### i18n type registration for new `wizard.*` prefix

**Source:** `frontend/src/i18n/i18n.d.ts` lines 17–27

`CustomTypeOptions` points at `typeof en`. Adding keys to `en.json` automatically extends
typed key completion — **no edit to `i18n.d.ts` is needed**. TypeScript re-infers from
the JSON file. Just add keys to `en.json` and matching keys to `tr.json`.

### Shallow-merge guard for `node.data`

**Source:** `frontend/src/api/client.ts` (`patchNode`), `agent/flowboard/routes/nodes.py` line 75
**Apply to:** `CharacterWizard.handleSubmit()`

NEVER pass `data: { ...allFields }` wholesale. Only pass delta keys via `toCharacterDataPatch`.
`null` sentinel removes a key; `undefined` omits the key from the patch (no-op).
Gate: `if (Object.keys(delta).length > 0)` before calling `patchNode`.

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `lib/character/schema.ts` (extend) | utility | Phase 5 shipped; just add `charHairColor`/`charHairStyle`/`charExtras` fields to existing Zod schema |
| `lib/character/buildCharacterPrompt.ts` (extend) | utility | Phase 5 shipped; add hair-split fallback branch |
| `lib/character/migrate.ts` (extend) | utility | Phase 5 shipped; add idempotent `charHair` decomposition step |
| `store/board.ts` `FlowboardNodeData` (extend) | store | Phase 5 shipped; add 3 optional string fields |
| `store/pipeline.ts` `refreshBoardState` (extend) | store | Wrap with `migrateCharacterNodeData` call — same pattern as Phase 5 did for `loadInitialBoard` / `switchBoard` |

---

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/store/`, `frontend/src/i18n/`
**Files scanned:** 8
**Pattern extraction date:** 2026-06-17
