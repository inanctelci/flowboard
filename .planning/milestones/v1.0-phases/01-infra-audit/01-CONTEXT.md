# Phase 1: Infra + Audit - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped per smart-discuss rules)

<domain>
## Phase Boundary

Wire react-i18next 17 + i18next 26 + i18next-browser-languagedetector 8 into
the Vite/React frontend, fix the three live bugs that block correct
translation, and produce a written string inventory that Phase 2 consumes.
The app must render IDENTICALLY in English after this phase — zero behavioral
change for end users.

In scope:
- Install i18n npm packages
- Create `frontend/src/i18n/i18n.ts` + `i18n.d.ts` with module-scope init
- Mount `<I18nextProvider>` in `frontend/src/main.tsx` before `<App />`
- Add `locale` field + `setLocale()` to the Settings Zustand store
- localStorage persistence under dedicated key `flowboard.i18n.locale`
- Add `useEffect` in `App.tsx` to update `document.documentElement.lang`
- Rewrite `formatRelativeTime` in `frontend/src/components/ResultViewer.tsx`
  lines 60-72 (NOT `canvas/` — research had wrong path) to use i18n keys
  instead of hardcoded Vietnamese strings
- Fix locale-unsafe `.toLowerCase()` in `frontend/src/api/client.ts:19`
  (`humanizeBackendError`) — Turkish dotted-i corrupts `startsWith("public_error_")`
- Create empty-but-typed `frontend/src/i18n/locales/en.json` and
  `frontend/src/i18n/locales/tr.json` with placeholder keys for the bug-fix
  strings only (NodeCard / GenerationDialog / etc. stay hardcoded until
  Phase 2)
- Write a string inventory document at `.planning/phases/01-infra-audit/STRING-INVENTORY.md`
  enumerating non-obvious string sites (aria-labels, store actions, toasters,
  activity-meta, error humanizer branches) that Phase 2 must catalog

Out of scope:
- Extracting any strings outside the three bug fixes
- Building the Settings UI language picker (Phase 3)
- Translating anything to Turkish (Phase 3)
- Adding `i18next-parser` or any extraction tooling

</domain>

<decisions>
## Implementation Decisions

### Locked technical choices (from research/SUMMARY.md and REQUIREMENTS.md)

