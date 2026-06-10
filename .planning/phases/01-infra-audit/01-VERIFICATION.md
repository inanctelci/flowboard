---
phase: 01-infra-audit
verified: 2026-06-10T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Open app at http://localhost:5173 and confirm zero i18next warnings in DevTools Console"
    expected: "App loads cleanly in English with no i18next-related warnings or errors in console"
    why_human: "npm run dev is a long-running server process; build succeeding is strong evidence but console output requires a live browser session"
  - test: "Set flowboard.i18n.locale=tr in DevTools Application > Local Storage, then hard-reload"
    expected: "App renders in English (tr.json values are empty strings, fallback to en activates), no first-paint flicker, no raw key strings like 'time.just_now' visible, <html lang='tr'> in DevTools Elements"
    why_human: "First-paint flicker and lang attribute update require a live browser session to observe"
  - test: "Open a board with a generated node, click a variant tile to open ResultViewer"
    expected: "The 'time' row in the metadata grid shows English phrases (e.g. 'just now', '5 min ago', '2 hr ago', '1 d ago' or locale-formatted date) — NOT Vietnamese"
    why_human: "Requires a live board with generated content to exercise the ResultViewer code path"
  - test: "In browser DevTools Console, paste: 'CAPTCHA_FAILED: NO INTERNAL WINDOW'.toLocaleLowerCase('en-US')"
    expected: "Result is 'captcha_failed: no internal window' — ASCII lowercase i, NOT dotless Turkish i (ı)"
    why_human: "Confirming the BUGS-02 dotted-i fix behaves correctly in a live browser environment (behavior may differ between JS engines in theory)"
---

# Phase 1: Infra + Audit Verification Report

