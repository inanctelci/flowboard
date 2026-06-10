---
phase: 03-turkish-switcher
verified: 2026-06-10T21:00:00Z
status: gaps_found
score: 5/8 must-haves verified
gaps:
  - truth: "A grep for hardcoded user-facing English strings in frontend/src/ (excluding constants/ and i18n/) returns zero results (TR-04, SC4)"
    status: failed
    reason: "Six user-visible hardcoded English strings remain across four active components. The ROADMAP SC4 contract for Phase 3 requires zero results; the grep returns non-zero results."
    artifacts:
      - path: "frontend/src/components/AiProviderBadge.tsx"
        issue: "L105 — `<span className=\"ai-provider-badge__label\">Setup AI</span>` — hardcoded text node; explicitly deferred from Phase 2 gap closure (02-GAPS-SUMMARY.md) and not addressed in Phase 3"
      - path: "frontend/src/components/settings/ProviderCard.tsx"
        issue: "L75 — `<span className=\"provider-card__current-badge\">Active</span>` — hardcoded text node shown when a provider is the current active selection; no i18n key exists for this string"
      - path: "frontend/src/components/SettingsPanel.tsx"
        issue: "L344-346 — three-line logout hint (\"Clears the cached identity and tells the extension to drop / its in-memory token. The WebSocket stays open so signing / back in doesn't require a Chrome restart.\") rendered in a settings-panel__hint div; no i18n key exists"
      - path: "frontend/src/components/ReferencesPanel.tsx"
        issue: "L322 title=\"Rename\" (duplicate — aria-label is extracted but title attr is not); L336 `\"Confirm delete reference\"` aria-label; L341 `\"Click again to confirm — auto-cancels in 3s\"` title; L345 `\"Confirm?\"` text node — four hardcoded confirm-delete flow strings"
    missing:
      - "Add i18n key `provider.setup_ai_cta` → \"Setup AI\" to en.json and tr.json; replace L105 with `{t(\"provider.setup_ai_cta\")}`"
      - "Add i18n key `provider.active_badge` → \"Active\" to en.json and tr.json; replace ProviderCard L75 with `{t(\"provider.active_badge\")}`"
      - "Add i18n key `settings.sign_out_hint` for logout hint to en.json and tr.json; replace SettingsPanel L343-347 JSX div content with `{t(\"settings.sign_out_hint\")}`"
      - "Add i18n keys `refs.rename_title`, `refs.confirm_delete_aria`, `refs.confirm_delete_title`, `refs.confirm_label` to en.json and tr.json; replace four hardcoded strings in ReferencesPanel.tsx confirm-delete flow"
---

# Phase 03: Turkish + Language Switcher Verification Report

