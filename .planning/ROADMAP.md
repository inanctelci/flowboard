# ROADMAP — Flowboard Frontend i18n Milestone

**Milestone:** Frontend internationalization with English + Turkish at v1
**Created:** 2026-06-10
**Mode:** MVP — app must run in English at every phase boundary
**Granularity:** Coarse (3–5 phases)
**Coverage:** 30/30 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Infra + Audit** — Wire the i18n layer, fix live bugs, produce the extraction inventory. App stays English throughout; no strings change.
- [ ] **Phase 2: English Extraction** — Replace every hardcoded UI string with `t()` calls; build `en.json` to 100% coverage. TypeScript enforces key correctness.
- [ ] **Phase 3: Turkish + Switcher** — Ship `tr.json` at full parity and the SettingsPanel language picker. The milestone becomes genuinely usable in Turkish.
- [ ] **Phase 4: Polish + Verify** — Layout review at Turkish string lengths, final cleanup, contributor docs, verification checklist sign-off.

---

## Phase Details

### Phase 1: Infra + Audit
**Goal**: The i18n layer is live in the app (packages installed, `i18n.ts` initialized, provider mounted, Zustand locale field added, TypeScript augmentation in place) and all three live bugs are fixed. The app renders identically in English with zero behavioral change. A complete string inventory exists as the input to Phase 2.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, BUGS-01, BUGS-02, BUGS-03
**Success Criteria** (what must be TRUE):
  1. Maintainer runs `npm run dev`, the app loads in the browser, displays English strings unchanged, and `npm run lint` (`tsc -b --noEmit`) passes with zero errors — confirming the i18n scaffold and TypeScript augmentation are correctly wired.
  2. Maintainer hard-reloads with `flowboard.i18n.locale=tr` set in localStorage and the app still renders (gracefully falls back to English since `tr.json` is empty), with no first-paint flicker and no console errors.
  3. `ResultViewer` relative-time display shows English phrases (not Vietnamese) for all users — confirming BUGS-01 rewrite landed.
  4. With the browser locale set to `tr-TR` in DevTools, triggering a backend error that traverses `humanizeBackendError` does not corrupt the `startsWith("public_error_")` match — confirming the BUGS-02 dotted-i fix.
  5. Maintainer has a written string inventory (grep output or doc) listing every non-JSX string site (aria-labels, store errors, utility functions, activity-meta labels) to use as Phase 2 checklist.
**Plans**: TBD

---

### Phase 2: English Extraction
**Goal**: Every hardcoded user-visible string in `frontend/src/` — JSX text nodes, attribute props (`aria-label`, `title`, `placeholder`), store error strings, utility function strings, and activity-meta labels — is replaced with a `t()` call, and `en.json` has complete coverage. The TypeScript compiler rejects any `t()` call with a key absent from `en.json`. The app still renders in English, identically to before.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: EXTRACT-01, EXTRACT-02, EXTRACT-03, EXTRACT-04, EXTRACT-05, EXTRACT-06, EXTRACT-07
**Success Criteria** (what must be TRUE):
  1. `npm run lint` passes and calling `t("any.nonexistent.key")` in any `.tsx` or `.ts` file under `frontend/src/` is a TypeScript compile error — confirming typed-key enforcement is active and `en.json` is the sole source of truth.
  2. Maintainer searches `frontend/src/` for any hardcoded English phrase that was in the app before this phase (e.g. `"Generate"`, `"Cancel"`, `"Save to library"`) and finds zero results outside `frontend/src/i18n/` and `frontend/src/constants/` — confirming 100% extraction.
  3. Product and model names (`"Veo 3.1 Lite"`, `"Nano Banana Pro"`, `"Omni Flash"`) do not appear as keys or values in `en.json` — they remain in `frontend/src/constants/`.
  4. The app renders in the browser with the same English UI as before extraction — no blank labels, no raw key strings visible, no console translation-miss warnings.
  5. Store error strings (from `generation.ts` and `humanizeBackendError`) and activity-meta labels appear in English in the UI when their code paths are exercised — confirming non-JSX extraction is complete.
**Plans**: TBD

---

