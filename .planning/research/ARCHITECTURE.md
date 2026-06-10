# Architecture Research: i18n Integration

**Domain:** React SPA internationalization — retrofit onto existing Vite + React 18 + Zustand frontend
**Researched:** 2026-06-10
**Confidence:** HIGH

---

## Standard Architecture

### System Overview

```
frontend/src/
├── main.tsx                  ← i18n side-effect import here; provider wraps <App />
├── App.tsx                   ← useEffect sets document.documentElement.lang
├── i18n/
│   ├── i18n.ts               ← i18next instance init (imported as side effect)
│   ├── i18next.d.ts          ← TypeScript module augmentation (CustomTypeOptions)
│   └── locales/
│       ├── en.json           ← English catalog (source of truth for TS types)
│       └── tr.json           ← Turkish catalog (must match en.json keys exactly)
├── store/
│   └── settings.ts           ← adds locale field + setLocale(); calls i18n.changeLanguage()
└── components/
    └── SettingsPanel.tsx     ← locale picker dropdown added here
```

**Data flow on locale change:**

```
User picks "Türkçe" in SettingsPanel
    ↓
useSettingsStore.setLocale("tr")
    ↓  calls
i18n.changeLanguage("tr")          ← i18next re-renders all useTranslation consumers
    ↓  persists
localStorage["flowboard.settings.v1"].locale = "tr"
    ↓  fires
i18n "languageChanged" event       ← App.tsx useEffect: sets document.documentElement.lang
```

### Component Responsibilities

| Component | i18n Responsibility |
|-----------|---------------------|
| `frontend/src/main.tsx` | Imports `./i18n/i18n.ts` as side effect before `<App />`; wraps `<App />` in `<I18nextProvider>` |
| `frontend/src/i18n/i18n.ts` | Creates and exports the i18next instance; registers `LanguageDetector` + `initReactI18next`; configures detection order |
| `frontend/src/i18n/i18next.d.ts` | Augments i18next `CustomTypeOptions` so `t("key")` is type-checked against `en.json` |
| `frontend/src/i18n/locales/en.json` | Flat English catalog — source of truth for TS key types |
| `frontend/src/i18n/locales/tr.json` | Flat Turkish catalog — must have identical keys to `en.json` |
| `frontend/src/store/settings.ts` | Owns `locale: string` state + `setLocale()`; calls `i18n.changeLanguage()` inside the action; persists to `flowboard.settings.v1` in localStorage |
| `frontend/src/App.tsx` | Runs `useEffect` to sync `document.documentElement.lang` when `i18n.resolvedLanguage` changes |
| `frontend/src/components/SettingsPanel.tsx` | Renders locale selector; calls `useSettingsStore(s => s.setLocale)` |
| All leaf components | Call `const { t } = useTranslation()` at component top; render `{t("key")}` |
| `frontend/src/api/client.ts` | No i18n changes — backend stays English-only by project decision |

---

## Recommended Project Structure

```
frontend/src/i18n/
├── i18n.ts              # i18next instance — imported once in main.tsx
├── i18next.d.ts         # TypeScript CustomTypeOptions augmentation
└── locales/
    ├── en.json          # English strings (flat, no nesting)
    └── tr.json          # Turkish strings (identical key shape)
```

### Structure Rationale

- **`frontend/src/i18n/` (not `src/locales/` at root):** Groups the instance config, type declarations, and locale files together. A contributor adding a new locale (e.g. `de.json`) drops it in one obvious directory and adds one line to `i18n.ts`. No other files change.
- **Flat JSON, no namespaces:** Flowboard has fewer than 300 user-visible strings across the entire frontend. Namespace splitting exists to speed up initial load via selective loading — that benefit does not apply when all locales are bundled statically. Splitting into `canvas.json`, `settings.json`, `dialogs.json` adds `useTranslation('canvas')` namespace arguments to every component, adds `ns` declarations to `i18n.ts`, and adds friction for OSS contributors who need to determine which namespace a new string belongs to. A single flat file wins on maintainability at this scale.
- **`en.json` is the TS type source:** The TypeScript augmentation points at `typeof en` — English is canonical. If a key exists in `tr.json` but not `en.json`, it is dead weight. If a key exists in `en.json` but not `tr.json`, i18next falls back to English silently — acceptable during incremental migration.
- **`i18next.d.ts` co-located with `i18n.ts`:** Not in a root `@types/` directory, because this declaration is specific to this i18next instance (not a global ambient type). Keeping it alongside the instance config makes the relationship obvious.

