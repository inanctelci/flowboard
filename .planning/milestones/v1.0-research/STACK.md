# Stack Research

**Domain:** Frontend i18n — adding internationalization to an existing React 18 + TypeScript strict + Vite 5 + Zustand 5 SPA (English + Turkish v1, open to community locale contributions)
**Researched:** 2026-06-10
**Confidence:** HIGH

---

## Primary Recommendation

**react-i18next 17 + i18next 26** — install both, configure once, done.

This is not the default choice because it's familiar; it is the correct choice for this exact stack and scope. The rationale is below.

---

## Recommended Stack

### Core Technologies

| Technology | Version Pin | Purpose | Why Recommended |
|------------|-------------|---------|-----------------|
| `react-i18next` | `^17.0.8` | React hooks + `<Trans>` component | Deepest React 18 integration; `useTranslation()` returns typed `t`; works without any Vite plugin |
| `i18next` | `^26.3.1` | Core translation engine (peer dep) | v26 introduced `enableSelector: 'strict'` (typed key paths with compile errors on misses) and `ResourceNamespaceMap` for scalable multi-namespace type augmentation |
| `i18next-resources-to-backend` | `^1.2.1` | Lazy-loads locale JSON via dynamic `import()` | Zero HTTP requests in dev; Vite splits each locale JSON into its own chunk automatically; fallback chain built in |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `i18next-browser-languagedetector` | `^8.0.0` | Auto-detect locale from `navigator.language` on first load | Required by the "browser-language auto-detect" requirement; reads `localStorage` for the persisted override |
| `i18next-parser` | `^9.x` | CLI: scans `frontend/src/**/*.{tsx,ts}` and writes/merges locale JSON | Run once to bootstrap catalogs, then again after adding new strings; outputs missing keys without overwriting existing translations |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `i18next-parser` | Key extraction CLI | `npx i18next-parser -c i18next-parser.config.ts`; uses the built-in JSX and TSX lexers; no Babel required |
| `i18n Ally` (VS Code extension `lokalise.i18n-ally`) | IntelliSense for `t('key')` calls, inline preview of translations, missing-key highlighting | Zero config for react-i18next; reads `src/locales/` automatically |
| TypeScript declaration file (`src/i18n/i18next.d.ts`) | Typed key autocomplete and compile errors on missing keys | Required setup — see pattern below |

---

## TypeScript Strict Key Safety — Concrete Pattern

This is the most important integration detail. With i18next v26 + TS strict mode, you get compile-time errors for any `t('key.that.doesnt.exist')` call.

**Step 1 — create `src/i18n/i18n.ts` (init file):**
```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(resourcesToBackend(
    (language: string, namespace: string) =>
      import(`../locales/${language}/${namespace}.json`)
  ))
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "board", "settings", "generation"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "flowboard_locale",
      caches: ["localStorage"],
    },
  });

export default i18n;

// Re-export the typed resource shape so the declaration file can reference it:
export const defaultNS = "common" as const;
export { resources } from "./resources"; // see Step 2
```

**Step 2 — create `src/i18n/resources.ts` (the shape TypeScript sees):**
```typescript
// Import only the English (reference) catalogs — TS infers the key shape from these.
import common from "../locales/en/common.json";
import board from "../locales/en/board.json";
import settings from "../locales/en/settings.json";
import generation from "../locales/en/generation.json";

export const resources = {
  en: { common, board, settings, generation },
} as const;
```

**Step 3 — create `src/i18n/i18next.d.ts` (the declaration merge):**
```typescript
import { resources, defaultNS } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: typeof resources["en"];
  }
}
```

With `"resolveJsonModule": true` (already in `frontend/tsconfig.json`), TypeScript infers keys from the JSON files. Any `t('nonexistent.key')` is a TS error caught by `tsc -b --noEmit` (the existing `npm run lint` script) — no additional tooling needed.

---

## Vite Integration

**No Vite plugin is required** for react-i18next 17 + i18next 26. The `i18next-resources-to-backend` dynamic import pattern is fully supported by Vite 5 natively:

```typescript
// This pattern works in Vite 5 without plugins:
resourcesToBackend(
  (language: string, namespace: string) =>
    import(`../locales/${language}/${namespace}.json`)
)
```

Vite 5 creates one chunk per locale/namespace combination at build time. The current `vite.config.ts` requires zero changes — just the new `react-i18next` + `i18next` runtime deps.

**HMR in development:** Locale JSON edits trigger normal Vite HMR without any special plugin. The `i18next-hmr` Vite plugin exists if more aggressive dev-time reloading is needed, but it is not required — JSON module changes are picked up automatically.

---

## Locale File Structure

```
frontend/src/locales/
├── en/
│   ├── common.json       # buttons, labels, generic errors used everywhere
│   ├── board.json        # canvas-specific strings (node types, toolbar)
│   ├── settings.json     # SettingsPanel, AiProviderDialog, ProviderCard
│   └── generation.json   # GenerationDialog, ResultViewer dispatch strings
└── tr/
    ├── common.json
    ├── board.json
    ├── settings.json
    └── generation.json
```

**Why these namespaces for Flowboard:**
- `common` — button labels ("Save", "Cancel", "Close"), generic errors, empty states
- `board` — NodeCard type names, AddNodePalette labels, VariantEdge copy
- `settings` — SettingsPanel, ProviderCard, ProviderSetupModal, AccountPanel
- `generation` — GenerationDialog (the largest string surface), ResultViewer status messages

**Naming convention:** `src/locales/{locale}/{namespace}.json` — `locale` is a BCP 47 tag (`en`, `tr`; extend to `vi`, `ko`, etc. by community PR). This is the canonical react-i18next convention recognized by i18n Ally and i18next-parser out of the box.

**Lazy-load vs bundle-all:** With `i18next-resources-to-backend`, only the active locale's namespaces are fetched. Since Flowboard is a local-only app, bundle size is not a constraint (PROJECT.md confirms this), but lazy loading is free here and keeps the pattern community-standard.

**Parity checking between locales:** Run `npx i18next-parser` (which merges, never deletes) plus a custom script that `diff`s the key sets of `en/*.json` vs `tr/*.json`. A simple `jq` one-liner in CI works; no specialized tool is required for two locales.

---

## Turkish-Specific Concerns

### Dotted/Dotless "i" — the Turkish I Problem

Turkish has four I-forms: `i` (dotted lowercase), `İ` (dotted uppercase), `ı` (dotless lowercase), `I` (dotless uppercase). JavaScript's `toLowerCase()` / `toUpperCase()` use the Unicode default locale (en-US), so `"I".toLowerCase()` returns `"i"` (wrong in Turkish; should be `"ı"`).

**Where this bites Flowboard:** Any UI code that calls `.toLowerCase()` or `.toUpperCase()` on a string that may be displayed in Turkish must use the locale-aware variants instead:

```typescript
// Anywhere case-folding is done on display strings, use:
str.toLocaleLowerCase("tr")    // "I" → "ı", "İ" → "i"
str.toLocaleUpperCase("tr")    // "i" → "İ", "ı" → "I"

// Or, with the active locale from i18next:
import i18n from "@/i18n/i18n";
str.toLocaleLowerCase(i18n.language);
```

Search `frontend/src/` for raw `.toLowerCase()` and `.toUpperCase()` calls on any string that is displayed in the UI as part of the migration. The `constants/character.ts` arrays (SCREAMING_SNAKE_CASE) are fine — they are enum keys, not display strings.

### Pluralization

Turkish plural rule is identical to English from the i18next perspective: one form for singular (count=1), one form for plural (count≠1). Standard i18next interpolation handles this with `count` parameter:

```json
{
  "nodeCount": "{{count}} node",
  "nodeCount_plural": "{{count}} nodes"
}
```

```json
{
  "nodeCount": "{{count}} düğüm",
  "nodeCount_plural": "{{count}} düğüm"
}
```

(In Turkish, "düğüm" does not inflect for plural in the same way — the count prefix carries the plural meaning — so the same form works for both. This is simpler than most Slavic languages.)

### Date/Number Formatting