**Phase Goal:** Wire react-i18next 17 + i18next 26 + browser-languagedetector 8 into the Vite/React frontend, fix three live bugs (BUGS-01 hardcoded Vietnamese, BUGS-02 Turkish dotted-i, BUGS-03 static html lang), and produce a written string inventory. App must render identically in English with zero behavioral change.
**Verified:** 2026-06-10
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run lint` exits 0 — TypeScript accepts i18n.d.ts CustomTypeOptions against en.json | VERIFIED | `tsc -b --noEmit` exits 0 (confirmed by running `npm run lint` — exit code 0, zero errors) |
| 2 | `npm run build` exits 0 — Vite bundles i18n packages and locale JSONs (539KB bundle) | VERIFIED | Build exits 0; 265 modules transformed; dist/assets/index-LoWVEc8e.js 539.11KB produced |
| 3 | Hard-reload with `tr` locale falls back to English — no flicker, no raw keys | VERIFIED (human needed) | `fallbackLng: "en"` set in i18n.ts line 54; tr.json has all 9 keys as empty strings; `lng: detectInitialLocale()` runs synchronously at module scope; resources are bundled (no HTTP load); logic is correct but live browser check required |
| 4 | ResultViewer shows English relative-time, NOT Vietnamese | VERIFIED | `grep -nE 'vừa xong\|phút trước\|giờ trước\|ngày trước\|vi-VN' frontend/src/components/ResultViewer.tsx` — zero matches; `t("time.just_now")` at line 72, `Intl.DateTimeFormat(resolvedLanguage)` at line 81; call site at line 667 passes `t, i18n.resolvedLanguage ?? "en"` |
| 5 | `humanizeBackendError` uses `toLocaleLowerCase("en-US")` — dotted-i safe | VERIFIED | `grep -n 'token.toLocaleLowerCase("en-US")' frontend/src/api/client.ts` returns one match at line 19; no bare `.toLowerCase()` found |
| 6 | `index.html` has `lang="en"`; App.tsx effect syncs `document.documentElement.lang` | VERIFIED | `index.html` line 2: `<html lang="en">`; App.tsx lines 31-33: `useEffect(() => { document.documentElement.lang = i18n.resolvedLanguage ?? "en"; }, [i18n.resolvedLanguage])` |
| 7 | STRING-INVENTORY.md exists with non-trivial content | VERIFIED | 670 lines; 428 table rows (pipe-prefixed); ~30 file sections; all required Kinds present; density summary at bottom |
| 8 | i18n module-scope init is synchronous with bundled resources | VERIFIED | `i18n.use(LanguageDetector).use(initReactI18next).init({...})` at module scope (lines 45-64 of i18n.ts); `en.json` and `tr.json` imported statically; no `i18next-http-backend` present |
| 9 | Settings store has `locale` field + `setLocale()` using dedicated `flowboard.i18n.locale` key | VERIFIED | `locale: Locale` in SettingsState interface (line 58); `LOCALE_KEY = "flowboard.i18n.locale"` (line 67); `setLocale(l)` calls `persistLocale(l)` + `void i18n.changeLanguage(l)` (lines 162-170); `locale` is NOT in PersistShape; no `persist()` call in setLocale |
| 10 | i18n side-effect import in main.tsx precedes App import | VERIFIED | `import "./i18n/i18n"` at line 6; `import { App } from "./App"` at line 9 — correct order enforced |

**Score:** 10/10 truths verified (4 require human browser confirmation for live-session behaviors)

---

### Deferred Items

None. All Phase 1 scope is implemented. INFRA-08 (CONTRIBUTING-i18n.md) is a Phase 4 item by ROADMAP.md design — not a Phase 1 gap.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/i18n/i18n.ts` | i18next singleton with synchronous module-scope init, LanguageDetector, bundled en/tr JSON, HMR handler | VERIFIED | 79 lines; chain `i18n.use(LanguageDetector).use(initReactI18next).init({...})`; `detectInitialLocale()` reads `flowboard.i18n.locale`; HMR block present; exports `default i18n` and `type Locale` |
| `frontend/src/i18n/i18n.d.ts` | TypeScript CustomTypeOptions augmentation pointing at `typeof en.json` | VERIFIED | `declare module "i18next"` with `interface CustomTypeOptions`; `resources: { translation: typeof en }` |
| `frontend/src/i18n/locales/en.json` | English catalog with 9 time.* keys using _one/_other suffix | VERIFIED | 9 keys: `time.just_now` + `time.seconds_ago_one/other` + `time.minutes_ago_one/other` + `time.hours_ago_one/other` + `time.days_ago_one/other`; all have English values |
| `frontend/src/i18n/locales/tr.json` | Turkish stub with same 9 keys, all empty strings | VERIFIED | Exactly 9 keys matching en.json; all values are `""` — i18next falls back to en at runtime |
| `frontend/src/main.tsx` | Side-effect import of i18n.ts BEFORE App import; I18nextProvider wrap | VERIFIED | `import "./i18n/i18n"` at line 6, `import { App }` at line 9; `<I18nextProvider i18n={i18n}>` wraps `<App />` inside `<React.StrictMode>` |
| `frontend/src/App.tsx` | useEffect syncing `document.documentElement.lang` to `i18n.resolvedLanguage` | VERIFIED | `const { i18n } = useTranslation()` + `useEffect(() => { document.documentElement.lang = i18n.resolvedLanguage ?? "en"; }, [i18n.resolvedLanguage])` at lines 30-33 |
| `frontend/src/store/settings.ts` | `locale` field + `setLocale()` + `LOCALE_KEY` constant + helpers | VERIFIED | All four elements present; `locale` absent from `PersistShape`; `setLocale` does NOT call `persist()`; dedicated `persistLocale()` writes to `LOCALE_KEY` only |
| `frontend/src/api/client.ts` | `humanizeBackendError` with `toLocaleLowerCase("en-US")` at line 19 | VERIFIED | Line 19: `const t = token.toLocaleLowerCase("en-US");`; no bare `.toLowerCase()` in the function |
| `frontend/src/components/ResultViewer.tsx` | `formatRelativeTime` rewritten with `t()` and `Intl.DateTimeFormat`; no Vietnamese | VERIFIED | `useTranslation` imported; `const { t, i18n } = useTranslation()` at line 94; `formatRelativeTime` takes `(iso, t, resolvedLanguage)` params; uses `t("time.just_now")`, `t("time.minutes_ago", { count })`, `t("time.hours_ago", { count })`, `t("time.days_ago", { count })`, `Intl.DateTimeFormat(resolvedLanguage)`; call site at line 667 correct |
| `frontend/package.json` | Three i18n runtime deps under `"dependencies"` | VERIFIED | `"i18next": "^26.3.1"`, `"i18next-browser-languagedetector": "^8.2.1"`, `"react-i18next": "^17.0.8"` all in `"dependencies"` (not devDependencies) |
| `.planning/phases/01-infra-audit/STRING-INVENTORY.md` | Per-file inventory covering canvas, components, stores, api, lib, activity-meta | VERIFIED | 670 lines; 428 table rows; sections for all required files; all 6 minimum-coverage files present; all Kind values used; density summary at bottom |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/src/main.tsx` | `frontend/src/i18n/i18n.ts` | side-effect import before App (line 6) | WIRED | `import "./i18n/i18n"` at line 6; `import { App }` at line 9 |
| `frontend/src/store/settings.ts` | `frontend/src/i18n/i18n.ts` | import of i18n default + Locale type; setLocale calls `i18n.changeLanguage` | WIRED | Line 2: `import i18n, { type Locale } from "../i18n/i18n"`; line 167: `void i18n.changeLanguage(l)` |
| `frontend/src/App.tsx` | `react-i18next useTranslation` | `useTranslation` hook + `useEffect` on `i18n.resolvedLanguage` | WIRED | Line 2: `import { useTranslation } from "react-i18next"`; line 30: `const { i18n } = useTranslation()`; dependency `[i18n.resolvedLanguage]` |
| `frontend/src/components/ResultViewer.tsx` | `frontend/src/i18n/locales/en.json` | `t("time.just_now")` etc. resolves against en.json keys via TypeScript augmentation | WIRED | Lines 72-81: all four `t("time.*")` calls; en.json has all 9 required keys; TypeScript enforces key correctness via i18n.d.ts |
| `frontend/src/i18n/i18n.d.ts` | `frontend/src/i18n/locales/en.json` | `typeof en` augments CustomTypeOptions.resources.translation | WIRED | `import type en from "./locales/en.json"` + `resources: { translation: typeof en }` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ResultViewer.tsx` formatRelativeTime | `t`, `i18n.resolvedLanguage` | `useTranslation()` hook → i18next singleton initialized from bundled en.json | Yes — en.json has 9 time.* keys with English values; i18next resolves them at runtime | FLOWING |
| `settings.ts` `locale` field | `locale: loadPersistedLocale()` | `loadPersistedLocale()` reads `localStorage.getItem(LOCALE_KEY)` then mirrors `i18n.resolvedLanguage` | Yes — reads real localStorage or falls back to i18n's resolved value | FLOWING |
| `App.tsx` `document.documentElement.lang` | `i18n.resolvedLanguage` | `useTranslation()` → i18next singleton | Yes — resolvedLanguage is set synchronously at module init | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run lint` exits 0 | `cd frontend && npm run lint` | `tsc -b --noEmit` exits 0; zero errors | PASS |
| `npm run build` exits 0 with i18n bundle | `cd frontend && npm run build` | Exit 0; 265 modules; 539.11KB bundle produced; en.json + tr.json bundled | PASS |
| No Vietnamese strings in ResultViewer | `grep -nE 'vừa xong\|phút trước\|giờ trước\|ngày trước\|vi-VN' frontend/src/components/ResultViewer.tsx` | Zero matches | PASS |
| BUGS-02 fix in place | `grep -n 'token.toLocaleLowerCase("en-US")' frontend/src/api/client.ts` | One match at line 19 | PASS |
| No bare toLowerCase for token | `grep -n 'token.toLowerCase()' frontend/src/api/client.ts` | Zero matches | PASS |
| BUGS-03: lang effect wired | `grep -n 'document.documentElement.lang' frontend/src/App.tsx` | One match inside useEffect at line 32 | PASS |
| i18n import order in main.tsx | `grep -n 'import' frontend/src/main.tsx` | i18n side-effect at line 6, App at line 9 | PASS |
| STRING-INVENTORY.md non-trivial | `wc -l .planning/phases/01-infra-audit/STRING-INVENTORY.md` | 670 lines | PASS |
| Live dev server boot | `npm run dev` | SKIP — long-running process; build passes as proxy evidence | SKIP (human) |

---

### Probe Execution

Step 7c: SKIPPED — no probe scripts exist (`find scripts -path '*/tests/probe-*.sh'` returns empty; neither PLAN references probes).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-01 | 01-01-PLAN | react-i18next@^17 + i18next@^26 + languagedetector@^8 initialized at module scope | SATISFIED | All 3 packages in `dependencies`; `i18n.use(LanguageDetector).use(initReactI18next).init({...})` at module scope in i18n.ts |
| INFRA-02 | 01-01-PLAN | Missing translation keys fall back to English | SATISFIED | `fallbackLng: "en"` at i18n.ts line 54; tr.json has all keys as empty strings, i18next falls back to en |
| INFRA-03 | 01-01-PLAN | TypeScript compile error on missing t() key via CustomTypeOptions | SATISFIED | i18n.d.ts augments `CustomTypeOptions` with `typeof en`; `npm run lint` exits 0 confirming the augmentation compiles cleanly |
| INFRA-04 | 01-01-PLAN | Locale state in i18next as source of truth; Settings Zustand store mirrors it | SATISFIED | `locale: loadPersistedLocale()` in store; `setLocale()` calls `i18n.changeLanguage()`; i18next is authoritative |
| INFRA-05 | 01-01-PLAN | Locale persists via `flowboard.i18n.locale` localStorage key | SATISFIED | `LOCALE_KEY = "flowboard.i18n.locale"` in settings.ts; `lookupLocalStorage: "flowboard.i18n.locale"` in i18n.ts detection config; both files contain the key |
| INFRA-06 | 01-01-PLAN | No first-paint flicker — bundled catalogs, synchronous init | SATISFIED | Static JSON imports in i18n.ts; `lng: detectInitialLocale()` runs synchronously; no i18next-http-backend; `npm run build` bundles all locale data |
| INFRA-07 | 01-01-PLAN + 01-02-PLAN | Catalogs at `frontend/src/i18n/locales/en.json` and `tr.json` in flat single-namespace layout | SATISFIED | Both files exist at exact paths; flat structure (no nested namespace keys); confirmed by `ls frontend/src/i18n/locales/` |
| BUGS-01 | 01-01-PLAN | `formatRelativeTime` rewritten to use i18n keys; no Vietnamese strings | SATISFIED | Zero matches for Vietnamese strings; `t("time.just_now")` + `t("time.minutes_ago", { count })` etc. present; `Intl.DateTimeFormat(resolvedLanguage)` replaces `toLocaleDateString("vi-VN")` |
| BUGS-02 | 01-01-PLAN | `humanizeBackendError` uses `toLocaleLowerCase("en-US")` at line 19 | SATISFIED | Confirmed at line 19; no bare `.toLowerCase()` present |
| BUGS-03 | 01-01-PLAN | `index.html` has `lang="en"`; App.tsx syncs `document.documentElement.lang` on change | SATISFIED | `<html lang="en">` in index.html; useEffect with `[i18n.resolvedLanguage]` dependency in App.tsx |

---

### ROADMAP.md Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| C1 | `npm run dev` loads in browser in English; `npm run lint` passes | VERIFIED (partial human) | `npm run lint` exits 0 confirmed; `npm run build` exits 0 (strong proxy); dev server boot requires human |
| C2 | Hard-reload with `tr` locale renders cleanly in English, no flicker | VERIFIED (human needed) | Logic is complete and correct in code; live browser test required |
| C3 | ResultViewer shows English relative-time, not Vietnamese | VERIFIED | Zero Vietnamese strings in file; all time.* t() calls in place; requires live board for full confirmation |
| C4 | `humanizeBackendError` with `tr-TR` browser locale — `startsWith("public_error_")` matches correctly | VERIFIED | `toLocaleLowerCase("en-US")` fix at line 19 is in place and correct |
| C5 | STRING-INVENTORY.md exists with non-trivial content | VERIFIED | 670 lines; 428 table rows; all required file sections present; all Kind values used; density summary present; Phase 2 Consumption Contract present |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/store/board.ts` | 70 | JSDoc comment contains `"5 phút trước"` (Vietnamese) | INFO | Comment-only; zero runtime impact; executor noted as known carry-over; deferred to Phase 2 — no user-visible output |