**Phase Goal:** `tr.json` at full key parity with `en.json` with maintainer-reviewed Turkish copy, and the Settings panel has a language picker that switches the entire app to Turkish without a page reload.
**Verified:** 2026-06-10T21:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | TR-01: `tr.json` exists at full key parity with `en.json` (every key in `en.json` has a Turkish value; no missing keys) | ✓ VERIFIED | Python set comparison: 417 EN keys, 417 TR keys, sets identical, 0 empty TR values |
| 2 | TR-02: Turkish translations reviewed; no MT placeholders | ? UNCERTAIN (human needed) | Executor produced first-pass Turkish following locked quality guidance (native Turkish, brand names preserved, imperative buttons, sentence case). Quality is high based on spot-check (see translation quality table below). Requires native-speaker maintainer review of the PR diff to become VERIFIED. |
| 3 | TR-03: Plural-needing keys use `_one`/`_other` suffix convention | ✓ VERIFIED | 21 plural keys confirmed: `time.seconds_ago_one`/`_other`, `time.minutes_ago_one`/`_other`, `time.hours_ago_one`/`_other`, `time.days_ago_one`/`_other`, `sidebar.boards_pushed_one`/`_other`, `activity.*_one`/`_other`. Both suffixes carry the same translation value (correct for Turkish single-plural form). |
| 4 | TR-04: grep for hardcoded user-facing English strings in `frontend/src/` (excluding `constants/` and `i18n/`) returns zero results | ✗ FAILED | 6 hardcoded user-visible strings remain in 4 active components: `AiProviderBadge.tsx` L105 ("Setup AI"), `ProviderCard.tsx` L75 ("Active"), `SettingsPanel.tsx` L344-346 (logout hint 3 lines), `ReferencesPanel.tsx` L322/336/341/345 (4 confirm-delete flow strings) |
| 5 | SWITCH-01: Browser auto-detects locale from `navigator.language`; falls back to English for unsupported languages | ✓ VERIFIED | `i18n.ts` L29-42: `detectInitialLocale()` reads localStorage first, then `navigator.language.split("-")[0].toLowerCase()`, returns `"en"` if not in `SUPPORTED = ["en", "tr"]`. `fallbackLng: "en"` and `supportedLngs: ["en", "tr"]` confirm the fallback contract. |
| 6 | SWITCH-02: Settings panel has a language dropdown listing `English` and `Türkçe` by native names, bound to locale store | ✓ VERIFIED | `SettingsPanel.tsx` L100-103: `LOCALES` constant with `{ code: "en", label: "English" }` and `{ code: "tr", label: "Türkçe" }`. L189: `value={locale}`. L190: `onChange={(e) => setLocale(e.target.value as Locale)}`. L114-115: `locale` and `setLocale` from `useSettingsStore`. |
| 7 | SWITCH-03: Changing the language re-renders the entire app without a page reload | ✓ VERIFIED | `settings.ts` L162-168: `setLocale(l)` calls `set({ locale: l })` (updates Zustand state) + `persistLocale(l)` (writes to localStorage) + `void i18n.changeLanguage(l)` (triggers react-i18next re-render of all `useTranslation()` consumers). The call chain is unbroken. |
| 8 | SWITCH-04: Changing language updates `document.documentElement.lang` | ✓ VERIFIED | `App.tsx` L31-33: `useEffect(() => { document.documentElement.lang = i18n.resolvedLanguage ?? "en"; }, [i18n.resolvedLanguage])` — executes on every `resolvedLanguage` change, which is set by `i18n.changeLanguage()`. Phase 1 wiring confirmed present. |

**Score:** 5/8 truths verified (1 FAILED — BLOCKER, 1 UNCERTAIN — human needed)

---

### Translation Quality Spot-Check

