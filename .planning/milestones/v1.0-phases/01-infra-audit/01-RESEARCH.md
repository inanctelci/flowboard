# Phase 1: Infra + Audit — Research

**Researched:** 2026-06-10
**Domain:** react-i18next 17 + i18next 26 retrofit onto Vite 5 / React 18 / TypeScript 5.6 strict / Zustand 5 SPA
**Confidence:** HIGH — all package versions registry-verified; all code skeletons grounded in confirmed source files

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Dependency set: `react-i18next@^17.0.8`, `i18next@^26.3.1`, `i18next-browser-languagedetector@^8.0.0`. NO Lingui (Vite 5 incompatible at v6), NO FormatJS (overkill).
- Catalog layout: flat single-namespace JSON at `frontend/src/i18n/locales/en.json` and `tr.json`. No namespace splitting at v1.
- TypeScript safety: `CustomTypeOptions` declaration merging in `frontend/src/i18n/i18n.d.ts` pointing at `typeof en` so missing keys fail `tsc -b --noEmit`.
- Locale state: i18next is the rendering source of truth; Settings Zustand store has a `locale` mirror for the SettingsPanel picker (Phase 3). `setLocale()` in the store calls `i18n.changeLanguage()` internally — components never call `changeLanguage` directly.
- localStorage key: dedicated `flowboard.i18n.locale` (NOT extended into the existing settings blob).
- Init mode: synchronous module-scope `i18n.init()` with bundled (not HTTP) catalogs to avoid first-paint flicker.
- Provider placement: import `./i18n/i18n.ts` for side effect FIRST in `main.tsx`, then wrap `<App />` with `<I18nextProvider>`. StrictMode-safe because init runs at module load, not in an effect.

### Claude's Discretion

- Exact rewritten copy for `formatRelativeTime` English keys (e.g., `time.just_now` = "just now", `time.minutes_ago` = "{{count}} min ago", `time.hours_ago` = "{{count}} hr ago", `time.days_ago` = "{{count}} d ago", fallback uses `Intl.DateTimeFormat(currentLocale).format(date)` instead of `toLocaleDateString("vi-VN")`). Planner picks final wording.
- Whether to use i18next's native plural-suffix (`time.minutes_ago_one` / `time.minutes_ago_other`) or `{{count}}` interpolation alone for the relative-time strings. Either works — recommend `_one`/`_other` so the convention is established early.
- Method for fixing `humanizeBackendError` dotted-i: prefer `token.toLocaleLowerCase("en-US")` (locale-explicit) over locale-invariant manual lookup. Cheaper and reads correctly.
- Whether the i18n init file uses `react-i18next`'s `initReactI18next` plugin alone or also chains `LanguageDetector`. Required by SWITCH-01 in Phase 3, but adding it now (in Phase 1) is safe.
- Initial locale fallback chain. Recommended: `fallbackLng: "en"`, `supportedLngs: ["en", "tr"]`, `lng` resolved by LanguageDetector (localStorage → navigator → en).

### Deferred Ideas (OUT OF SCOPE)

- `i18next-parser` automation — V2-AUTO-EXTRACT in REQUIREMENTS.md
- Automated parity CI between en.json and tr.json — V2-PARITY-CI
- `aria-live` announcement on language change — V2-ARIA-LIVE
- CSS logical properties audit — V2-LOGICAL-CSS

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | `react-i18next@^17` + `i18next@^26` + `i18next-browser-languagedetector@^8` initialized at module scope in `frontend/src/i18n/i18n.ts` before React renders | See `i18n.ts` skeleton below; side-effect import in main.tsx before createRoot |
| INFRA-02 | Missing translation keys fall back to English | `fallbackLng: "en"` in i18n.init() config |
| INFRA-03 | `tsc -b --noEmit` errors on `t('missing.key')` via `CustomTypeOptions` in `i18n.d.ts` | See `i18n.d.ts` skeleton; `resolveJsonModule: true` already in tsconfig |
| INFRA-04 | Locale state in i18next as source of truth; mirror in Settings Zustand store | See settings store diff below; `setLocale()` is the only call site for `changeLanguage()` |
| INFRA-05 | Chosen locale persists across reloads via localStorage under `flowboard.i18n.locale` | LanguageDetector `lookupLocalStorage: "flowboard.i18n.locale"` + `caches: ["localStorage"]` |
| INFRA-06 | No first-paint flicker; all catalogs bundled; `i18n.init()` runs synchronously at module load | Static `import en from "./locales/en.json"` — no HTTP backend, no Suspense |
| INFRA-07 | Catalog files at `frontend/src/i18n/locales/en.json` and `tr.json` flat single-namespace | Directory scaffold; Phase 1 creates minimal stubs with bug-fix keys only |
| BUGS-01 | `formatRelativeTime` in `ResultViewer.tsx` lines 60-72 rewritten with i18n keys | See formatRelativeTime skeleton below; function is in a React component so `useTranslation()` is available |
| BUGS-02 | `humanizeBackendError` in `client.ts:19` uses locale-safe case conversion | Change `token.toLowerCase()` to `token.toLocaleLowerCase("en-US")` — one line diff |
| BUGS-03 | `index.html` ships `lang="en"`; `App.tsx` effect updates `document.documentElement.lang` | See App.tsx lang-effect skeleton below |

---

## 1. Phase Goal Restated

Phase 1 wires the i18n infrastructure into the Vite/React frontend and fixes three live bugs that block correct multi-locale behaviour. The deliverables are: the packages installed, `frontend/src/i18n/i18n.ts` initialised at module scope, `frontend/src/i18n/i18n.d.ts` giving TypeScript typed-key enforcement, minimal `en.json` and `tr.json` stubs containing only the bug-fix strings, the Settings Zustand store extended with `locale` + `setLocale()`, a `useEffect` in `App.tsx` keeping `document.documentElement.lang` current, `formatRelativeTime` in `ResultViewer.tsx` rewritten using i18n keys, the dotted-i bug fixed in `client.ts`, and a `STRING-INVENTORY.md` document cataloguing all non-obvious string sites for Phase 2's extraction work. After Phase 1 the app renders identically in English — zero behavioural change for existing users.