**Debt marker scan:** No `TBD`, `FIXME`, or `XXX` markers found in Phase 1 modified files. The board.ts comment is a JSDoc description, not a debt marker.

---

### Human Verification Required

The following items require a live browser session. All automated evidence is consistent with correct behavior; these items confirm the live runtime matches the code.

#### 1. Dev server boot + console clean

**Test:** Run `cd frontend && npm run dev`, open http://localhost:5173, inspect DevTools Console
**Expected:** App loads in English; zero i18next-related warnings or errors; Network tab shows no unexpected translation file fetches
**Why human:** npm run dev is a long-running process that cannot be automated in verification; build success is strong but not identical evidence

#### 2. Turkish locale fallback + html lang attribute

**Test:** DevTools Application > Local Storage > set `flowboard.i18n.locale = "tr"`, hard-reload (Cmd+Shift+R)
**Expected:** App renders English strings (tr.json is all empty, fallback to en); NO first-paint flicker (no flash of keys or wrong language); NO raw key strings like `time.just_now` visible anywhere; DevTools Elements shows `<html lang="tr">`
**Why human:** First-paint flicker and DOM attribute confirmation require live browser observation

#### 3. ResultViewer English relative-time display

**Test:** Open a board with at least one generated node (image or video). Click a variant tile to open ResultViewer. Inspect the metadata grid "time" row.
**Expected:** Shows English phrase (`"just now"`, `"5 min ago"`, `"2 hr ago"`, `"1 d ago"`, or locale-formatted date like `"Jun 1, 2026"`) — NOT Vietnamese (`vừa xong`, `phút trước`, `giờ trước`, `ngày trước`)
**Why human:** Requires a live board with generated content to exercise the ResultViewer code path with a real `data.renderedAt` timestamp