| Key | EN Value | TR Value | Assessment |
|-----|----------|----------|------------|
| `app.loading_board` | "Loading board…" | "Pano yükleniyor…" | Natural, idiomatic |
| `dialog.title_video` | "Generate video" | "Video üret" | Imperative form, correct |
| `settings.sign_out` | "Sign out from Flow account" | "Flow hesabından oturumu kapat" | Natural, full |
| `gen.no_board_loaded` | "no board loaded" | "pano yüklenmedi" | Matches lowercase style |
| `activity.just_now` | "just now" | "az önce" | Native idiom |
| `time.minutes_ago_one` | "{{count}} min ago" | "{{count}} dk önce" | Natural abbreviation |
| `sidebar.boards_pushed_one` | "Pushed {{count}} board to Flow ✓" | "{{count}} pano Flow'a aktarıldı ✓" | Brand name preserved, natural |
| `settings.language_section_label` | "Language" | "Dil" | Correct |
| `settings.language_picker_aria` | "Choose interface language" | "Arayüz dilini seç" | Imperative, natural |
| `settings.language_picker_desc` | "Choose the language Flowboard's UI is displayed in." | "Flowboard arayüzünün dilini seçin." | Brand preserved, natural sentence |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `frontend/src/i18n/locales/tr.json` | 417 keys, all non-empty, full parity with en.json | ✓ VERIFIED | 417 keys, 0 empty values, exact key-set parity with en.json. Commits: `1dce091` (414 keys), `933f23b` (+3 picker keys) |
| `frontend/src/i18n/locales/en.json` | 417 keys (414 original + 3 picker keys) | ✓ VERIFIED | 417 keys. 3 new picker keys: `settings.language_section_label`, `settings.language_picker_aria`, `settings.language_picker_desc` |
| `frontend/src/components/SettingsPanel.tsx` | Language picker section with `<select>` bound to locale store | ✓ VERIFIED | L100-103 LOCALES constant; L114-115 locale/setLocale from store; L181-196 picker section rendering. Commit: `f95f151` |
| `frontend/src/i18n/i18n.ts` | LanguageDetector chain: localStorage → navigator → en | ✓ VERIFIED | `detectInitialLocale()` + `detection: { order: ["localStorage", "navigator"] }` with `lookupLocalStorage: "flowboard.i18n.locale"` |
| `frontend/src/store/settings.ts` | `setLocale()` calls `i18n.changeLanguage()` and `persistLocale()` | ✓ VERIFIED | L162-168: `set({ locale: l })` + `persistLocale(l)` + `void i18n.changeLanguage(l)` |
| `frontend/src/App.tsx` | `document.documentElement.lang` synced via useEffect | ✓ VERIFIED | L31-33: effect on `i18n.resolvedLanguage` (Phase 1 wiring, unchanged) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SettingsPanel.tsx` | `useSettingsStore.locale` | `useSettingsStore((s) => s.locale)` | ✓ WIRED | L114: locale read from store, value passed to select element |
| `SettingsPanel.tsx` onChange | `useSettingsStore.setLocale` | `(e) => setLocale(e.target.value as Locale)` | ✓ WIRED | L115 + L190: setLocale bound; calls i18n.changeLanguage via store |
| `store/settings.ts` setLocale | `i18n.changeLanguage` | `void i18n.changeLanguage(l)` | ✓ WIRED | L167: direct call to i18n singleton imported from i18n.ts |
| `i18n.ts` | `tr.json` | `import tr from "./locales/tr.json"` | ✓ WIRED | L19: static JSON import; bundled (not HTTP-loaded); all 417 keys loaded synchronously |
| `App.tsx` | `document.documentElement.lang` | `useEffect([i18n.resolvedLanguage])` | ✓ WIRED | L31-33: effect fires whenever resolvedLanguage changes |
| `AiProviderBadge.tsx` | en.json | `t("provider.setup_ai_cta")` | ✗ NOT_WIRED | L105: "Setup AI" rendered as hardcoded literal; no i18n key exists |
| `ProviderCard.tsx` | en.json | `t("provider.active_badge")` | ✗ NOT_WIRED | L75: "Active" rendered as hardcoded literal; no i18n key exists |
| `SettingsPanel.tsx` logout hint | en.json | `t("settings.sign_out_hint")` | ✗ NOT_WIRED | L344-346: three-line hint rendered as JSX text node without t() wrapper |
| `ReferencesPanel.tsx` confirm-delete | en.json | `t("refs.confirm_*")` | ✗ NOT_WIRED | L322/336/341/345: four hardcoded strings in confirm-delete flow |

---

### Data-Flow Trace (Level 4)

Not applicable. Phase 3 concerns translation catalog and locale-switching — no new data fetching introduced.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| en.json / tr.json key parity | `python3` set comparison | 417/417, sets identical, 0 empty TR values | ✓ PASS |
| All placeholder tokens preserved | `python3` regex comparison of `{{...}}` tokens | 0 mismatches across all 417 keys | ✓ PASS |
| Plural suffix convention followed | `python3` filter for `_one`/`_other` keys | 21 plural keys, all with correct suffix pairs and non-empty Turkish values | ✓ PASS |
| `npm run lint` (tsc -b --noEmit) | `npm run lint` | Exit 0, no TypeScript errors | ✓ PASS |
| `npm run build` | `npm run build` | Built in 836ms, 265 modules, exit 0 | ✓ PASS |
| SettingsPanel picker rendered with locale binding | grep for `value={locale}` + `setLocale` | Found L189-190 | ✓ PASS |
| Hardcoded "Setup AI" active in production | grep for literal text node + Toolbar import check | AiProviderBadge imported in Toolbar.tsx L5+L67; L105 hardcoded | ✗ FAIL (TR-04 gap) |
| Hardcoded "Active" in ProviderCard | grep | L75 confirmed, used in AiProvidersSection L298+L302 | ✗ FAIL (TR-04 gap) |
| SettingsPanel logout hint hardcoded | grep | L344-346 confirmed JSX text node, no t() | ✗ FAIL (TR-04 gap) |
| ReferencesPanel confirm-delete strings | grep | L322/336/341/345 confirmed | ✗ FAIL (TR-04 gap) |

---

### Probe Execution

No probes declared or applicable for this translation/switcher phase.

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| TR-01 | `tr.json` at full key parity with `en.json` | ✓ SATISFIED | 417/417 keys, exact parity, 0 empty values |
| TR-02 | Maintainer-reviewed Turkish, no MT placeholders | ? NEEDS HUMAN | First-pass translations follow native conventions; maintainer review via PR diff required |
| TR-03 | `_one`/`_other` plural suffix convention | ✓ SATISFIED | 21 plural pairs with correct suffix; Turkish single-plural form correctly mirrored |
| TR-04 | Zero remaining hardcoded user-facing English strings in `frontend/src/` (excl. constants/ + i18n/) | ✗ BLOCKED | 6 hardcoded strings in 4 active components: AiProviderBadge "Setup AI", ProviderCard "Active", SettingsPanel logout hint (3 lines), ReferencesPanel confirm-delete (4 strings) |
| SWITCH-01 | Browser auto-detect from navigator.language; fallback to English | ✓ SATISFIED | `detectInitialLocale()` logic verified; `supportedLngs: ["en", "tr"]` enforces fallback |
| SWITCH-02 | SettingsPanel dropdown with native names English + Türkçe | ✓ SATISFIED | LOCALES constant hardcoded (intentionally); bound to store locale field |
| SWITCH-03 | Language change re-renders app without page reload | ✓ SATISFIED | `setLocale → i18n.changeLanguage → useTranslation re-render` chain fully wired |
| SWITCH-04 | `document.documentElement.lang` updated on language change | ✓ SATISFIED | App.tsx useEffect on `i18n.resolvedLanguage` — Phase 1 wiring confirmed intact |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/AiProviderBadge.tsx` | 105 | `"Setup AI"` hardcoded text node | BLOCKER | Visible CTA renders English in Turkish mode; shown in Toolbar for unconfigured users |
| `frontend/src/components/settings/ProviderCard.tsx` | 75 | `"Active"` hardcoded badge | BLOCKER | Shows as English badge when a provider is currently active; renders in AI Providers section |
| `frontend/src/components/SettingsPanel.tsx` | 344-346 | Logout hint paragraph hardcoded (3 JSX text lines) | BLOCKER | Visible to logged-in users in Turkish mode; renders below sign-out button |
| `frontend/src/components/ReferencesPanel.tsx` | 322, 336, 341, 345 | Four confirm-delete flow strings hardcoded (`title="Rename"`, aria-label, title, text node) | BLOCKER | Confirm-delete UX entirely English-only; active in Turkish mode when user deletes a reference |