---

## 2. Locked Decisions Inherited

From `research/SUMMARY.md` and `01-CONTEXT.md` — do not re-litigate:

| Decision | Source |
|----------|--------|
| `react-i18next@^17.0.8` + `i18next@^26.3.1` + `i18next-browser-languagedetector@^8.0.0` | SUMMARY.md §Must Decide Now |
| Flat single-namespace JSON (`translation` namespace); no splitting | SUMMARY.md §Catalog layout; ARCHITECTURE.md |
| `CustomTypeOptions` augmentation in `i18n.d.ts` pointing at `typeof en` | STACK.md §TypeScript Strict Key Safety |
| `flowboard.i18n.locale` as the dedicated localStorage key for LanguageDetector | SUMMARY.md §localStorage key |
| i18next is rendering source of truth; Zustand mirrors for SettingsPanel | ARCHITECTURE.md §Pattern 2 |
| Static JSON imports (bundled), NOT `i18next-http-backend` | PITFALLS.md §Pitfall 6 |
| `setLocale()` in the store is the ONLY call site for `i18n.changeLanguage()` | ARCHITECTURE.md §Ownership rule |
| Product/model names (`Veo 3.1 Lite`, `Nano Banana Pro`, etc.) stay in `constants/`, never in locale JSON | SUMMARY.md §Untranslatable boundary |
| No `useTranslation()` hook in `.ts` files — use `i18n.t()` singleton | PITFALLS.md §Pitfall 5 |
| No dynamic key construction (`t(\`prefix.${variable}\`)`) | PITFALLS.md §Pitfall 3 |

---

## 3. Dependency Install Plan

### Verified Package Versions [VERIFIED: npm registry]

| Package | Registry Latest | Constraint to Install | peerDeps |
|---------|-----------------|----------------------|----------|
| `react-i18next` | 17.0.8 | `^17.0.8` | `i18next >= 26.2.0`, `react >= 16.8.0`, `typescript ^5\|\|^6` |
| `i18next` | 26.3.1 | `^26.3.1` | `typescript ^5\|\|^6` |
| `i18next-browser-languagedetector` | 8.2.1 | `^8.0.0` | none |

All three peer deps are satisfied by the current project: `react@18.3.1`, `typescript@5.6.2`, and the packages are installed together so i18next satisfies react-i18next's peer dep.

**No conflicts** with `@xyflow/react@12.3.5`, `zustand@5.0.0`, or `vite@5.4.9`. No Vite plugin required. `i18next` ships its own TypeScript types — no `@types/i18next` needed.

All three packages go into `"dependencies"` (not `devDependencies`) — they are runtime libraries that ship with the browser bundle.

### Exact Install Command

Run from `frontend/` directory:

```bash
npm install react-i18next@^17.0.8 i18next@^26.3.1 i18next-browser-languagedetector@^8.0.0
```

No `--save-dev`. No additional Vite plugin. No Babel transform. No changes to `vite.config.ts` or `tsconfig.json` — `resolveJsonModule: true` is already present in `frontend/tsconfig.json:14`.

---

## 4. Implementation Approach

Build order is sequenced so the app remains runnable at each step. Never leave TypeScript errors between commits.

### Step 1 — Directory scaffold

Create:
- `frontend/src/i18n/` (new directory)
- `frontend/src/i18n/locales/` (new directory)
- `frontend/src/i18n/locales/en.json` — minimal stub (bug-fix keys only, see Section 5)
- `frontend/src/i18n/locales/tr.json` — empty-but-typed stub (matching keys, empty strings, see Section 5)
- `frontend/src/i18n/i18n.ts` — the init file (see skeleton in Section 5)
- `frontend/src/i18n/i18n.d.ts` — the TypeScript augmentation (see skeleton in Section 5)

**Why this order first:** TypeScript strict mode will error on any `t()` call whose return type is `any` until `i18n.d.ts` exists. Creating the scaffold before editing existing files prevents cascading type errors.

### Step 2 — Wire provider in `main.tsx`

Add two lines to `frontend/src/main.tsx` (confirmed current content at lines 1-11):

```typescript
// Line 1 of new additions — side-effect import BEFORE App:
import "./i18n/i18n";
// Line 2 — bring in the provider and the configured instance:
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
```

Wrap `<App />` with `<I18nextProvider i18n={i18n}>` inside `<React.StrictMode>`.

**StrictMode note:** Safe. `i18n.init()` runs at module load (Step 1 file import), not inside a React effect. The double-invocation StrictMode does in dev does not cause a double-init.

### Step 3 — Add `locale` + `setLocale()` to the Settings store

Edit `frontend/src/store/settings.ts`. The current store uses a manual `loadPersisted()` / `persist()` pattern under key `flowboard.settings.v1`. The locale lives in a SEPARATE key `flowboard.i18n.locale`. See the exact diff in Section 5.

**Ordering invariant:** `i18n.ts` must be importable from `settings.ts` without creating a circular dependency. Because `settings.ts` imports from `../i18n/i18n`, and `i18n.ts` imports nothing from `store/`, there is no cycle. Confirm after writing.

### Step 4 — Add `html lang` effect to `App.tsx`

Add `useTranslation` import and a `useEffect` inside the `App` function body. See exact skeleton in Section 5. This is a 5-line addition to the existing `App.tsx`.

### Step 5 — Fix BUGS-01: rewrite `formatRelativeTime` in `ResultViewer.tsx`

`formatRelativeTime` is defined at lines 60-72 of `frontend/src/components/ResultViewer.tsx`. It is a plain function inside the component file, called from the JSX at line 657 (`{formatRelativeTime(data?.renderedAt)}`). Because it is inside a `.tsx` file and referenced from a React component, it can use `useTranslation()` — but the cleanest approach is to convert it to accept `t` and `resolvedLanguage` as parameters and call it from inside the component where `useTranslation()` is available. See skeleton in Section 5.

