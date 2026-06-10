# Feature Landscape: i18n Support for Flowboard Frontend

**Domain:** Internationalization (i18n) layer for an open-source React 18 + TypeScript + Vite SPA
**Researched:** 2026-06-10
**Scope:** Frontend UI strings in `frontend/src/` only — English + Turkish at v1, pluggable for community-contributed locales

---

## Table Stakes

Features users expect when an OSS project ships "multi-language support." Missing any of these makes the feature feel broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All visible UI strings extracted from JSX/TS | Without this, switching language produces a mixed-language UI — a confusing half-translated experience | Medium | Flowboard has ~15 components, 2 canvas files, and several stores with inline hardcoded strings. NodeCard.tsx (1577 lines) and GenerationDialog.tsx (1365 lines) are the bulk of the surface area. |
| Language switcher in Settings panel | Users expect a discoverable toggle; placing it in the existing SettingsPanel avoids adding new UI chrome | Trivial | SettingsPanel already exists at `frontend/src/components/SettingsPanel.tsx` and is the correct home. A `<select>` or button-group listing `English / Türkçe` is sufficient for v1. |
| Browser-language auto-detect on first load | Without auto-detect, Turkish users arrive to English every time; feels like the feature is off | Small | `i18next-browser-languageDetector` plugin, configured to check `navigator.language` first. Flowboard's audience includes non-English speakers by design (Vietnam/Korea/Turkey noted in README). |
| Persist language choice across reloads | Without persistence, every page reload reverts to auto-detect — a frustrating loop | Trivial | `i18next-browser-languageDetector` writes to `localStorage` key `i18nextLng` automatically via `cacheUserLanguage`. The Zustand settings store does NOT need to own this — the i18next detector handles it directly. Confirm the detector's `lookupLocalStorage` is wired first in the detection order so a manual override survives a reload. |
| English (`en`) baseline catalog — 100% coverage | The fallback language; if a key is missing in Turkish, English must always be present | Medium | Requires systematic extraction of every hardcoded string in `frontend/src/`. No frontend test runner today, so coverage must be enforced by TypeScript types (see Differentiators). |
| Turkish (`tr`) catalog — 100% parity with `en` | The promised second locale; ships at v1 alongside infrastructure | Medium | All `en` keys must exist in `tr`. Turkish is LTR, no directionality issues. Turkish pluralization is simpler than Slavic families — one singular, one plural suffices. |
| Fallback to English for missing keys | When a Turkish key is absent (regression, new feature gap), display the English string rather than a raw key or blank | Trivial | i18next `fallbackLng: 'en'` config option. Critical: default behavior without this is to display the raw key string (e.g., `"canvas.toolbar.addNode"`) which is unacceptable in production. |
| `lang` attribute on `<html>` updated dynamically | WCAG 3.1.1 (Level A): the HTML `lang` attribute must match the current page language for screen readers to pronounce text correctly | Small | `document.documentElement.setAttribute('lang', resolvedLanguage)` called inside the `i18next.on('languageChanged', ...)` event handler at app init. Two-line implementation, zero cost, required for WCAG compliance. |
| Single namespace (no code-splitting required) | For a local-only SPA loaded once, lazy-loading namespaces adds complexity with no user benefit | Trivial | One JSON file per locale (e.g., `src/locales/en.json`, `src/locales/tr.json`) bundled with Vite. All-in-one loading avoids async namespace suspense and matches Excalidraw's approach (bundles all locales at startup to avoid latency). |

---

## Differentiators