---

## Architectural Patterns

### Pattern 1: Module-Level i18next Init (Side-Effect Import)

**What:** i18next is initialized as a module-level side effect in `i18n.ts`, which is imported once at the top of `main.tsx` before `<App />` renders. The instance is synchronous for bundled resources — no `await`, no `Suspense` needed.

**When to use:** Always, for this app. Avoids the StrictMode double-render problem that affects approaches that call `i18n.init()` inside a `useEffect` or component body. Module-level init runs once, regardless of how many times React re-renders in development `StrictMode`.

**Trade-offs:** The i18next instance is a module singleton — correct for a single-user SPA, wrong for SSR (not applicable here).

```typescript
// frontend/src/i18n/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "tr"],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "flowboard.settings.v1.locale",
    },
  });

export default i18n;
```

```typescript
// frontend/src/main.tsx  (add these two lines)
import "./i18n/i18n";   // side-effect: init before render
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
);
```

**StrictMode note:** `I18nextProvider` and `initReactI18next` are safe with React 18 StrictMode. The init runs at module load time (not in render), so the StrictMode double-invocation of effects does not cause a double-init. The provider is a pure context setter — idempotent across double renders.

### Pattern 2: Zustand as Locale Bridge, i18next as Source of Truth

**What:** Locale state lives in two places with a clear ownership rule: i18next owns the runtime locale (what components render), the settings Zustand store mirrors the locale value for (a) displaying the selected language in `SettingsPanel` and (b) persisting it in the existing `flowboard.settings.v1` localStorage key.

**When to use:** Always. The alternative — Zustand as sole owner, with `useTranslation` reading from Zustand — would require wiring every component to both stores. The alternative — i18next as sole owner with no Zustand involvement — means the locale is persisted under i18next's own `i18nextLng` key, separate from the existing settings persistence, making Settings panel integration awkward.

**Ownership rule:** `setLocale()` in the settings store is the single call site for locale changes. It updates Zustand state, calls `i18n.changeLanguage()`, and persists. Nothing else calls `i18n.changeLanguage()` directly.

**Trade-offs:** Two sources means they can theoretically diverge (e.g. if `i18n.changeLanguage()` is called directly). Avoid this by never calling it outside `setLocale()` — enforced by convention, not a runtime guard.

```typescript
// frontend/src/store/settings.ts  (additions to existing store)
import i18n from "../i18n/i18n";

type Locale = "en" | "tr";

interface SettingsState {
  // ... existing fields
  locale: Locale;
  setLocale(l: Locale): void;
}

// Inside loadPersisted() — add locale field:
// locale?: Locale;

// Inside create():
locale: persisted.locale ?? detectInitialLocale(),
setLocale(l) {
  set({ locale: l });
  void i18n.changeLanguage(l);
  persist({ ...get(), locale: l }); // existing persist() call pattern
},
```

```typescript
// helper — reads i18next's resolved language at store init time
// so both are in sync on cold start
function detectInitialLocale(): Locale {
  const supported: Locale[] = ["en", "tr"];
  const detected = i18n.resolvedLanguage ?? navigator.language.split("-")[0];
  return supported.includes(detected as Locale) ? (detected as Locale) : "en";
}
```