### Step 6 — Fix BUGS-02: `toLocaleLowerCase("en-US")` in `client.ts`

One-line change at `frontend/src/api/client.ts` line 19. See exact diff in Section 5.

### Step 7 — Verify TypeScript and dev server

```bash
cd frontend && npm run lint   # must exit 0
npm run dev                   # app must load in browser with no console errors
```

Open DevTools → Application → Local Storage. Set `flowboard.i18n.locale = "tr"`, hard reload. App must render with English fallback (tr.json has empty values; fallback is English). No crash, no `t("key.name")` raw key visible in UI.

### Step 8 — Write `STRING-INVENTORY.md`

Create `.planning/phases/01-infra-audit/STRING-INVENTORY.md`. Populate it using the grep commands described in Section 6. This document is the Phase 2 input — do not skip it.

---

## 5. Canonical Code Skeletons

### 5.1 `frontend/src/i18n/i18n.ts`

```typescript
/**
 * i18n.ts — i18next singleton for Flowboard.
 *
 * Import this file as a side effect in main.tsx BEFORE <App /> renders:
 *   import "./i18n/i18n";
 *
 * Rules:
 *  - All locale changes go through useSettingsStore.setLocale() — never
 *    call i18n.changeLanguage() directly from components.
 *  - In React components: const { t } = useTranslation()
 *  - In .ts store actions / utilities: import i18n from "../i18n/i18n"; i18n.t(...)
 *  - Never use dynamic key construction: t(`prefix.${variable}`) breaks static analysis.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

// ── Synchronous locale detection ──────────────────────────────────────────────
// Read the persisted locale BEFORE i18n.init() resolves so the first render
// is in the correct language — no flash. LanguageDetector handles this via
// the detection.order config below, but reading it here also lets the
// Zustand settings store mirror the value at init time without an async gap.
const SUPPORTED = ["en", "tr"] as const;
type Locale = (typeof SUPPORTED)[number];

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem("flowboard.i18n.locale");
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // localStorage may be disabled; fall through to navigator
  }
  const nav = (navigator.language ?? navigator.languages?.[0] ?? "en")
    .split("-")[0]
    .toLowerCase();
  return (SUPPORTED as readonly string[]).includes(nav) ? (nav as Locale) : "en";
}

// ── Init ──────────────────────────────────────────────────────────────────────
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: detectInitialLocale(),  // synchronous; prevents cold-start flash
    fallbackLng: "en",
    supportedLngs: ["en", "tr"],
    interpolation: {
      escapeValue: false,        // React already escapes — double-escaping breaks HTML entities
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "flowboard.i18n.locale",
      caches: ["localStorage"],
    },
  });

// ── Vite HMR — keep running app in sync when locale JSON is edited in dev ─────
if (import.meta.hot) {
  import.meta.hot.accept(
    ["./locales/en.json", "./locales/tr.json"],
    ([newEn, newTr]) => {
      if (newEn) i18n.addResourceBundle("en", "translation", newEn.default, true, true);
      if (newTr) i18n.addResourceBundle("tr", "translation", newTr.default, true, true);
    },
  );
}

export default i18n;
export type { Locale };
```

**Key decisions embedded in this skeleton:**
- `lng: detectInitialLocale()` — synchronous read prevents the "returns English then flashes Turkish" race.
- `LanguageDetector` chained even in Phase 1 — it is needed for SWITCH-01 (Phase 3) and costs nothing now. The explicit `lng:` prop wins over the detector on first load; detector is used on subsequent page loads.
- HMR handler — without this, editing `en.json` during development requires a full page reload to see changes. The `addResourceBundle` with `true, true` (deep merge + overwrite) matches Vite's "replace the module" semantics.
- `escapeValue: false` — React JSX already escapes user content; letting i18next double-escape would render `&amp;` in translated strings.

### 5.2 `frontend/src/i18n/i18n.d.ts`