- Dependency set: `react-i18next@^17.0.8`, `i18next@^26.3.1`, `i18next-browser-languagedetector@^8.0.0`. NO Lingui (Vite 5 incompatible at v6), NO FormatJS (overkill).
- Catalog layout: flat single-namespace JSON at `frontend/src/i18n/locales/en.json` and `tr.json`. No namespace splitting at v1.
- TypeScript safety: `CustomTypeOptions` declaration merging in `frontend/src/i18n/i18n.d.ts` pointing at `typeof en` so missing keys fail `tsc -b --noEmit`.
- Locale state: i18next is the rendering source of truth; Settings Zustand store has a `locale` mirror for the SettingsPanel picker (Phase 3). `setLocale()` in the store calls `i18n.changeLanguage()` internally — components never call `changeLanguage` directly.
- localStorage key: dedicated `flowboard.i18n.locale` (NOT extended into the existing settings blob, per SUMMARY.md's locked decision).
- Init mode: synchronous module-scope `i18n.init()` with bundled (not HTTP) catalogs to avoid first-paint flicker.
- Provider placement: import `./i18n/i18n.ts` for side effect FIRST in `main.tsx`, then wrap `<App />` with `<I18nextProvider>`. StrictMode-safe because init runs at module load, not in an effect.

### Claude's Discretion

- Exact rewritten copy for `formatRelativeTime` English keys (e.g., `time.just_now` = "just now", `time.minutes_ago` = "{{count}} min ago", `time.hours_ago` = "{{count}} hr ago", `time.days_ago` = "{{count}} d ago", fallback uses `Intl.DateTimeFormat(currentLocale).format(date)` instead of `toLocaleDateString("vi-VN")`). Planner picks final wording.
- Whether to use i18next's native plural-suffix (`time.minutes_ago_one` / `time.minutes_ago_other`) or `{{count}}` interpolation alone for the relative-time strings. Either works — recommend `_one`/`_other` so the convention is established early.
- Method for fixing `humanizeBackendError` dotted-i: prefer `token.toLowerCase("en-US")` (locale-explicit) over locale-invariant manual lookup. Cheaper and reads correctly.
- Whether the i18n init file uses `react-i18next`'s `initReactI18next` plugin alone or also chains `LanguageDetector`. Required by SWITCH-01 in Phase 3, but adding it now (in Phase 1) is safe — it costs nothing and lets the bug-fix strings benefit from it.
- Initial locale fallback chain. Recommended: `fallbackLng: "en"`, `supportedLngs: ["en", "tr"]`, `lng` resolved by LanguageDetector (localStorage → navigator → en).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/store/settings.ts` — Settings Zustand store, currently persists via a manual localStorage read/write pattern under `flowboard.settings.v1` (NOT `zustand/middleware/persist`). The locale will live in a DEDICATED sibling key, not nested in the settings blob.
- `frontend/src/main.tsx` — App entry mounts via `createRoot` + StrictMode. This is where the i18n side-effect import goes (before `<App />` import) and where `<I18nextProvider>` wraps the app.
- `frontend/src/App.tsx` — Root component; this is where the `useEffect` that syncs `document.documentElement.lang` lives.
- `frontend/index.html` — has hardcoded `lang="en"`. Stays as initial value; effect updates it on locale change.

### Established Patterns
- TypeScript strict mode is enabled in `frontend/tsconfig.json`. `npm run lint` is `tsc -b --noEmit`. The typed-keys declaration must satisfy this.
- Single global stylesheet `frontend/src/styles.css` — no module CSS or styled-components. No layout work this phase.
- npm is the package manager (`frontend/package-lock.json` is npm v3 lockfile).

### Integration Points
- `frontend/src/main.tsx` lines around `createRoot(...).render(...)` — wrap `<App />` with `<I18nextProvider i18n={i18n}>` (or rely on the default global from `initReactI18next` and skip the explicit provider).
- `frontend/src/api/client.ts` line 19 — `humanizeBackendError`'s `token.toLowerCase()`.
- `frontend/src/components/ResultViewer.tsx` lines 60-72 — `formatRelativeTime` rewrite. Real path is `components/`, not `canvas/`.
- `frontend/src/store/settings.ts` — add `locale: "en" | "tr"` field + `setLocale(locale)` action that mirrors to i18next via `i18n.changeLanguage()`.

### Bug Fix Specifics
- **BUGS-01 (Vietnamese)**: lines 60-72 of `frontend/src/components/ResultViewer.tsx`. Current strings: `"vừa xong"` (just now), `"${diffMin} phút trước"` (X min ago), `"${diffHr} giờ trước"` (X hr ago), `"${diffDay} ngày trước"` (X days ago), `new Date(t).toLocaleDateString("vi-VN")` (long-form date fallback). Replace with i18n keys + `Intl.DateTimeFormat(i18n.resolvedLanguage)` for the long-form date.
- **BUGS-02 (dotted-i)**: line 19 of `frontend/src/api/client.ts`. Change `const t = token.toLowerCase();` to `const t = token.toLowerCase("en-US");` (or equivalent locale-invariant approach). Verify the four downstream `t.startsWith(...)` / `t === ...` / `t.includes(...)` checks still match correctly.
- **BUGS-03 (html lang)**: `frontend/index.html` keeps `lang="en"` as initial; add `useEffect` in `App.tsx` that sets `document.documentElement.lang = i18n.resolvedLanguage` on the resolved-language change event (via `useTranslation` hook's `i18n` object, or `i18n.on('languageChanged', ...)`).

</code_context>

<specifics>
## Specific Ideas

The planner SHOULD produce a Phase 1 string inventory at
`.planning/phases/01-infra-audit/STRING-INVENTORY.md` that lists, by file:
- JSX text-node string sites (rough counts per file; full extraction in Phase 2)
- JSX attribute string sites (`aria-label`, `title`, `placeholder`, `alt`)
- Non-component string sites: Zustand store actions, error/toaster strings, `activity-meta.ts` labels, error humanizer branches, the rewritten `formatRelativeTime` keys
- Product/model name constants that MUST NOT enter the catalog (Veo 3.1 Lite, Nano Banana Pro, Nano Banana 2, etc.) — list the constants files where they live so Phase 2 has the negative-list

This inventory is the deliverable that turns Phase 2 from "extract everything" into "extract this concrete list." Without it, Phase 2's blast radius is unbounded.

</specifics>

<deferred>
## Deferred Ideas

- `i18next-parser` automation — V2-AUTO-EXTRACT in REQUIREMENTS.md
- Automated parity CI between en.json and tr.json — V2-PARITY-CI
- `aria-live` announcement on language change — V2-ARIA-LIVE
- CSS logical properties audit — V2-LOGICAL-CSS

</deferred>