**Why not use i18next-browser-languagedetector's own `lookupLocalStorage` as the sole persistence mechanism:** The existing settings store already persists to `flowboard.settings.v1`. Using i18next's own key (`i18nextLng`) would create a second localStorage entry outside the settings blob, making it invisible to anyone reading the settings key. Configuring `lookupLocalStorage: "flowboard.settings.v1.locale"` tells the detector to read from the same logical namespace but a dedicated key — acceptable. Alternatively, the detector is configured with `order: ["localStorage", "navigator"]` so on cold start it reads the previously-persisted value from the settings store's own key; the Zustand store then mirrors it. Pick one and be consistent: the recommended approach is to use `lookupLocalStorage` pointing at a dedicated key (`flowboard.i18n.locale`) and have `setLocale()` write to both the settings blob and this key.

### Pattern 3: useTranslation Hook as the Default; Trans Component for Inline Markup Only

**What:** Every component calls `const { t } = useTranslation()` at the top level. `t("key")` returns the translated string. The `Trans` component is used exclusively when a translation string embeds JSX (bold text, links, `<code>` tags) — roughly 2-3 occurrences in the entire Flowboard frontend.

**When to use:** `t()` for 95%+ of cases. `Trans` only when the string must contain rendered React elements, not just string interpolation. `Trans` is verbose and translation-file syntax for embedded elements is non-obvious for OSS contributors — minimize its use.

```tsx
// Standard — use for every plain string
const { t } = useTranslation();
return <button>{t("generate.submit")}</button>;

// Interpolation — still uses t(), not Trans
return <div>{t("node.variantCount", { count: variants.length })}</div>;

// Trans — only for embedded JSX elements
return (
  <Trans i18nKey="settings.communityLink">
    Join the <a href={COMMUNITY_URL}>community</a>
  </Trans>
);
```

---

## Data Flow

### Locale Change Flow

```
SettingsPanel locale dropdown → onChange
    ↓
useSettingsStore.setLocale("tr")
    ↓ (1) Zustand set({ locale: "tr" })        — SettingsPanel re-renders with new value
    ↓ (2) i18n.changeLanguage("tr")            — all useTranslation() consumers re-render
    ↓ (3) persist({ ..., locale: "tr" })       — survives reload via localStorage
    ↓ (4) i18n fires "languageChanged" event
    ↓
App.tsx useEffect (dep: i18n.resolvedLanguage)
    ↓
document.documentElement.lang = "tr"           — screen readers, CSS :lang(), SEO
```

### Cold Start (Returning User) Flow

```
Browser loads page
    ↓
main.tsx imports ./i18n/i18n.ts (module load)
    ↓
i18n.init() runs synchronously
LanguageDetector checks: localStorage["flowboard.i18n.locale"] = "tr"
i18n starts in "tr"
    ↓
settings store init: loadPersisted() reads locale: "tr" from flowboard.settings.v1
detectInitialLocale() returns "tr" (matches i18n.resolvedLanguage)
Zustand locale = "tr"
    ↓
<App /> renders; all t() calls return Turkish strings immediately
No flicker — no async load, no Suspense needed
```

### Cold Start (New User, Browser Language = Turkish) Flow

```
i18n.init() → LanguageDetector checks localStorage (miss) → checks navigator.language
navigator.language = "tr-TR" → LanguageDetector resolves "tr" → i18n starts in "tr"
detectInitialLocale() reads i18n.resolvedLanguage = "tr"
Zustand locale = "tr"
setLocale("tr") called once from store init to persist the detected locale
```

---

## Key File Specifications

### `frontend/src/i18n/i18n.ts`
Single i18next instance. Registers three plugins in order: `LanguageDetector`, `initReactI18next`. Calls `.init()` synchronously with bundled resources. Exports the instance for use in `main.tsx` and `store/settings.ts`.

### `frontend/src/i18n/i18next.d.ts`
Module augmentation only. No runtime code.

```typescript
import "i18next";
import type en from "./locales/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
```