Features that separate a "professional" i18n implementation from a checkbox one. None are required for v1, but naming them explicitly lets the requirements step decide consciously.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| TypeScript-typed translation keys | TypeScript compiler errors on misspelled or deleted keys, not runtime blank strings. IDE autocomplete for every key. | Small | Requires `en.json` to be the complete baseline first (extraction complete) | i18next `CustomTypeOptions` module augmentation in `src/i18n.d.ts`. Declare `defaultNS` and `resources: { en: typeof enJson }`. One declaration file, no extra tooling beyond the JSON baseline already needed. Highly recommended for Flowboard given no frontend test runner — types become the only automated parity check. |
| Automated locale-parity CI check | Blocks a PR where a new English string is added but the Turkish translation is absent | Small | Extraction complete + `en.json` baseline exists | `i18n-check` (npm: `lingualdev/i18n-check`) compares source locale to all target locales and exits non-zero on gaps. Can run as a `package.json` script or GitHub Action step. Alternatively, a one-liner Node script diffing `Object.keys(en)` vs `Object.keys(tr)` needs only stdlib. |
| i18next context feature for verb/noun disambiguation | Some strings are the same word in English but different in Turkish (e.g., "Save" as a button action vs "Save" as a noun like "your save"). Prevents awkward calques. | Small | Extraction complete | `t('save', { context: 'verb' })` and `t('save', { context: 'noun' })` map to `save_verb` and `save_noun` keys. Not needed until a translator flags an ambiguity. Build it when the Turkish translator asks for it. |
| Simple pluralization (`_one` / `_other` key suffix) | Strings like "1 board / 3 boards" break without pluralization. Turkish pluralization is regular and simple. | Small | Extraction complete | i18next built-in via `count` interpolation and `_one`/`_other` key suffixes. NOT the same as full ICU MessageFormat (see Anti-Features). Flowboard has few count-bearing strings today (board list counts, node counts), so this is low-effort and should be wired correctly from the start rather than retrofitted. |
| `aria-live` announcement on locale change | Screen reader users need to know the UI language changed; without an announcement they may lose orientation | Small | Language switcher UI complete | Render a visually-hidden `<div aria-live="polite">` that receives a translated "Language changed to Turkish" string immediately after `i18n.changeLanguage()` resolves. Four lines of React. Low effort, high accessibility value. |
| `i18next-parser` key extraction tooling | Automates extracting `t('key')` call sites from source into locale JSON stubs, eliminating manual scanning | Small | None — can run before any translation is done | `i18next-parser` scans `frontend/src/**/*.{ts,tsx}` and outputs `en.json` stubs for every `t('...')` call. Useful for initial extraction and for catching new keys added after v1. Configured once, run as `npm run i18n:extract`. |
| `dir` attribute on `<html>` for future RTL | RTL locales (Arabic, Hebrew) will be unreadable without `dir="rtl"` on the root. Turkish is LTR so this is a no-op for v1, but the hook should be wired. | Trivial | `lang` attribute hook (see Table Stakes) | `document.documentElement.setAttribute('dir', resolvedLanguage === 'ar' ? 'rtl' : 'ltr')` in the same `languageChanged` handler. Zero cost for LTR locales, eliminates a future RTL blocker. PROJECT.md explicitly defers RTL support; wiring the hook (not the CSS) is free and future-proof. |
| Namespace splitting by feature area | Reduces time-to-first-paint if locale files become large; gives community contributors a scoped file to edit | Medium | Extraction complete + single-namespace baseline first | Split into `canvas.json`, `dialogs.json`, `settings.json`, `common.json` etc. For Flowboard's current string count (estimated 200-400 keys across all components) this is premature optimization. Revisit when any single locale file exceeds ~500 keys. **Dependency: do single namespace first.** |
| In-context / Tolgee-style live-edit overlay | Lets translators click any string in the live app and edit it in place | Large | All of the above + a translation editor backend | Tolgee OSS or i18n-ally VS Code plugin. No backend required for the VS Code variant. Overkill for a 2-locale v1 with a small maintainer team. Defer until community translation volume justifies it. |
| Crowdin / Weblate integration | Dedicated translation management platform; community contributors use a GUI rather than editing JSON | Large | Extraction complete + stable key structure | Excalidraw (Crowdin) and Mattermost (Pootle/WeBlate) use this pattern. For Flowboard at v1 with 2 locales, direct GitHub PR workflow is lighter. The right migration point is when there are 5+ active locale contributors or the JSON PRs generate merge conflicts. |
| Locale-aware `Intl` date/number formatting | Formats dates and numbers in the user's locale convention | Small | Locale state available to formatting helpers | PROJECT.md explicitly defers this: "Flowboard barely shows formatted dates today." Correct decision — wire it when a date-heavy feature ships. |