No `TBD`, `FIXME`, or `XXX` debt markers found in Phase 3 modified files (`tr.json`, `en.json`, `SettingsPanel.tsx`).

**Note on do-not-translate strings accepted as non-blockers:**

- `AccountPanel.tsx` L153: `"Flow account"` — fallback for missing profile name. "Flow" is the Google product brand name; "Flow account" is a composite brand reference similar to "Ultra"/"Pro" tier labels. Not a blocker.
- `SettingsPanel.tsx` L149/151: `"Ultra"` / `"Pro"` — Google Flow paid plan tier brand names explicitly marked do-not-translate in Phase 2 gap closure.
- `ProviderCard.tsx` `PROVIDER_META` names (`"Claude Code"`, `"Gemini CLI"`, `"OpenAI Codex"`) — brand identifiers with explicit `// i18n: do-not-translate` comment.
- `SettingsPanel.tsx` `LOCALES` `"English"` / `"Türkçe"` — intentionally not translated (native language names by convention); comment present.
- `ChatSidebar.tsx` — entire component commented out in `App.tsx`; not rendered.

---

### Human Verification Required

#### 1. Native Turkish Translation Quality Review

**Test:** Maintainer (native Turkish speaker) reviews `tr.json` diff in the PR. Pay particular attention to the 10 notable choices documented in 03-SUMMARY.md (Generate → Üret, Refine → İyileştir, Activity → Aktivite, Vision → Görme, Planner → Planlayıcı, Pipeline → pipeline, Status badge forms).
**Expected:** All translations read naturally to a Turkish speaker; no machine-translation artifacts (literal word-for-word translations, unnatural phrasing); brand names preserved verbatim (Flowboard, Veo, Nano Banana, Omni Flash, Claude Code, Gemini CLI, OpenAI Codex).
**Why human:** Linguistic naturalness and tone cannot be verified programmatically. The executor produced a thoughtful first pass but TR-02 explicitly requires maintainer review as a native speaker.