`t("nonexistent.key")` becomes a TypeScript error. `t("generate.submit")` autocompletes. This requires TypeScript 5+ strict mode — already satisfied (the project is on TS 5.6).

### `frontend/src/i18n/locales/en.json`
Flat object. Top-level keys are UI area prefixes (not namespaces — just key naming convention). No nesting beyond one level for simple values; shallow nesting (max 2 levels) for grouped concepts.

```json
{
  "board.loading": "Loading board…",
  "board.untitled": "Untitled",
  "generate.submit": "Generate",
  "generate.cancel": "Cancel",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageLabel.en": "English",
  "settings.languageLabel.tr": "Türkçe"
}
```

**Key naming convention:** `<area>.<concept>` where area is the component directory or concern (`board`, `generate`, `settings`, `node`, `dialog`, `references`, `activity`, `toolbar`, `toaster`, `account`). No deep nesting — flat dotted keys are easier to search and compare across locale files.

### `frontend/src/i18n/locales/tr.json`
Identical key set to `en.json`. Missing keys fall back to English at runtime; the TypeScript augmentation does not enforce tr.json completeness (it types against en.json only), so completeness is enforced by convention and code review.

---

## Vite Integration

**No Vite plugin is needed.** Vite 5 treats JSON files as first-class ES module imports — `import en from "./locales/en.json"` works without configuration. HMR for JSON files works out of the box in Vite: editing `en.json` or `tr.json` during development triggers a hot module reload.

**Bundling:** Both locale files are included in the main bundle at build time. At 2-3 locales with ~300 keys each, the combined JSON payload is approximately 10-15 KB uncompressed, under 5 KB gzipped. Dynamic import / code splitting for locales is unnecessary complexity for this scale and would introduce Suspense requirements.

**TypeScript declarations:** No auto-generation needed. `i18next.d.ts` is hand-written once and updated when the key structure changes. The `typeof en` reference in the augmentation means TypeScript re-infers key types automatically whenever `en.json` changes — no code generation step.

---

## `<html lang>` Management

**Strategy:** DOM-managed via a `useEffect` in `App.tsx`. The attribute is not managed by React's virtual DOM (it lives outside `#root`) — direct DOM mutation is the correct approach.

```typescript
// frontend/src/App.tsx  (add inside App function)
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();
useEffect(() => {
  document.documentElement.lang = i18n.resolvedLanguage ?? "en";
}, [i18n.resolvedLanguage]);
```

**Baseline:** `frontend/index.html` currently has `<html lang="en">`. This static value is correct for the initial render. The `useEffect` updates it after React hydrates — for a Vite SPA with no SSR there is no hydration mismatch risk. The update is immediate (synchronous with the first render commit) because `i18n.resolvedLanguage` is populated before React renders when using the module-level init pattern.

**RTL:** Not applicable — Turkish is LTR. Do not add `dir` attribute logic in v1. The pattern is established here if a future RTL locale is contributed.

---

## Component Boundaries — What Touches i18n