### Phase 3: Turkish + Switcher
**Goal**: `tr.json` exists at full key parity with `en.json` with maintainer-reviewed Turkish copy, and the Settings panel has a language picker that switches the entire app to Turkish without a page reload. The milestone is now genuinely usable end-to-end in Turkish.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: TR-01, TR-02, TR-03, TR-04, SWITCH-01, SWITCH-02, SWITCH-03, SWITCH-04
**Success Criteria** (what must be TRUE):
  1. Maintainer opens the Settings panel and sees a language selector listing `English` and `Türkçe`; selecting `Türkçe` immediately re-renders the entire app in Turkish — all chrome strings, button labels, dialogs, toasts, and activity-feed labels change without a page reload.
  2. A new user with `navigator.language = "tr-TR"` (simulated via DevTools) gets Turkish on first load without ever touching the Settings panel — confirming browser auto-detect works.
  3. Switching back to English from Turkish re-renders the full app correctly in English, and a hard reload restores whichever language was last selected — confirming persistence via `flowboard.i18n.locale` is working.
  4. A grep for hardcoded user-facing English strings in `frontend/src/` (excluding `constants/` and `i18n/`) returns zero results — confirming TR-04 inventory check passes.
  5. `document.documentElement.lang` reads `"tr"` in DevTools after switching to Turkish, and `"en"` after switching back — confirming SWITCH-04 screen-reader correctness.
**Plans**: TBD
**UI hint**: yes

---

### Phase 4: Polish + Verify
**Goal**: The milestone is shippable. Layout holds at Turkish string lengths, all verification checklist items pass, the contributor documentation is written so a community member can add a new locale by following the guide.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04, INFRA-08
**Success Criteria** (what must be TRUE):
  1. Maintainer manually drives a full generation flow end-to-end in Turkish (create board, upload refs, compose image, generate i2v video, cancel a run, check activity feed, trigger a backend error) and back to English mid-session with no console errors and no untranslated strings visible — confirming VERIFY-01.
  2. At 1280×800 in Turkish locale, no button text is clipped, no dialog header wraps unexpectedly, no activity badge overflows — specifically `"Oluşturuluyor…"` and `"iptal edildi"` fit their containers — confirming VERIFY-02.
  3. `npm run lint` (`tsc -b --noEmit`) passes with the typed-key declaration in place — confirming VERIFY-03.
  4. With browser locale set to Turkish in DevTools sensors, triggering a `public_error_*` backend error causes `humanizeBackendError` to match the token and return a translated Turkish string — confirming VERIFY-04.
  5. `CONTRIBUTING-i18n.md` exists, describes adding a new locale (copy `en.json`, translate values, register in `i18n.ts`, open a PR), and a community contributor could follow it without reading any source code.
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infra + Audit | 0/2 | Not started | - |
| 2. English Extraction | 0/2 | Not started | - |
| 3. Turkish + Switcher | 0/2 | Not started | - |
| 4. Polish + Verify | 0/1 | Not started | - |

---

## Requirement Coverage

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1: Infra + Audit | INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, BUGS-01, BUGS-02, BUGS-03 | 10 |
| Phase 2: English Extraction | EXTRACT-01, EXTRACT-02, EXTRACT-03, EXTRACT-04, EXTRACT-05, EXTRACT-06, EXTRACT-07 | 7 |
| Phase 3: Turkish + Switcher | TR-01, TR-02, TR-03, TR-04, SWITCH-01, SWITCH-02, SWITCH-03, SWITCH-04 | 8 |
| Phase 4: Polish + Verify | VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04, INFRA-08 | 5 |
| **Total** | | **30/30** |

---

## Key Decisions Locked (from research)

| Decision | Source |
|----------|--------|
| `react-i18next@^17` + `i18next@^26` + `i18next-browser-languagedetector@^8` | SUMMARY.md — Lingui 6 disqualified (Vite >=6.3 peer dep); FormatJS overkill |
| Flat single-namespace `en.json` / `tr.json` under `frontend/src/i18n/locales/` | SUMMARY.md — <300 keys; namespace splitting adds friction for OSS contributors |
| `flowboard.i18n.locale` dedicated localStorage key for the detector | SUMMARY.md — sibling to `flowboard.settings.v1`, standard LanguageDetector integration |
| `CustomTypeOptions` declaration merging in `i18next.d.ts` for typed keys | SUMMARY.md — only automated correctness gate available without a frontend test runner |
| i18next as rendering source of truth; Zustand mirrors locale for Settings UI only | ARCHITECTURE.md — prevents partial re-render on language switch |
| BUGS-01/02/03 fixed in Phase 1 | SUMMARY.md — BUGS-01 blocks extraction (Vietnamese strings must be rewritten before keys can be assigned); BUGS-02 blocks Turkish correctness; BUGS-03 is 3 lines |
| INFRA-08 (CONTRIBUTING-i18n.md) deferred to Phase 4 | Catalog key shape can only be documented accurately after `en.json` is frozen |

---

*Last updated: 2026-06-10 — Roadmap created*