```typescript
/**
 * i18n.d.ts — TypeScript module augmentation for i18next typed keys.
 *
 * This file teaches TypeScript the shape of en.json so that:
 *   t("missing.key")         → compile error
 *   t("time.just_now")       → ✓ autocomplete
 *
 * The augmentation points at `typeof en` from en.json. TypeScript
 * re-infers key types automatically whenever en.json changes — no
 * code generation step is needed.
 *
 * Only English (the reference locale) is used here. tr.json key
 * completeness is enforced by convention and code review, not by
 * the type system (the TS types describe en.json's shape, and
 * missing tr.json keys fall back to English at runtime).
 */
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

**Why it works:** `resolveJsonModule: true` in `frontend/tsconfig.json` (confirmed at line 14) makes TypeScript infer a precise type from `en.json`'s structure. Every top-level key becomes a literal type. `CustomTypeOptions` is the official i18next 26 extension point for this pattern. The `declare module "i18next"` augmentation must be in a file that TypeScript includes — `frontend/src/i18n/` is under `"include": ["src"]` in `tsconfig.json`, so this file is picked up automatically.

**Limitation:** The typed-key check covers only keys that exist in `en.json` at compile time. If Phase 2 adds new keys to `en.json` without adding corresponding `t("new.key")` calls, there is no compile error (the key exists). The inverse — calling `t("new.key")` before the key is in `en.json` — IS a compile error. This is the correct direction for enforcement.

### 5.3 `frontend/src/i18n/locales/en.json` (Phase 1 minimal stub)

Phase 1 only needs the keys required by the `formatRelativeTime` rewrite (BUGS-01). Phase 2 adds everything else. The `_one` / `_other` plural convention is established here so Phase 2 knows the pattern.

```json
{
  "time.just_now": "just now",
  "time.seconds_ago_one": "{{count}}s ago",
  "time.seconds_ago_other": "{{count}}s ago",
  "time.minutes_ago_one": "{{count}} min ago",
  "time.minutes_ago_other": "{{count}} min ago",
  "time.hours_ago_one": "{{count}} hr ago",
  "time.hours_ago_other": "{{count}} hr ago",
  "time.days_ago_one": "{{count}} d ago",
  "time.days_ago_other": "{{count}} d ago"
}
```

Note: English `_one` and `_other` have identical values here. That is intentional — English distinguishes "1 min ago" vs "5 min ago" only via the count itself, not via different key suffix. The `_one`/`_other` split is for other locales (Turkish is also identical; a hypothetical Russian locale would differ). The convention is established now so Phase 2 adopters copy the pattern.

### 5.4 `frontend/src/i18n/locales/tr.json` (Phase 1 stub)

```json
{
  "time.just_now": "",
  "time.seconds_ago_one": "",
  "time.seconds_ago_other": "",
  "time.minutes_ago_one": "",
  "time.minutes_ago_other": "",
  "time.hours_ago_one": "",
  "time.hours_ago_other": "",
  "time.days_ago_one": "",
  "time.days_ago_other": ""
}
```

Empty string values cause i18next to fall back to English at runtime (the fallback triggers on empty strings when `fallbackLng: "en"` is configured). This is the correct Phase 1 behaviour — Turkish users see English relative-time labels until Phase 3 supplies Turkish values.

### 5.5 `frontend/src/main.tsx` — updated file

The current `main.tsx` (confirmed at lines 1-11) becomes:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
// i18n side-effect import MUST precede App. Module load order in ES modules
// is top-to-bottom within the same file; this guarantees i18n.init() runs
// synchronously before <App /> renders, eliminating first-paint flicker.
import "./i18n/i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
import { App } from "./App";
import "@xyflow/react/dist/style.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
);
```

**Why `I18nextProvider` and not just relying on `initReactI18next`:** `initReactI18next` registers the global default i18next instance, which means `useTranslation()` calls work without an explicit provider. Adding `<I18nextProvider i18n={i18n}>` makes the instance explicit and future-proof — if the project ever needs SSR or testing with a mock i18n instance, the provider is the right hook point. Cost is zero; DX is better.

### 5.6 `frontend/src/store/settings.ts` — exact diff

The current store (confirmed by reading the file) uses `STORAGE_KEY = "flowboard.settings.v1"` and a `PersistShape` interface. The locale gets its own dedicated key `"flowboard.i18n.locale"` as a sibling, NOT nested into `PersistShape`.

**Add after the existing imports:**

```typescript
import i18n, { type Locale } from "../i18n/i18n";
```

**Add to the `SettingsState` interface** (after `omniFlashDuration: OmniFlashDuration`):

```typescript
  locale: Locale;
  setLocale(l: Locale): void;
```

**Add a new constant** (after `const STORAGE_KEY = "flowboard.settings.v1";`):

```typescript
const LOCALE_KEY = "flowboard.i18n.locale";

function loadPersistedLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "en" || stored === "tr") return stored;
  } catch { /* ignore */ }
  // Mirror whatever i18next already resolved at module load time.
  // i18n.ts runs before this store module, so resolvedLanguage is populated.
  const resolved = i18n.resolvedLanguage;
  if (resolved === "en" || resolved === "tr") return resolved;
  return "en";
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch { /* ignore */ }
}
```

**Add initial value** in `create<SettingsState>((set, get) => ({`:

```typescript
  locale: loadPersistedLocale(),
```

**Add action** in `create<SettingsState>((set, get) => ({`:

```typescript
  setLocale(l) {
    set({ locale: l });
    persistLocale(l);
    void i18n.changeLanguage(l);
    // NOTE: do NOT call the existing persist() here — locale lives in its
    // own key (flowboard.i18n.locale), not in the settings blob. Keeping
    // them separate means LanguageDetector can read the locale key directly
    // without deserializing the whole settings JSON.
  },
```

**Ordering invariant to verify:** `loadPersistedLocale()` reads `i18n.resolvedLanguage` as a fallback. This is safe because `i18n.ts` is imported in `main.tsx` before any React renders, so by the time any Zustand store module is first imported by a component, `i18n.resolvedLanguage` is already set. The store module itself is not imported in `main.tsx` before the i18n import — confirm by re-reading the import order in `main.tsx` after editing.

### 5.7 `frontend/src/App.tsx` — `html lang` effect

Add to the `App` function body, immediately after the existing `useRef(false)` line (current line 23). The `useEffect` must be above the early-return, but there is no early return in `App.tsx` — the entire component renders unconditionally.

**New imports to add** at the top of `App.tsx`:

```typescript
import { useTranslation } from "react-i18next";
```

**New code inside the `App` function body**, after the existing `useRef` declarations:

```typescript
  // BUGS-03: Keep <html lang> in sync with the active locale.
  // document.documentElement is outside the React tree (#root) — direct
  // DOM mutation is correct here. i18n.resolvedLanguage is set synchronously
  // before first render (module-scope init in i18n.ts), so the initial
  // render already has the right value; the effect handles subsequent changes.
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);
```

**Why `resolvedLanguage` not `language`:** `i18n.language` can be `"tr-TR"` (the full BCP 47 tag from the browser). `i18n.resolvedLanguage` is the matched supported language — always `"en"` or `"tr"` for this config. Using `resolvedLanguage` in the `lang` attribute is correct; using the raw `language` might set `lang="tr-TR"` which is valid HTML but inconsistent with the two-letter tag elsewhere.

**Why not `i18n.on('languageChanged', ...)`:** The `useEffect` with `[i18n.resolvedLanguage]` dependency is idiomatic React and automatically cleaned up on component unmount. The event listener approach works but requires manual cleanup in the return function and is less readable. The `useEffect` approach is the standard react-i18next pattern.

### 5.8 `formatRelativeTime` rewrite (BUGS-01)