#### 4. BUGS-02 dotted-i browser confirmation

**Test:** In DevTools Console, paste: `"CAPTCHA_FAILED: NO INTERNAL WINDOW".toLocaleLowerCase("en-US")`
**Expected:** Result is `"captcha_failed: no internal window"` — lowercase ASCII `i`, NOT dotless Turkish `ı`
**Why human:** Confirms the fix behaves correctly in the live browser JavaScript engine (V8 behavior confirmation)

---

### Gaps Summary

No gaps found. All 10 REQ-IDs are satisfied by the implementation. All 5 ROADMAP success criteria have verifiable evidence in the codebase. The 4 human verification items are browser confirmation of behaviors whose logic is already correct in code — they are expected to pass.

**Notable observation:** The `board.ts` line 70 JSDoc comment `// Powers the "5 phút trước" relative-time display in ResultViewer.` is a stale JSDoc description in a code comment. It has zero runtime impact (comments are not rendered to users). The executor correctly identified this as a known carry-over deferred to Phase 2. It is not a gap — it is a stale comment that Phase 2 cleanup should update.

**Inventory off-by-one:** STRING-INVENTORY.md records Toaster.tsx aria-label at line 58; the actual code has it at line 57 (57 is the `aria-label` attribute line, 58 is the closing `>`). This is a trivial off-by-one with no functional consequence for Phase 2 extraction.

---

_Verified: 2026-06-10_
_Verifier: Claude (gsd-verifier)_