---

## Anti-Features

Explicitly do not build these for the i18n milestone. Documenting them prevents scope creep.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full ICU MessageFormat syntax (`{count, plural, one {#} other {#}}`) | Requires `i18next-icu` plugin and a non-standard JSON syntax; translators need to learn ICU syntax; adds bundle overhead. Turkish plural rules are simple. | Use i18next's native `_one` / `_other` key suffix convention. Handles English and Turkish correctly. ICU is only justified when supporting languages with 3+ plural forms (Russian, Arabic) — revisit then. |
| Runtime locale fetching from CDN / dynamic import | Async locale loading introduces suspense/loading states across the entire app. Flowboard is local-only (localhost:5173), so network latency is zero. | Bundle all locales (en + tr) statically with Vite. Excalidraw takes the same approach for the same reason. |
| Server-side `Accept-Language` negotiation | FastAPI backend stays English-only (PROJECT.md: "Backend / agent error strings kept English-only"). No SSR. No need for server-aware locale routing. | Frontend-only detection via browser `navigator.language` and localStorage. |
| Locale-specific URL routing (`/tr/`, `/en/`) | Adds routing complexity, breaks the SPA mental model, requires changes to backend CORS and Vite proxy config. No SEO value for a local tool. | Single route, locale in localStorage. Standard for local-first SPAs. |
| Machine-translation fallback for missing keys | Produces incorrect or awkward translations silently; harms trust. LLM output quality for UI microcopy (button labels, tooltips) is unreliable without post-editing. | Display English fallback (`fallbackLng: 'en'`). Community PR to fix the gap is the correct response to a missing key. |
| Translation Memory System (TMS) integration (Smartling, Phrase, etc.) | Paid services; overkill for 2 locales managed via PR. Adds external vendor dependency. | Locale JSON files in `frontend/src/locales/`, edited via PR. |
| Translating user-authored content (node labels, prompts, board titles) | These are user data, not UI shell strings. Translating them would corrupt user intent. | Explicitly out of scope in PROJECT.md. |
| Chrome extension popup i18n | One-time setup UI touched by very few users. | Out of scope in PROJECT.md; revisit if it becomes a friction point. |
| Gender-inflected grammar systems up front | Turkish has no grammatical gender; English has none in the Flowboard UI. Over-engineering for languages not yet in scope. | Add context keys when a gendered-language locale (French, Spanish, German) is contributed. |

---

## Feature Dependencies

```
Extraction complete (all JSX strings replaced with t() calls)
  → English baseline en.json (100% coverage)
    → TypeScript-typed keys (i18n.d.ts points at en.json)
    → Turkish tr.json (translated at parity with en.json)
    → Automated parity CI check (compares tr.json keys to en.json)
    → i18next-parser for future key extraction

Pluggable infra wired (i18next init, provider, fallbackLng)
  → Language switcher in SettingsPanel
    → Browser auto-detect (LanguageDetector plugin)
      → localStorage persistence (cacheUserLanguage)
    → lang attribute on <html> (languageChanged event handler)
      → dir attribute on <html> (same handler, free no-op for LTR)
      → aria-live announcement (same lifecycle, announce after change)

Single namespace baseline
  → Namespace splitting (future, when >500 keys)
  → Crowdin/Weblate (future, when >5 active locale contributors)
```

---

## MVP Recommendation

For the v1 milestone as scoped in PROJECT.md, build exactly:

1. **Pluggable infrastructure** — i18next + react-i18next init, `fallbackLng: 'en'`, single namespace, static bundle
2. **Full string extraction** — all hardcoded JSX strings in `frontend/src/` replaced with `t()` calls
3. **`en.json` baseline** — complete coverage, flat key names, human-readable
4. **`tr.json` at parity** — every en key translated, maintainer-authored
5. **TypeScript typed keys** — `i18n.d.ts` + `CustomTypeOptions` wired against `en.json` (Small complexity, zero extra tooling beyond what the baseline already provides; replaces the absent frontend test runner as an automated correctness gate)
6. **Language switcher in SettingsPanel** — `<select>` or button-group, calls `i18n.changeLanguage()`
7. **Browser auto-detect + localStorage persistence** — `i18next-browser-languageDetector` with `lookupLocalStorage` first in detection order
8. **`lang` attribute on `<html>`** — `document.documentElement.lang = i18n.resolvedLanguage` in `languageChanged` handler (2 lines, WCAG Level A, zero cost)

**Explicitly defer for v1:**
- `aria-live` announcement on locale change (Small; defer to v1.1 or when an accessibility audit is run)
- `dir` attribute hook (Trivial, but no RTL locales in scope; add when RTL is contributed)
- Automated parity CI check (Small; valuable, but no CI workflow currently exists for the frontend — don't make i18n the reason to add one; can be a post-v1 hardening step)
- `i18next-parser` extraction tooling (useful after v1 for new-key discovery)
- Namespace splitting, Crowdin/Weblate, ICU, live-edit overlay

---

## OSS Community Contribution Patterns

How well-run OSS React projects make it easy for non-developers to contribute translations.

### Tier 1: Direct PR (appropriate for Flowboard v1)

**Pattern:** Locale files live in the repository as plain JSON. A contributor copies `en.json` to `<lang>.json`, translates the values, and opens a PR. The maintainer reviews and merges.

**How to set it up:**
1. Put locale files in a predictable location: `frontend/src/locales/en.json`, `frontend/src/locales/tr.json`
2. Add a `CONTRIBUTING.md` section titled "Adding a new language" with four steps: (a) copy `en.json`, (b) rename to `<BCP47-code>.json`, (c) translate all values (not keys), (d) open a PR with `[i18n]` in the title
3. Add the new locale code to the i18next `supportedLngs` array and the language switcher dropdown
4. Run the parity check script locally before submitting

**Who uses it:** GitHub's `opensource.guide`, many small React OSS tools at < 5 locales

**When it breaks down:** When contributors don't know what keys changed (they have to diff against `en.json` manually), or when PRs conflict because two translators edited the same file. Switch to Tier 2 at that point.

### Tier 2: Crowdin (appropriate for Flowboard when community grows)

**Pattern:** Excalidraw's approach. `en.json` is the source of truth in GitHub. Crowdin is connected via GitHub integration. When a maintainer merges a change to `en.json`, Crowdin auto-notifies all language contributors that new strings need translation. Contributors translate in Crowdin's GUI (no Git knowledge needed). Crowdin auto-opens a PR back to the repo with updated locale JSON files.

**Benefits over Tier 1:**
- Non-developer contributors can participate (no Git required)
- Crowdin surfaces untranslated strings automatically without diffing
- Translation suggestions and memory reduce repetition
- Progress bars per language motivate community completions
- Capitalization and placeholder consistency warnings built in

**Cost:** Free plan covers open-source projects on Crowdin. Setup takes ~2 hours.

**When to migrate:** When there are 3+ active translators for any single locale, or when locale JSON PRs start causing merge conflicts.

### Tier 3: Weblate self-hosted (appropriate for projects with privacy concerns or heavy TMS needs)

**Pattern:** Mattermost has used this model. Weblate is self-hosted translation management with Git integration. Same translator workflow as Crowdin but you own the data.

**Cost:** Operational overhead of running a Weblate server. Overkill for Flowboard at current scale.

### Practical CONTRIBUTING.md Pattern for Flowboard v1

```markdown
## Contributing a Translation

1. Copy `frontend/src/locales/en.json` to `frontend/src/locales/<code>.json`
   (use a BCP 47 language tag, e.g. `de` for German, `fr` for French)
2. Translate every **value** in the JSON — do not change the **keys**
3. Leave `{{interpolation}}` placeholders (e.g. `{{count}}`, `{{name}}`) untouched
4. Add your language code to the `supportedLngs` array in `frontend/src/i18n.ts`
5. Add a label for your language to the language switcher in `frontend/src/components/SettingsPanel.tsx`
6. Run `npm run i18n:check` to confirm parity with `en.json`
7. Open a PR with `[i18n: <language name>]` in the title
```

The key insight from Excalidraw: the simpler the format (flat-ish JSON, human-readable keys) and the clearer the "copy and translate" instruction, the more locale PRs arrive without maintainer hand-holding.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Table stakes features | HIGH | react-i18next documentation + WCAG spec + verified against PROJECT.md requirements |
| Differentiators | HIGH | i18next TypeScript docs, CI tooling (lingualdev/i18n-check), Excalidraw case study |
| Anti-features | HIGH | PROJECT.md out-of-scope list explicitly covers most; research confirms reasoning |
| Community contribution patterns | HIGH | Excalidraw Crowdin blog post (primary source), n8n locale structure (DeepWiki), Mattermost handbook reference |
| Turkish-specific linguistic concerns | MEDIUM | Turkish has simple plural forms (one/other) and no grammatical gender — verified via i18next plural docs and general linguistic reference. Actual Turkish copy accuracy depends on the translator (the maintainer). |

---

## Gaps to Address

- **Actual string count:** No automated count of hardcoded strings in `frontend/src/` was done here. A quick `grep -r "\"[A-Z]" frontend/src --include="*.tsx"` pass during the implementation phase will surface the real scope. NodeCard.tsx (1577 lines) and GenerationDialog.tsx (1365 lines) are likely to contain the majority.
- **Zustand settings store integration:** PROJECT.md says "locale state lives in a Zustand slice (or the i18n library's own provider)." Research confirms i18next's LanguageDetector + localStorage is self-sufficient and does not require a Zustand slice — but the Settings store may want to mirror the resolved language for display purposes. Clarify during implementation.
- **`i18next-browser-languageDetector` + Zustand interaction:** One known issue: `cacheUserLanguage` is async; a race condition can cause localStorage to be overwritten by the detector on load. The safe pattern is: read `localStorage.getItem('i18nextLng')` explicitly in the i18next `lng` init option rather than relying solely on the detector order. Flag for implementation.
- **Veo model label strings:** Some model labels (e.g., "Veo 3.1 Lite", "Nano Banana Pro") are product names that should NOT be translated. The extraction step must distinguish translatable UI copy from brand/product names. Define a convention: keep product names in constant files (`frontend/src/constants/`) as non-translated strings.

---

## Sources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next TypeScript Guide](https://www.i18next.com/overview/typescript)
- [i18next Fallback Documentation](https://www.i18next.com/principles/fallback)
- [i18next Plurals Documentation](https://www.i18next.com/translation-function/plurals)
- [i18next Context Documentation](https://www.i18next.com/translation-function/context)
- [Excalidraw Enabling Translations Blog Post](https://plus.excalidraw.com/blog/enabling-translations) — primary case study
- [Excalidraw on Crowdin](https://crowdin.com/project/excalidraw)
- [lingualdev/i18n-check on GitHub](https://github.com/lingualdev/i18n-check) — parity check tooling
- [Accessibility and i18n: WCAG Requirements](https://better-i18n.com/en/blog/accessibility-i18n-wcag/) — lang attribute + WCAG 3.1.1/3.1.2
- [i18next-browser-languageDetector](https://github.com/i18next/i18next-browser-languageDetector) — detection + caching
- [ICU vs i18next format tradeoffs](https://dev.to/eric_allard_97d455ae56a4e/icu-vs-i18next-choosing-the-right-format-for-your-localization-needs-1cel)
- [n8n i18n system structure (DeepWiki)](https://deepwiki.com/n8n-io/n8n/6.4-internationalization-system)
- [Mattermost Localization Handbook](https://handbook.mattermost.com/contributors/contributors/ways-to-contribute/localization)