**Current code** (`frontend/src/components/ResultViewer.tsx` lines 57-73, confirmed by reading):

```typescript
/** Format an ISO timestamp as a Vietnamese relative time string —
 *  "vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước". Falls
 *  back to "—" when the timestamp is missing or unparseable. */
function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return "vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(t).toLocaleDateString("vi-VN");
}
```

**The function is called from inside the `ResultViewer` React component** at line 657:
```tsx
<dd>{formatRelativeTime(data?.renderedAt)}</dd>
```

`ResultViewer` already calls `useTranslation()` elsewhere (after Phase 1 adds it). The cleanest rewrite makes `formatRelativeTime` a pure function that accepts `t` and `resolvedLanguage` as parameters — this keeps it testable and avoids calling hooks inside a non-hook function.

**Add to the imports at the top of `ResultViewer.tsx`:**
```typescript
import { useTranslation } from "react-i18next";
```

**Replace the function definition** (lines 57-73):

```typescript
/** Format an ISO timestamp as a relative time string using the active locale.
 *  Returns "—" when the timestamp is missing or unparseable.
 *
 *  Pass `t` (from useTranslation) and `resolvedLanguage` (from i18n) as
 *  parameters so the function remains a pure utility — no hook calls inside. */
function formatRelativeTime(
  iso: string | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
  resolvedLanguage: string,
): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const diffSec = Math.max(0, (Date.now() - ts) / 1000);
  if (diffSec < 60) return t("time.just_now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("time.minutes_ago", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("time.hours_ago", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("time.days_ago", { count: diffDay });
  // Long-form date: use the active locale so a Turkish user sees a
  // Turkish-formatted date instead of the hardcoded vi-VN locale.
  return new Intl.DateTimeFormat(resolvedLanguage).format(new Date(ts));
}
```

**Add to the `ResultViewer` function body** (near other hooks at the top, before the early return at line 277):

```typescript
  const { t, i18n } = useTranslation();
```

**Update the call site** (line 657):

```tsx
<dd>{formatRelativeTime(data?.renderedAt, t, i18n.resolvedLanguage ?? "en")}</dd>
```

**Why pass `t` as a parameter rather than calling `useTranslation()` inside the function:** `formatRelativeTime` is a plain function, not a React component or custom hook. Calling `useTranslation()` inside it would violate React's Rules of Hooks (hooks must be called at the top level of a React function). The parameter-passing pattern is idiomatic.

**i18next plural resolution for `_one`/`_other`:** When calling `t("time.minutes_ago", { count: diffMin })`, i18next automatically selects `time.minutes_ago_one` (when `count === 1`) or `time.minutes_ago_other` (when `count !== 1`) based on the `count` interpolation variable. This is the standard i18next plural suffix convention. No additional configuration is needed — it is the default behaviour for `supportedLngs: ["en", "tr"]`.

### 5.9 `humanizeBackendError` dotted-i fix (BUGS-02)

**Current code** (`frontend/src/api/client.ts` line 19, confirmed by reading):

```typescript
  const t = token.toLowerCase();
```

**Replacement:**

```typescript
  const t = token.toLocaleLowerCase("en-US");
```

