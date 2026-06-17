# Project Research Summary

**Project:** Flowboard — Frontend i18n Milestone (English + Turkish v1)
**Domain:** React SPA internationalization retrofit on a mature Vite + TypeScript + Zustand codebase
**Researched:** 2026-06-10
**Confidence:** HIGH

---

## Executive Summary

Flowboard's i18n milestone is a well-scoped retrofit: add react-i18next 17 + i18next 26 to an existing React 18 + Vite 5 + Zustand SPA, extract all hardcoded UI strings into flat JSON catalogs, and ship a Turkish translation alongside the English baseline. The library choice is settled — Lingui 6 is disqualified by its Vite >= 6.3 peer dep; FormatJS is overkill for flat key-value strings; react-i18next is the correct choice. No Vite plugin is required. The catalog format is locked: flat single-namespace JSON (en.json, tr.json) under frontend/src/i18n/locales/. TypeScript typed keys via CustomTypeOptions replace the absent frontend test runner as the automated correctness gate.

The project carries three live bugs that research uncovered and that must be addressed during this milestone. ResultViewer.tsx:60-73 has Vietnamese strings hardcoded in formatRelativeTime() that display for all users today, regardless of locale. api/client.ts:19 calls .toLowerCase() on a backend token used in startsWith() comparisons; a Turkish browser's locale-sensitive case fold will corrupt the match for any token containing I. index.html has lang="en" hardcoded and will never update, breaking WCAG 3.1.1 for Turkish users and every future locale. All three are small fixes; none requires architectural change. They must be scheduled explicitly or they will slip.