| Area | Touches i18n? | Notes |
|------|---------------|-------|
| `frontend/src/main.tsx` | Yes — provider mount + import | One-time setup |
| `frontend/src/App.tsx` | Yes — lang attribute effect | 3-line addition |
| `frontend/src/store/settings.ts` | Yes — locale field + setLocale() | Owns locale persistence |
| `frontend/src/components/SettingsPanel.tsx` | Yes — locale picker UI | Add dropdown section |
| `frontend/src/canvas/Board.tsx` | Yes — UI strings | useTranslation() added |
| `frontend/src/canvas/NodeCard.tsx` | Yes — heaviest string density | useTranslation() added |
| `frontend/src/canvas/AddNodePalette.tsx` | Yes — button labels | useTranslation() added |
| `frontend/src/components/GenerationDialog.tsx` | Yes — largest single component | useTranslation() added |
| `frontend/src/components/ResultViewer.tsx` | Yes — overlay strings | useTranslation() added |
| `frontend/src/components/ProjectSidebar.tsx` | Yes — sidebar labels | useTranslation() added |
| `frontend/src/components/ReferencesPanel.tsx` | Yes — panel strings | useTranslation() added |
| `frontend/src/components/Toolbar.tsx` | Yes — toolbar buttons | useTranslation() added |
| `frontend/src/components/StatusBar.tsx` | Yes — status text | useTranslation() added |
| `frontend/src/components/ForcedSetupGate.tsx` | Yes — setup gate copy | useTranslation() added |
| `frontend/src/components/activity/*` | Yes — activity feed labels | useTranslation() added |
| `frontend/src/components/settings/*` | Yes — AI provider settings | useTranslation() added |
| `frontend/src/api/client.ts` | No | Backend stays English; `humanizeBackendError()` returns English strings — acceptable per project scope |
| `frontend/src/lib/storyboardPrompt.ts` | No | Pure logic, no UI strings |
| `frontend/src/constants/character.ts` | No | Tag values are data, not UI copy |
| Backend (`agent/`) | No | Explicitly out of scope |
| Extension (`extension/`) | No | Explicitly out of scope |

---

## Migration Build Order

The recommended order minimizes risk (keep English working throughout) and produces testable increments.

### Phase 1: Scaffolding (no string changes, no visible change to users)

1. Install: `npm install i18next react-i18next i18next-browser-languagedetector`
2. Create `frontend/src/i18n/i18n.ts` — empty resources `{ en: { translation: {} }, tr: { translation: {} } }`
3. Create `frontend/src/i18n/locales/en.json` — empty object `{}`
4. Create `frontend/src/i18n/locales/tr.json` — empty object `{}`
5. Create `frontend/src/i18n/i18next.d.ts` — module augmentation pointing at `en.json`
6. Update `frontend/src/main.tsx` — add import + `<I18nextProvider>` wrap
7. Update `frontend/src/store/settings.ts` — add `locale` field + `setLocale()`
8. Update `frontend/src/App.tsx` — add `useEffect` for `document.documentElement.lang`

**Checkpoint:** App boots, renders in English, no TypeScript errors, no behavioral change.

### Phase 2: English Catalog Extraction (English only, no Turkish yet)

Extract all hardcoded strings from JSX into `en.json`. Work directory by directory:

1. `frontend/src/canvas/` — Board.tsx, NodeCard.tsx, AddNodePalette.tsx
2. `frontend/src/components/GenerationDialog.tsx` + `ResultViewer.tsx` (largest components)
3. `frontend/src/components/ProjectSidebar.tsx`, `ReferencesPanel.tsx`, `Toolbar.tsx`, `StatusBar.tsx`
4. `frontend/src/components/ForcedSetupGate.tsx`, `SponsorDialog.tsx`, `AiProviderDialog.tsx`
5. `frontend/src/components/activity/*`
6. `frontend/src/components/settings/*`
7. `frontend/src/components/Toaster.tsx`, `AccountPanel.tsx`, `SettingsPanel.tsx`

For each file: replace `"hardcoded string"` with `t("area.key")`, add the key to `en.json`, add `const { t } = useTranslation()` at the component top.

**Checkpoint:** App renders identically in English. `en.json` has full coverage. TS compiler enforces key existence — any `t()` call with an unregistered key is a type error.

### Phase 3: Turkish Catalog + Locale Switcher

1. Copy `en.json` to `tr.json`, translate all values to Turkish
2. Add language picker dropdown to `SettingsPanel.tsx` (calls `setLocale()`)
3. Add locale to `i18n.ts` resources: `tr: { translation: tr }`
4. Verify `i18n.ts` detection order correctly reads from localStorage on reload

**Checkpoint:** Switch to Turkish, drive a full generation flow end-to-end, switch back. All English strings still intact.

### Phase 4: Polish