**Why this is correct:** `String.prototype.toLocaleLowerCase(locale)` is part of the ECMAScript Internationalization API (ECMA-402), which has been supported in V8 (Chromium/Node.js), SpiderMonkey (Firefox), and JavaScriptCore (Safari/WebKit) since 2014. [CITED: https://tc39.es/ecma402/#sec-string.prototype.tolocalelowercase] The `"en-US"` locale argument forces ASCII-safe case folding (`I` → `i`, `A` → `a`, etc.) regardless of the browser's current UI locale. In a Turkish browser where `navigator.language = "tr-TR"`, bare `.toLowerCase()` uses the system locale and maps `I` → `ı` (dotless i), which breaks `t.startsWith("public_error_")` when the backend token contains an uppercase `I`.

**Verification of downstream matches after the fix:**
- `t === "paygate_tier_unknown"` — all lowercase ASCII, no I; unaffected.
- `t === "no_media_id_in_upload_response"` — all lowercase ASCII; unaffected.
- `t.includes("captcha_failed: no current window")` — all lowercase ASCII; unaffected.
- `t.startsWith("captcha_failed:")` — all lowercase ASCII; unaffected.
- `t.startsWith("public_error_")` — `P`, `U`, `B`, `L`, `I`, `C` could appear uppercase in the backend token. With `toLocaleLowerCase("en-US")` they all fold to ASCII lowercase correctly, and the `startsWith("public_error_")` check succeeds.

**No other downstream callers of `humanizeBackendError` are affected** — the function is called only from `extractErrorMessage` (confirmed by reading `client.ts`).

---

## 6. String Inventory Schema

Phase 2 consumes `STRING-INVENTORY.md`. The executor needs a machine-readable-enough format to iterate deterministically without re-discovering strings from scratch.

### Recommended Schema

A markdown table per source file section. Each row is one translatable site.

```markdown
## [File path]

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 65 | "Upload" | `node.upload` | text-node | Button label |
| 170 | "Replace character image" | `node.replace_char_image` | aria-label | aria-label attr |
| 189 | "Save this character..." | `node.save_to_library_title` | title-attr | tooltip |
| 192 | "Save to library" | `node.save_to_library` | aria-label | button aria-label |
```

### Column Definitions

| Column | Type | Description |
|--------|------|-------------|
| `Line(s)` | number or range | Source file line number(s); helps executor find the site without a grep |
| `Current string` | string | Verbatim current hardcoded string (truncated to 60 chars with `…`) |
| `Key proposal` | `area.concept` | Proposed i18n key in `area.concept` dot-notation; executor can override |
| `Kind` | enum | `text-node`, `aria-label`, `title-attr`, `placeholder`, `store-error`, `utility-fn`, `toaster-msg`, `activity-label`, `error-humanizer`, `do-not-translate` |
| `Notes` | string | Free text: "do NOT translate — product name", "user-authored data", "Phase 3 content", etc. |

### Kind Enum Values

| Kind | Meaning |
|------|---------|
| `text-node` | JSX text node: `<span>Text</span>` |
| `aria-label` | `aria-label="..."` prop |
| `title-attr` | `title="..."` prop (tooltip) |
| `placeholder` | `placeholder="..."` prop |
| `store-error` | String set on a Zustand store `error` slot |
| `utility-fn` | String returned by a pure `.ts` function |
| `toaster-msg` | String that flows to the Toaster component |
| `activity-label` | String in `activity-meta.ts` label/status tables |
| `error-humanizer` | Branch return value in `humanizeBackendError` |
| `do-not-translate` | Product name, model name, brand identifier, user-authored data — never enters catalog |

### Phase 2 Consumption Contract

Phase 2 executes file-by-file in order of `String Density` (files with most rows first). For each row:
1. If `Kind = do-not-translate` — add a code comment marking the boundary; skip.
2. Otherwise — add `Key proposal` to `en.json`, wrap the string with `t("key.proposal")` or `aria-label={t("key.proposal")}` etc. appropriate for the Kind.
3. `const { t } = useTranslation()` goes at the top of any React component touched.
4. For `store-error`, `utility-fn`, `error-humanizer` — use `import i18n from "../i18n/i18n"; i18n.t("key")`.

---

## 7. Verification Checklist

Each item maps to a Phase 1 success criterion. Run in order.

### V1: `npm run lint` passes

```bash
cd frontend && npm run lint
# Expected: exit 0, no output
```

Checks that:
- All new TypeScript is valid
- `i18n.d.ts` augmentation compiles correctly with `en.json`'s current key shape
- No unused variables (strict mode has `noUnusedLocals: true`)
- No `t("nonexistent.key")` calls — any such call is now a compile error

### V2: Dev server starts without console errors

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`. Expected:
- App loads and renders identically to pre-Phase-1 state in English
- Browser DevTools console shows zero errors or warnings
- No raw i18n key strings visible in the UI (e.g. `"time.just_now"`)

### V3: localStorage `tr` cold start — English fallback

Open DevTools → Application → Local Storage → `http://localhost:5173`. Set `flowboard.i18n.locale` to `tr`. Hard reload (Cmd+Shift+R / Ctrl+Shift+R).

Expected:
- App renders in English (tr.json values are all empty strings → fallback to English)
- Relative time in ResultViewer metadata grid shows English strings (e.g. "5 min ago"), NOT Vietnamese
- No crash, no blank fields where translated strings should appear
- DevTools → Elements → `<html>` shows `lang="tr"` (BUGS-03 fix confirmed)

### V4: ResultViewer shows English relative-time (BUGS-01 verified)

Open any board with a generated node. Open ResultViewer. Check the `time` row in the METADATA section.

Expected:
- Shows English: "just now", "3 min ago", "2 hr ago", "1 d ago", or a locale-formatted date
- Does NOT show Vietnamese: "vừa xong", "phút trước", "giờ trước", "ngày trước"
- Does NOT show `toLocaleDateString("vi-VN")` formatted output (Vietnamese date format uses `/` separators and Vietnamese month abbreviations)

### V5: BUGS-02 dotted-i fix verified

Enable a tr-TR browser locale using DevTools:
- DevTools → More tools → Sensors → Locale override → `tr-TR`
- Hard reload

Trigger a `PUBLIC_ERROR_UNSAFE_GENERATION` backend error. In production-like usage, this can also be simulated by verifying in the browser console:

```javascript
// Paste in DevTools console to verify the fix:
const token = "PUBLIC_ERROR_UNSAFE_GENERATION";
console.log(token.toLocaleLowerCase("en-US")); // must be "public_error_unsafe_generation"
console.log(token.toLowerCase());              // in tr-TR locale, also "public_error_unsafe_generation" for THIS token (no I present)
// More critical test — a token that CONTAINS uppercase I:
const t2 = "CAPTCHA_FAILED: NO INTERNAL WINDOW";
console.log(t2.toLocaleLowerCase("en-US"));    // "captcha_failed: no internal window"
console.log(t2.toLowerCase());                 // in tr-TR: "captcha_faıled: no ınternal wındow" (dotless ı)
```

Expected: `t.startsWith("captcha_failed:")` matches correctly with the fix; bare `.toLowerCase()` would have failed.

### V6: `document.documentElement.lang` updates (BUGS-03 verified)

1. Load the app with no locale stored (clear localStorage for the origin).
2. DevTools → Elements → inspect `<html>` element.
3. Expected: `lang="en"` immediately on load (from `index.html` static attribute, unchanged).
4. Set `flowboard.i18n.locale = "tr"` in localStorage. Hard reload.
5. Expected: `lang="tr"` — the `useEffect` in `App.tsx` updated it.

### V7: `STRING-INVENTORY.md` exists and is non-trivial

```bash
ls -la /path/to/repo/.planning/phases/01-infra-audit/STRING-INVENTORY.md
# Must exist and have content
wc -l /path/to/repo/.planning/phases/01-infra-audit/STRING-INVENTORY.md
# Expect > 100 lines (the "invisible 40%" has many sites)
```

Open the file. Verify it covers at minimum:
- `frontend/src/canvas/NodeCard.tsx` — aria-labels at lines 170, 189, 192
- `frontend/src/api/client.ts` — all 4 `humanizeBackendError` branch strings
- `frontend/src/store/generation.ts` — store error string at ~line 170
- `frontend/src/components/activity/activity-meta.ts` — ACTIVITY_TYPE_META labels
- `frontend/src/components/Toaster.tsx` — aria-label at line 58
- Product/model names in `frontend/src/constants/character.ts` marked `do-not-translate`

---

## 8. Pitfalls

### P1: StrictMode double-render — i18n.init() at module scope, not in an effect

React 18 StrictMode in development double-invokes effects and component renders. If `i18n.init()` is placed in a `useEffect` in `App.tsx` or `main.tsx`, it will be called twice in development mode. The second call on an already-initialised instance logs warnings and may cause inconsistent state.

**Prevention:** The skeleton in Section 5.1 runs `i18n.init()` at module load time via the top-level call chain `i18n.use(...).use(...).init(...)`. Module-level code runs exactly once regardless of StrictMode. Confirmed safe pattern per react-i18next official documentation.

**Detection:** If you see console warnings like `i18next: init called after already initialised`, the init was placed in a React effect. Move it to module scope.

### P2: LanguageDetector race condition — `lng` option must be set

The `detectInitialLocale()` function in `i18n.ts` reads `localStorage` synchronously and returns the stored locale (or falls back to navigator). Passing this as `lng: detectInitialLocale()` to `i18n.init()` means the instance starts in the correct locale before any React render occurs. Without this, the LanguageDetector resolves asynchronously after init, causing a brief English render followed by a re-render in the user's locale — visible flash.

**Detection:** On hard reload with `flowboard.i18n.locale = "tr"` in localStorage, the app should load directly in `tr` (English fallback visible, but NO English-then-Turkish flash). If there is a flash, `lng` is not being set.

### P3: Vite HMR of locale JSON — requires explicit `import.meta.hot.accept`

Vite natively hot-reloads JSON file changes. However, the i18next instance is initialised at module scope with the JSON values at load time — Vite's HMR replaces the JSON module but cannot retroactively update the already-initialised resource bundle. Without the `import.meta.hot.accept` handler in `i18n.ts` (included in the skeleton in Section 5.1), editing `en.json` or `tr.json` during development requires a full page reload to see changes.

**The HMR handler is included in the skeleton.** Do not remove it. Verify after writing by: editing `en.json` → save → running app should update without page reload.

### P4: Persistence rehydration race — i18next must resolve locale BEFORE Zustand store init

Both `i18n.ts` and `settings.ts` read localStorage at module load time. The invariant is: `i18n.ts` runs before `settings.ts`'s `loadPersistedLocale()` is called. This is guaranteed by the import order in `main.tsx`:

```
import "./i18n/i18n";          // runs first — i18n.resolvedLanguage is populated
...
// settings.ts is first imported by a component, after all main.tsx imports resolve
```

`loadPersistedLocale()` in `settings.ts` falls back to `i18n.resolvedLanguage` when localStorage has no locale — this only works if `i18n.resolvedLanguage` is already set. If `settings.ts` were imported before `i18n.ts`, `i18n.resolvedLanguage` would be `undefined` and the store would default to `"en"` incorrectly.

**Verification:** After writing all files, confirm with `grep -n "import" frontend/src/main.tsx` that the i18n import precedes any import that could transitively load `settings.ts`.

### P5: Don't translate product names — negative list for Phase 2

The following strings appear in JSX alongside translatable UI strings and will be caught by any blanket extraction. They are brand identifiers and MUST NOT enter the locale catalog:

- `"Veo 3.1 Lite"`, `"Veo 3.1 Fast"`, `"Veo 3.1 Quality"` — video model names
- `"Omni Flash"`, `"Omni Flash · 4s"`, etc. — model variant names
- `"Nano Banana Pro"`, `"Banana Pro"`, `"Banana 2"` — image model names (display labels in `ResultViewer.tsx` `IMAGE_MODEL_LABELS`)
- `"Flowboard"` — product name (appears in `index.html <title>` and in error messages in `client.ts`)
- All strings in `frontend/src/constants/character.ts` — `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, `CHARACTER_GENDERS` — these are data enum values used as API parameters, not UI display strings

The STRING-INVENTORY.md must mark all of the above as `do-not-translate`. Phase 2's executor must check this list before wrapping any string in `t()`.

### P6: Don't translate user-authored data — boundary in NodeCard.tsx and ReferencesPanel.tsx

The following are user data, not UI copy. They render inside JSX next to UI strings and are the highest-risk mistranslation targets:

- `data.title` — user's node name
- `data.prompt` — generation prompt text the user typed
- `data.aiBrief` — AI-generated description (content, not UI chrome)
- `ref.label` — reference library name
- `board.name` — board title

Phase 1's STRING-INVENTORY.md must call these out with a comment at the exact JSX site, e.g., in `NodeCard.tsx`: `// USER DATA — do NOT wrap in t()`. Phase 2 must check these comments before extracting any string in those files.

### P7: `client.ts` import-order caution for Phase 2's `humanizeBackendError` i18n work

Phase 2 (EXTRACT-04) will change `humanizeBackendError` to use `i18n.t()` for its return strings. At that point, `client.ts` will import `i18n` from `../i18n/i18n`. The `client.ts` module is imported by multiple Zustand stores (`generation.ts`, `references.ts`, `board.ts`). Those stores are in turn imported before `i18n.ts` in some execution paths.

This is a Phase 2 concern, not Phase 1. Flag it here so the Phase 2 planner accounts for it: when adding `import i18n from "../i18n/i18n"` to `client.ts`, verify that the i18n module is always loaded before `client.ts` executes. The Phase 1 pattern of adding `import "./i18n/i18n"` as the FIRST import in `main.tsx` guarantees this for runtime, but any code that is imported at module scope from stores must also respect this ordering.

---

## 9. Open Questions

### Q1: `i18n.d.ts` filename — `i18next.d.ts` vs `i18n.d.ts`

The official react-i18next TypeScript documentation uses the filename `i18next.d.ts` (matching the npm package name). The CONTEXT.md specifies `frontend/src/i18n/i18n.d.ts`. Both work — TypeScript picks up any `.d.ts` file in the `include` path. The `i18n.d.ts` naming (chosen in CONTEXT.md) is consistent with the `i18n.ts` file it lives next to. **Recommendation: use `i18n.d.ts` as specified in CONTEXT.md.**

### Q2: Plural suffix convention in `en.json` for Phase 1 stub

The Section 5.3 skeleton uses `time.minutes_ago_one` / `time.minutes_ago_other`. i18next's default plural resolver for `"en"` and `"tr"` both use `_one` (count === 1) and `_other` (count !== 1). An alternative is to use only `time.minutes_ago` with `{{count}}` and let the count do all the work, skipping the suffix entirely. The `_one`/`_other` convention is recommended because it establishes the pattern Phase 2 will need for strings like "{{count}} variant generated" / "{{count}} variants generated". However, if the planner wants a simpler Phase 1 stub, the keys can be non-plural and the suffixes added in Phase 2.

### Q3: Whether to export `Locale` type from `i18n.ts` or redeclare in `settings.ts`

The skeleton in Section 5.6 imports `type Locale` from `../i18n/i18n`. This creates a dependency from `settings.ts` to `i18n.ts` — which is intentional (the store calls `i18n.changeLanguage()`). An alternative is to declare `type Locale = "en" | "tr"` independently in `settings.ts`. The single-source-of-truth approach (export from `i18n.ts`) is recommended to prevent divergence if a new locale is added.

### Q4: `import.meta.hot` TypeScript type

Vite provides a `ImportMeta` augmentation that includes `.hot` when `@vitejs/plugin-react` is installed. With `"lib": ["ES2022", "DOM"]` in `tsconfig.json` (confirmed), `import.meta.hot` may not be typed without `/// <reference types="vite/client" />`. The `frontend/vite-env.d.ts` or `vite.config.ts` typically provides this. If `npm run lint` reports `Property 'hot' does not exist on type 'ImportMeta'`, add `/// <reference types="vite/client" />` at the top of `i18n.ts`. Check if the file exists first:

```bash
ls frontend/src/vite-env.d.ts 2>/dev/null
```

If it exists, it likely already includes `/// <reference types="vite/client" />` and no change is needed.

---

## Project Constraints (from CLAUDE.md)

These constraints apply to all Phase 1 work:

| Constraint | Implication for Phase 1 |
|------------|------------------------|
| React 18.3 + TypeScript 5.6 strict + Vite 5.4 — no ejecting | react-i18next 17 requires no Vite plugin; confirmed compatible |
| Zustand 5 for state — locale state in a Zustand slice, not Context | `setLocale()` action in `settings.ts`; never a raw React Context provider for locale |
| No frontend test runner — don't add one for i18n | Verification is manual + `tsc -b --noEmit`; no jest/vitest test files created |
| Frontend only (`frontend/src/`) — no `agent/` or `extension/` changes | BUGS-02 fix stays in `client.ts`; no backend changes |
| All existing flows must work identically in English after Phase 1 | Empty tr.json + `fallbackLng: "en"` ensures English-identical output |
| Named exports only — no `export default` except where required | `i18n.ts` exports `export default i18n` — this is the i18next library's own named export pattern; acceptable exception matching existing library conventions |
| Relative imports (`../store/board`, not `@/store/board`) | All new imports in Phase 1 use relative paths |
| Double-quoted strings, 2-space indent, semicolons | Follow for all new code in Phase 1 |

---

## Sources

All code skeletons are derived from the following confirmed sources:

| Source | What Was Confirmed |
|--------|-------------------|
| `frontend/src/components/ResultViewer.tsx` (read in this session) | Lines 60-72 confirmed Vietnamese strings; line 657 confirmed call site; component structure confirmed |
| `frontend/src/api/client.ts` (read in this session) | Line 19 confirmed bare `.toLowerCase()`; all 4 `humanizeBackendError` branches confirmed |
| `frontend/src/store/settings.ts` (read in this session) | `STORAGE_KEY`, `PersistShape`, `loadPersisted()`, `persist()` pattern, all existing actions confirmed |
| `frontend/src/main.tsx` (read in this session) | Exact current content confirmed; no existing i18n imports |
| `frontend/src/App.tsx` (read in this session) | Exact current content confirmed; single `useEffect` for board loading |
| `frontend/index.html` (read in this session) | `<html lang="en">` confirmed |
| `frontend/tsconfig.json` (read in this session) | `resolveJsonModule: true` at line 14; `strict: true`; `"include": ["src"]` confirmed |
| `frontend/package.json` (read in this session) | Current deps confirmed; `npm run lint` = `tsc -b --noEmit` confirmed |
| `npm view react-i18next version` (run in this session) | 17.0.8 [VERIFIED: npm registry] |
| `npm view i18next version` (run in this session) | 26.3.1 [VERIFIED: npm registry] |
| `npm view i18next-browser-languagedetector version` (run in this session) | 8.2.1 [VERIFIED: npm registry] |
| `npm view react-i18next@17.0.8 peerDependencies` (run in this session) | `i18next >= 26.2.0`, `react >= 16.8.0`, `typescript ^5\|\|^6` — all satisfied [VERIFIED: npm registry] |
| `.planning/research/ARCHITECTURE.md` | Provider placement patterns, data flow, file spec for `i18n.ts` and `i18next.d.ts` |
| `.planning/research/PITFALLS.md` | All 14 pitfalls; specific file/line references confirmed against codebase audit |
| `.planning/research/STACK.md` | Package versions, compatibility matrix, TypeScript typed-key pattern |
| `.planning/research/SUMMARY.md` | Locked decisions, live bugs, phase skeleton |
| `.planning/phases/01-infra-audit/01-CONTEXT.md` | All locked decisions and discretion areas |
| ECMA-402 spec §String.prototype.toLocaleLowerCase [CITED: https://tc39.es/ecma402/] | `toLocaleLowerCase("en-US")` is spec-defined; supported in all current Chromium/Firefox/Safari |

---

*Research completed: 2026-06-10*
*Ready for planning: yes — all code skeletons are grounded in confirmed source file content*