The highest-risk mistake in this codebase is translating user-authored content. NodeCard.tsx renders data.title (the user's node name) adjacent to UI chrome strings like "Generate" and "Save to library." A blanket grep-replace will wrap both. The pre-extraction audit establishing the user-data boundary is the most important single step in the entire milestone.

---

## Key Findings

### Recommended Stack

react-i18next 17 + i18next 26 is the locked choice. The version pairing matters: react-i18next 17 requires i18next >= 26.0.1 as a peer dep. i18next 26 introduced CustomTypeOptions strict key checking, which is the only automated parity mechanism available in a repo with no frontend test runner. i18next-browser-languagedetector@^8 handles browser detection and localStorage persistence. Both locale JSONs are bundled as static imports — no lazy loading, no HTTP requests, no render flicker. i18next-parser@^9 is a dev-only CLI for initial key extraction.

**Core technologies:**
- `react-i18next@^17.0.8`: React hooks + Trans component — deepest React 18 integration, StrictMode safe
- `i18next@^26.3.1`: Core engine — typed keys via CustomTypeOptions module augmentation
- `i18next-browser-languagedetector@^8.0.0`: Auto-detect from navigator.language, persist to localStorage
- `i18next-parser@^9` (devDep): CLI string extraction; scans .tsx/.ts; no Babel required

**What NOT to install:** i18next-http-backend (causes render flicker), i18next-resources-to-backend (only for lazy loading; bundle statically instead), any Vite plugin (Vite 5 handles JSON imports natively).

### Expected Features

**Must have (table stakes):**
- All visible UI strings extracted — including aria-labels, placeholders, store error strings, utility functions (not just JSX text nodes)
- English baseline en.json at 100% coverage, source of truth for TypeScript types
- Turkish tr.json at 100% parity with en.json
- TypeScript typed keys (CustomTypeOptions + i18next.d.ts) — compile error on missing keys
- Browser-language auto-detect on first load
- Language switcher in existing SettingsPanel
- Persist choice across reloads (localStorage)
- fallbackLng: 'en' so missing Turkish keys show English, not raw key strings
- lang attribute on html updated dynamically (WCAG 3.1.1 Level A)

**Should have (build during this milestone):**
- HMR handler in i18n.ts so locale JSON edits reflect in dev without page reload
- dir attribute hook wired (no-op for LTR now; prevents RTL debt later)
- detectLocale() synchronous read before i18n.init() — prevents cold-start rehydration flash

**Defer to v1.1:**
- Automated parity CI check — valuable but no CI workflow exists for frontend today
- aria-live announcement on locale change
- Namespace splitting (revisit when any locale file exceeds ~500 keys)
- Crowdin/Weblate integration (revisit when 3+ active translators)

### Architecture Approach

i18next is the rendering source of truth. Zustand mirrors the locale value for persistence and Settings UI display only — components always read from useTranslation(), never from Zustand directly. The i18next instance is initialized as a module-level side effect in frontend/src/i18n/i18n.ts, imported before App renders in main.tsx. Both locale JSONs are bundled as static imports — synchronous init, no Suspense, no flicker.

**Major components:**
1. `frontend/src/i18n/i18n.ts` — i18next instance init; synchronous; imported once as side effect in main.tsx
2. `frontend/src/i18n/i18next.d.ts` — TypeScript CustomTypeOptions augmentation pointing at typeof en.json
3. `frontend/src/i18n/locales/en.json` — flat English catalog; source of truth for key shape and TS types
4. `frontend/src/i18n/locales/tr.json` — flat Turkish catalog; identical key set to en.json
5. `frontend/src/store/settings.ts` — adds locale field + setLocale() action; only call site for i18n.changeLanguage()
6. `frontend/src/App.tsx` — useEffect syncing document.documentElement.lang on resolvedLanguage change

### Critical Pitfalls

1. **Translating user data** (data.title, data.prompt, data.aiBrief, ref.label, board names) — establish the user-data boundary checklist and add comments to NodeCard.tsx and ReferencesPanel.tsx before any extraction begins.

2. **Missing the invisible 40%** — aria-labels, placeholders, store error strings, and utility function strings are not JSX text nodes. Specific confirmed sites: NodeCard.tsx:170,189,192 (aria-labels), Toaster.tsx:58 (aria-label), store/generation.ts:170 (error string), api/client.ts:18-56 (humanizeBackendError), activity-meta.ts (label/status strings).

3. **Turkish dotted-i bug in humanizeBackendError (LIVE BUG)** — api/client.ts:19 calls token.toLowerCase() before startsWith() comparisons. In a tr-TR browser, "I".toLowerCase() returns the dotless "i" variant, not ASCII "i" — backend tokens with uppercase I will fail to match. Fix: token.toLocaleLowerCase("en-US").

4. **formatRelativeTime hardcoded Vietnamese (LIVE BUG)** — ResultViewer.tsx:60-73 has "vua xong", "phut truoc" etc. hardcoded plus toLocaleDateString("vi-VN"). Displays for all users today. Must be rewritten using i18n keys with {{count}} interpolation — cannot be deferred.

5. **Zustand/store translation trap** — useTranslation() is React-only; calling it in a Zustand action throws a hooks violation. Store actions and utility functions must use i18n.t() (singleton instance) directly.

---

## Must Decide Now

### 1. localStorage key for locale persistence

**Decision: use `flowboard.i18n.locale` as a dedicated key.**

The LanguageDetector plugin's lookupLocalStorage reads/writes a single string key. The existing settings blob under flowboard.settings.v1 is a serialized JSON object — the detector cannot read a nested field without custom code. A sibling key flowboard.i18n.locale keeps the integration standard. The setLocale() action writes to both the settings blob (for display) and this dedicated key (for the detector).

```
detection: {
  order: ["localStorage", "navigator"],
  lookupLocalStorage: "flowboard.i18n.locale",
  caches: ["localStorage"],
}
```

### 2. Catalog layout

**Decision: flat single-namespace JSON — frontend/src/i18n/locales/en.json and tr.json.**

No namespace splitting at this scale (<300 strings). Single translation namespace. Key naming uses dot-prefixed area segments as a flat naming convention ("board.loading", "generate.submit") — not nested objects, not separate namespace files.

### 3. Locked dependency list

```bash
# Runtime:
npm install react-i18next@^17.0.8 i18next@^26.3.1 i18next-browser-languagedetector@^8.0.0

# Dev:
npm install -D i18next-parser@^9
```

No Vite plugin. No Babel. No @types/i18next. No i18next-resources-to-backend.

### 4. Untranslatable boundary convention

**Decision: product and model names live in frontend/src/constants/ and never enter locale catalogs.**

"Veo 3.1 Lite", "Nano Banana Pro", "Omni Flash" are brand identifiers. They do not go through t(). Document this as a comment in the relevant constants files.

---

## Live Bugs Uncovered by Research

| Bug | Location | Severity | Fix |
|-----|----------|----------|-----|
| Vietnamese strings hardcoded in formatRelativeTime | frontend/src/components/ResultViewer.tsx:60-73 | HIGH — affects all users today | Rewrite function using i18n keys + {{count}} interpolation; replace toLocaleDateString("vi-VN") with toLocaleDateString(i18n.language) |
| Turkish dotted-i corrupts humanizeBackendError token matching | frontend/src/api/client.ts:19 | HIGH — silent wrong behavior in tr-TR browser | Replace .toLowerCase() with .toLocaleLowerCase("en-US") |
| lang="en" hardcoded in index.html, never updated | frontend/index.html | MEDIUM — WCAG 3.1.1 Level A failure | Add 3-line useEffect in App.tsx updating document.documentElement.lang on locale change |

---

## Implications for Roadmap

### Phase 1: Infrastructure + Audit
**Rationale:** Zero-risk foundation. No visible change to users. Establishes every architectural decision before any string is touched. Live bug fixes happen here because they are small and blocking for Turkish.

**Delivers:**
- i18n.ts wired with bundled static imports, detectLocale() helper, LanguageDetector on flowboard.i18n.locale key
- Empty en.json and tr.json scaffolded
- i18next.d.ts TypeScript augmentation in place
- I18nextProvider wrapping App in main.tsx
- locale field + setLocale() in settings store
- useEffect for document.documentElement.lang in App.tsx
- HMR handler for locale JSON files
- Full string inventory grep audit (aria-labels, store errors, utility functions — the invisible 40%)
- User-data boundary checklist documented with comments in NodeCard.tsx and ReferencesPanel.tsx
- humanizeBackendError dotted-i fix (api/client.ts:19)
- formatRelativeTime rewritten with i18n-ready structure (English strings, ready for keys in Phase 2)

**Checkpoint:** App boots, renders identically in English, TypeScript passes, no behavioral change.

### Phase 2: English Baseline Extraction
**Rationale:** Extract all hardcoded strings. English-only — no Turkish yet. TypeScript enforces key correctness after each commit.

**Delivers:**
- All JSX strings replaced with t("area.key") calls
- All aria-labels, placeholders, store error strings, utility function strings extracted
- en.json at 100% coverage
- humanizeBackendError branches use i18n.t() on the singleton instance
- activity-meta.ts labels and relativeTime strings extracted
- Product/model names confirmed as constants, zero entries in en.json

**Extraction order:** NodeCard.tsx first (highest density + user-data risk), then GenerationDialog.tsx, ResultViewer.tsx, canvas files, component files, store/utility files last.

**Checkpoint:** App renders identically in English. Any t() call with a non-existent key is a TypeScript compile error.

### Phase 3: Turkish Translation + Settings Switcher
**Rationale:** The payoff phase. Ship the actual second locale and the UI to switch to it.

**Delivers:**
- tr.json with all en.json keys translated to Turkish
- Language picker in SettingsPanel (placed as first item above model preferences; calls setLocale())
- supportedLngs: ["en", "tr"] confirmed in i18n.ts
- Detection verified: new tr-TR user gets Turkish; returning user's stored preference respected on cold start
- CONTRIBUTING.md section: "Adding a new language"
- End-to-end smoke test: switch to Turkish, run full generation flow, switch back

**Checkpoint:** Full Turkish UI. English continues to work. Language switcher is discoverable.

### Phase 4: Polish + Verification
**Rationale:** Catch what was missed. Fix layout breakage from longer Turkish strings. Confirm all checklist items.

**Delivers:**
- Manual review at 1280x800 in Turkish (highest-risk: "Olusturuluyor..." 40% longer than "Generating...", "iptal edildi" 33% longer than "canceled")
- Toaster max-height fix if long Turkish error messages overflow
- document.documentElement.lang verified in DevTools
- Pluralization cases confirmed (count-bearing strings use {{count}} with _one/_other)
- Opportunistic CSS directional property replacement on touched rules (margin-left to margin-inline-start)
- Complete "Looks Done But Isn't" checklist from PITFALLS.md

**Checkpoint:** All verification checklist items pass. Milestone is shippable.

### Phase Ordering Rationale

- Phase 1 before Phase 2: i18n infrastructure must exist before any t() call compiles
- Phase 1 includes live bug fixes: small to fix now, blocking for Turkish if deferred
- Phase 2 before Phase 3: typed keys only work after en.json is complete
- Phase 3 before Phase 4: layout review requires real translated strings at real lengths
- Audit is in Phase 1 (separate from extraction) because it produces the Phase 2 checklist — conflating them risks missing the invisible 40%

### Roadmap Hints

The 4-phase structure is the correct decomposition. The only credible alternative is merging Phase 1 and Phase 2 into "Infra + Extraction" — this loses the clean "no behavioral change" checkpoint that empty-catalog Phase 1 provides. Given the user-data boundary risk, the explicit Phase 1 audit step is worth the separate boundary.

Suggested plan split within phases:
- Phase 1: Plan A (deps + i18n.ts + provider wiring + live bug fixes), Plan B (string inventory audit + user-data boundary docs)
- Phase 2: Plan A (canvas files), Plan B (dialogs + components + stores + utilities)
- Phase 3: Plan A (tr.json translation), Plan B (SettingsPanel switcher + detection verification + CONTRIBUTING.md)
- Phase 4: Plan A (layout review + fixes + verification checklist)

### Research Flags

All four research files are HIGH confidence with primary source grounding. No phases need additional research during planning.

Standard patterns (skip research-phase): all phases. The implementation patterns are fully specified.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official npm versions confirmed; Lingui 6 Vite incompatibility confirmed via @lingui/vite-plugin peer dep; v17/v26 pairing confirmed |
| Features | HIGH | Verified against PROJECT.md out-of-scope list; WCAG 3.1.1 confirmed; Excalidraw case study as primary OSS reference |
| Architecture | HIGH | Patterns from react-i18next official docs; Vite static JSON import confirmed; StrictMode safety confirmed |
| Pitfalls | HIGH | All specific file references confirmed against actual codebase at v1.2.20 |

**Overall confidence: HIGH**

### Gaps to Address

- **Actual Turkish copy accuracy:** Structural correctness confirmed (plural forms, no gender inflection, LTR). Actual translation quality depends on maintainer's Turkish — review each tr.json value before shipping.
- **Exact string count:** No automated count run. Estimate 200-400 keys. Phase 1 grep audit produces the actual number.
- **Zustand settings store persist pattern:** Existing persist() in settings.ts uses a custom serialization pattern. Review the existing pattern before writing the setLocale() action.

---

## Open Questions

Two things need user input before planning begins:

1. **Activity feed strings — in or out?** PROJECT.md says "backend error strings kept English-only" but activity-meta.ts labels ("Auto-Prompt", "Generate image", "running", "done") are frontend-rendered UI strings, not backend strings. Should they be included in the Turkish extraction, or explicitly deferred as a known gap?

2. **humanizeBackendError — translate or leave English?** The dotted-i fix must happen regardless. The question is whether the translated error sentences appear in Turkish in the Turkish locale, or whether this function is explicitly excluded and remains English. Research recommends translating it (it is frontend UI, not a server log).

---

## Sources

### Primary (HIGH confidence)
- react-i18next npm (v17.0.8 confirmed): https://www.npmjs.com/package/react-i18next
- i18next GitHub releases (v26.3.1 confirmed): https://github.com/i18next/i18next/releases
- i18next TypeScript docs: https://www.i18next.com/overview/typescript
- @lingui/vite-plugin npm (Vite >= 6.3 peer dep confirmed): https://www.npmjs.com/package/@lingui/vite-plugin
- Lingui 6.0 announcement (April 2026, ESM-only, Vite 6+ confirmed): https://lingui.dev/blog/2026/04/22/announcing-lingui-6.0
- Direct codebase audit at v1.2.20 (2026-06-10): ResultViewer.tsx:60-73, api/client.ts:18-56, NodeCard.tsx:170,189,192, store/generation.ts:170, activity-meta.ts
- WCAG 2.1 Success Criterion 3.1.1 (Language of Page, Level A)
- Excalidraw translation case study: https://plus.excalidraw.com/blog/enabling-translations

### Secondary (MEDIUM confidence)
- react-i18next + Vite HMR pattern: react-i18next official docs
- Turkish I18n dotted/dotless-i: http://www.i18nguy.com/unicode/turkish-i18n.html
- CSS Logical Properties: W3C CSS Writing Modes Level 3 spec
- lingualdev/i18n-check: https://github.com/lingualdev/i18n-check
- i18next-browser-languagedetector README: https://github.com/i18next/i18next-browser-languageDetector

---

*Research completed: 2026-06-10*
*Ready for roadmap: yes*