1. Handle any pluralization cases (i18next `_plural` suffix or `count` interpolation)
2. Audit any string that was skipped (error messages, empty states, `aria-label` values)
3. Freeze `en.json` key shape — document the "English is canonical" rule in a comment at the top of `i18n.ts`

---

## Anti-Patterns

### Anti-Pattern 1: Calling i18n.init() Inside a React Component or useEffect

**What people do:** `useEffect(() => { i18n.init({ ... }) }, [])` in `App.tsx`.
**Why it's wrong:** React 18 StrictMode double-invokes effects in development. The second invocation calls `init()` on an already-initialized instance, which logs warnings and may trigger re-renders. The fix is to move init to module scope.
**Do this instead:** Import `./i18n/i18n.ts` as a side-effect in `main.tsx`. Module-level code runs once.

### Anti-Pattern 2: Namespace Split at This Scale

**What people do:** `useTranslation('canvas')`, `useTranslation('settings')`, `useTranslation('dialogs')` with separate JSON files per namespace.
**Why it's wrong:** At <300 strings bundled statically, there is no load-time benefit. It adds `ns` declarations to `i18n.ts`, requires every component to know which namespace it belongs to, and makes OSS locale contributions harder (contributor must find the right file).
**Do this instead:** Single flat `translation` namespace. Use key prefixes (`canvas.`, `settings.`, `dialog.`) as naming convention without actual namespace splitting.

### Anti-Pattern 3: Zustand as the Source of Truth for Rendered Translations

**What people do:** Components read locale from Zustand and look up strings from a dictionary in the store.
**Why it's wrong:** React re-render propagation goes through Zustand subscription, not i18next's internal subscription. Components that don't subscribe to the locale field won't re-render on change. Results in partial UI updates.
**Do this instead:** Components use `useTranslation()` from react-i18next. Zustand holds locale as a mirror for persistence and the settings UI display only. i18next handles all re-render subscriptions.

### Anti-Pattern 4: Dynamic Import / HTTP Backend for 2 Locales

**What people do:** `i18next-http-backend` loading from `/public/locales/{{lng}}/translation.json` at runtime.
**Why it's wrong:** Adds a network request on every cold start. Requires `React.Suspense` fallback while translations load. Complicates Vite's build graph (files must be in `public/`, not `src/`). No benefit when the total locale payload is <5 KB gzipped.
**Do this instead:** Static JSON import at build time. Vite bundles both locale files into the main chunk. First render has translations available synchronously.

### Anti-Pattern 5: Hardcoded `document.documentElement.lang = "en"` in index.html as the Only Mechanism

**What people do:** Leave `<html lang="en">` static and never update it.
**Why it's wrong:** Screen readers announce the page language at load time and on navigation. If a Turkish user has set their preference, every page announces "English" — breaks accessibility.
**Do this instead:** Keep the static `lang="en"` in `index.html` as the correct initial value, and add the `useEffect` in `App.tsx` to update it on locale change.

---

## Packages

```bash
# Runtime dependencies
npm install i18next react-i18next i18next-browser-languagedetector

# No dev dependencies needed — TypeScript types are bundled
# i18next ships its own @types; no @types/i18next needed
```

Current versions as of 2026-06: i18next 24.x, react-i18next 15.x, i18next-browser-languagedetector 8.x. All support React 18, TypeScript 5, and the `CustomTypeOptions` augmentation pattern.

---

## Sources

- react-i18next official docs: https://react.i18next.com/latest/using-with-hooks
- react-i18next quick start: https://react.i18next.com/guides/quick-start
- i18next TypeScript docs: https://www.i18next.com/overview/typescript
- i18next namespace principles: https://www.i18next.com/principles/namespaces
- i18next-browser-languagedetector README: https://github.com/i18next/i18next-browser-languageDetector
- i18next translation loading: https://www.i18next.com/how-to/add-or-load-translations
- react-i18next TypeScript page: https://react.i18next.com/latest/typescript

---

*Architecture research for: Flowboard i18n integration*
*Researched: 2026-06-10*