PROJECT.md explicitly defers locale-aware date/number formatting ("Flowboard barely shows formatted dates today; defer until it does"). No work needed in this milestone. When the time comes, use the native `Intl.DateTimeFormat("tr")` and `Intl.NumberFormat("tr")` APIs — they are built into every browser and handle Turkish locale correctly without any library.

---

## Alternatives Considered

| Recommended | Alternative | Why Not for This Project |
|-------------|-------------|--------------------------|
| `react-i18next 17` | **LinguiJS 6** | Lingui 6's `@lingui/vite-plugin` requires Vite ≥ 6.3 — incompatible with the project's pinned Vite 5.4. Downgrading to Lingui 5 is an option but Lingui 5 is now superseded and the v5→v6 ESM-only migration has already shipped. Also: Lingui uses PO file format and a mandatory compiler/extraction step; for a 2-locale repo maintained by community PR, JSON files are more universally understood and don't require translator familiarity with PO format. |
| `react-i18next 17` | **FormatJS / react-intl** | ICU MessageFormat is the right tool for translation agencies and complex pluralization. For Flowboard's scope (flat key-value strings, Turkish plural is single-form, no currency/date formatting in scope), the extraction overhead is disproportionate: you need `@formatjs/cli extract` + a Babel or TS transformer for every build, and every string must be wrapped in `<FormattedMessage>` or `intl.formatMessage()` with a descriptor object. The DX cost is high for a small locale set. Ecosystem size vs react-i18next is also smaller. |
| `react-i18next 17` | **Custom hook + JSON catalogs** | Viable at 2 locales with no pluralization, no namespace splitting, no TypeScript key safety unless you hand-wire generics. The moment a third locale is contributed by the community, maintaining a bespoke solution has higher friction than the already-understood react-i18next patterns. Not worth the custom maintenance cost when react-i18next adds ~8 KB and provides the complete ecosystem. |
| `react-i18next 17` | **@tolgee/react** | Tolgee is a localization platform SDK, not a standalone i18n library. Its value is in-context translation editing and a hosted/self-hosted TMS. PROJECT.md explicitly excludes TMS integration ("Locale JSONs live in the repo, edited by hand or by community PR"). Tolgee's SDK is built on top of i18next anyway — if Tolgee ever becomes desirable, migrating from react-i18next to Tolgee is additive. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `i18next-http-backend` | Requires JSON files to be in `public/locales/` and served over HTTP. In dev, adds a network round-trip and breaks if the agent isn't running. `i18next-resources-to-backend` achieves the same lazy-load via Vite's dynamic import at build time with zero network dependency. | `i18next-resources-to-backend` (dynamic import) |
| `@lingui/vite-plugin` v6 | Requires Vite ≥ 6.3; this project is on Vite 5.4 and the stack is non-negotiable. Pinning Lingui 5 to avoid this is not recommended — Lingui 5 reached its effective end-of-active-development in late 2024. | `react-i18next` (no Vite plugin needed) |
| `vite-plugin-i18next-loader` | Bundles all locale JSON into the main bundle at build time as a virtual module — defeats lazy loading. Adds a build-time dependency for what Vite already handles natively via `resourcesToBackend`. | Native dynamic import via `resourcesToBackend` |
| React Context for locale state | PROJECT.md and the STACK constraint specify Zustand for state — not Context-only patterns. react-i18next manages its own internal state; exposing the active locale to Zustand is one selector: `i18n.language`. No custom Context layer needed. | `i18next` built-in state + optional Zustand selector |
| `FormatJS babel-plugin-formatjs` | Requires adding Babel transform to Vite (via `@vitejs/plugin-react`'s `babel` option), breaking the current clean Vite config. No Babel transforms are present today. | `i18next-parser` CLI (runs offline, no build-time transform) |

---

## Installation

```bash
# Runtime dependencies (add to frontend/package.json "dependencies")
npm install react-i18next@^17.0.8 i18next@^26.3.1 i18next-resources-to-backend@^1.2.1 i18next-browser-languagedetector@^8.0.0

# Dev dependency — string extraction CLI
npm install -D i18next-parser@^9
```

No changes to `devDependencies` beyond `i18next-parser`. No Vite plugin. No Babel. No new `tsconfig.json` options needed (`resolveJsonModule: true` is already set).

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react-i18next@^17` | `i18next@^26` | v17 bumped minimum i18next peer to `>= 26.0.1`; install both together |
| `react-i18next@^17` | `react@^18.3.1` | React 18 fully supported; StrictMode safe |
| `react-i18next@^17` | `typescript@^5.6.2` | Full TS support; declaration merging documented in i18next v26 docs |
| `i18next@^26.3.1` | `vite@^5.4.9` | No plugin required; dynamic import() works natively |
| `i18next-browser-languagedetector@^8` | `i18next@^26` | Compatible; `localStorage` detection key is configurable |
| `i18next-parser@^9` | `typescript@^5.6.2` | Uses TypeScript compiler internally for TSX parsing; no Babel required |

---

## Stack Patterns by Variant

**For the Zustand locale-persistence slice (`frontend/src/store/settings.ts`):**
The settings store already persists user prefs. Add the locale as a `language` field and call `i18n.changeLanguage(newLocale)` on write. Read from `i18n.language` directly (not from Zustand) inside components — no duplicated state:

```typescript
// In settings store:
setLanguage: (lang: "en" | "tr") => {
  i18n.changeLanguage(lang); // i18next persists to localStorage via LanguageDetector
  set({ language: lang });
},
```

**For community locale contributions:**
A contributor adds a locale by: (1) creating `src/locales/{locale}/*.json` files mirroring the `en/` structure, (2) adding the locale tag to the `i18n.init({ supportedLngs: [...] })` array. No code changes required — the dynamic import pattern accepts any locale string automatically.

**For the Settings panel language switcher:**
Call `i18n.changeLanguage("tr")` directly in the `SettingsPanel.tsx` handler. The `LanguageDetector` with `caches: ["localStorage"]` persists the choice. No additional API call, no reload needed — react-i18next triggers re-renders via its React integration automatically.

---

## Sources

- [react-i18next npm — confirmed version 17.0.8](https://www.npmjs.com/package/react-i18next)
- [i18next npm / GitHub releases — confirmed version 26.3.1](https://github.com/i18next/i18next/releases)
- [i18next TypeScript typed keys documentation](https://www.i18next.com/overview/typescript) — declaration merging, `strictKeyChecks`, `CustomTypeOptions` pattern
- [i18next namespaces documentation](https://www.i18next.com/principles/namespaces) — namespace semantics, `common` / per-section patterns
- [react-i18next getting started](https://react.i18next.com/getting-started) — Vite setup pattern
- [Lingui 6.0 announcement (April 2026)](https://lingui.dev/blog/2026/04/22/announcing-lingui-6.0) — ESM-only, Vite 6+ requirement confirmed
- [@lingui/vite-plugin npm — peer dep `vite ^6.3.0 || ^7 || ^8`](https://www.npmjs.com/package/@lingui/vite-plugin) — confirmed Vite 5 incompatibility
- [React i18n 2026 comparison — auto18n](https://www.auto18n.com/en/blog/react-i18n-2026) — ecosystem comparison
- [Best i18n libraries React 2026 — dev.to](https://dev.to/erayg/best-i18n-libraries-for-nextjs-react-react-native-in-2026-honest-comparison-3m8f) — download stats and trend analysis
- [i18next-resources-to-backend GitHub](https://github.com/i18next/i18next-resources-to-backend) — dynamic import pattern
- [Lazy loading translations Vite 2026 — SimpleLocalize](https://simplelocalize.io/blog/posts/lazy-loading-resources/) — Vite 5 dynamic import pattern
- [Turkish I18n — dotted/dotless I problem](http://www.i18nguy.com/unicode/turkish-i18n.html) — Turkish case-folding specifics
- [i18next Turkish I issue](https://github.com/i18next/i18next-node/issues/157) — historical context on Turkish locale in i18next
- [i18n-check end-to-end testing](https://lingual.dev/blog/i18n-check-end-to-end-react-i18n-testing/) — parity checking approach

---
*Stack research for: Flowboard frontend i18n (English + Turkish v1)*
*Researched: 2026-06-10*