#### 2. Live Language Switch End-to-End

**Test:** Open the app in browser, open Settings panel, select Türkçe. Observe the entire visible UI.
**Expected:** All chrome strings, button labels, modal titles, toaster messages, and activity-feed labels switch to Turkish immediately — no page reload. The known-untranslated strings (AiProviderBadge "Setup AI", ProviderCard "Active", SettingsPanel logout hint, ReferencesPanel confirm-delete) will still appear in English and should be verified as the only un-translated strings visible.
**Why human:** Hot-swap re-render and full visual correctness requires a running browser. Code inspection confirms the wiring is correct but cannot observe actual rendering.

#### 3. Browser Auto-Detect Simulation

**Test:** In Chrome DevTools → Sensors → Locale, set to `tr-TR`. Clear localStorage (`flowboard.i18n.locale`). Hard reload the app.
**Expected:** App loads in Turkish without the user touching the Settings panel.
**Why human:** Requires a running browser with DevTools and localStorage manipulation. Code inspection of `detectInitialLocale()` confirms the logic is correct.

#### 4. Persistence Across Hard Reload

**Test:** Switch to Türkçe via Settings panel, then hard reload (Ctrl+Shift+R / Cmd+Shift+R).
**Expected:** App reloads in Turkish (locale persisted to `flowboard.i18n.locale` in localStorage). Switch back to English, hard reload — app reloads in English.
**Why human:** Requires a running browser. Code confirms `persistLocale(l)` is called in `setLocale()` and `detectInitialLocale()` reads `flowboard.i18n.locale` first.

---

### Gaps Summary

**One category of gaps blocks the TR-04 success criterion.** The ROADMAP Phase 3 SC4 states: "A grep for hardcoded user-facing English strings in `frontend/src/` (excluding `constants/` and `i18n/`) returns zero results." This grep currently returns 8 hits across 4 files.

**Root cause:** Phase 3 did not include a TR-04 remediation pass as a task. The SUMMARY documents only 4 tasks: translate tr.json (414 keys), add 3 picker keys, add Settings picker, and run lint/build verification. The gap items were either (a) explicitly deferred from Phase 2 ("Setup AI" in AiProviderBadge.tsx was noted in 02-GAPS-SUMMARY.md L128 as "Flagged here for Phase 3 / re-verification") or (b) not discovered in prior phases (ProviderCard "Active" badge, SettingsPanel logout hint, ReferencesPanel confirm-delete flow).

**Impact:** With Turkish active, these 4 components render English text, breaking the user experience for Turkish-locale users in the AI provider setup flow, references panel, and settings sign-out area.

**Fix scope:** Approximately 8 new i18n keys needed across 4 files. The fix is mechanical (same pattern as Phase 2 gap closure) and does not require architectural changes.

---

_Verified: 2026-06-10T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
