---
phase: "03"
plan: "03"
subsystem: "i18n / UI"
tags: [turkish, i18n, settings, language-picker]
dependency_graph:
  requires: [02-english-extraction]
  provides: [tr-locale, language-switcher]
  affects: [SettingsPanel, tr.json, en.json]
tech_stack:
  added: []
  patterns: [i18next-changeLanguage, zustand-locale-selector]
key_files:
  created: []
  modified:
    - frontend/src/i18n/locales/tr.json
    - frontend/src/i18n/locales/en.json
    - frontend/src/components/SettingsPanel.tsx
decisions:
  - "Translate all 414 keys + add 3 picker keys = 417 total"
  - "settings-panel__select CSS class used for the picker (matches existing panel idiom)"
  - "LOCALES constant hardcoded with native names — intentionally not translated"
  - "Locale import from i18n/i18n.ts (already exported as type)"
metrics:
  duration: "11 minutes"
  completed: "2026-06-10"
  tasks_completed: 4
  files_modified: 3
---

# Phase 03: Turkish + Language Switcher Summary

**One-liner:** Translated 417 i18n keys to native-quality Turkish and wired a `<select>` language picker into SettingsPanel backed by the existing Zustand locale store.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Translate tr.json (414 keys) | `1dce091` | `frontend/src/i18n/locales/tr.json` |
| 2 | Add 3 picker-specific keys | `933f23b` | `frontend/src/i18n/locales/en.json`, `tr.json` |
| 3 | Add language picker to SettingsPanel | `f95f151` | `frontend/src/components/SettingsPanel.tsx` |
| 4 | Verification gates (lint + build + parity + placeholder) | — | — |

## Translation Details

**Total keys:** 417 (414 original + 3 new picker keys)
**Parity:** en and tr key sets are identical (verified by script)
**Placeholders:** All `{{placeholder}}` tokens preserved verbatim (verified by script)

### New picker keys

| Key | English | Turkish |
|-----|---------|---------|
| `settings.language_section_label` | Language | Dil |
| `settings.language_picker_aria` | Choose interface language | Arayüz dilini seç |
| `settings.language_picker_desc` | Choose the language Flowboard's UI is displayed in. | Flowboard arayüzünün dilini seçin. |

## Notable Translation Choices for Maintainer Review

1. **"Generate" → "Üret"** — chosen over "Oluştur" (create) because "üret" specifically means "to produce/generate" and is conventional in AI tool UIs in Turkish.

2. **"Refine" → "İyileştir"** — chosen over "Geliştir" (develop/improve). "İyileştir" implies targeted correction, which matches the image-refinement context better.

3. **"Activity" → "Aktivite"** — kept as loanword rather than "Etkinlik" (native). "Aktivite" is broadly understood and shorter in UI contexts. Maintainer may prefer "Etkinlik" if a more native feel is desired.

4. **"Vision" → "Görme"** — the AI vision feature. Alternative: "Görü" (vision as in sight/foresight) or keep English "Vision". "Görme" is the literal/functional word for the act of seeing, which is what the feature does.

5. **"Planner" → "Planlayıcı"** — standard Turkish agent noun for something that plans.

6. **"Pipeline" → "pipeline"** — kept as English. "Ardışık düzen" is the literal Turkish but is rarely used in practice; Turkish developers universally understand "pipeline".

7. **"Vibe" → "Vibe"** — character aesthetic labels (Clean Girl, K-Pop, etc.) kept entirely in English as they are style/brand names used in the original.

8. **Status labels (short form):** "kuyrukta" (queued), "çalışıyor" (running), "tamamlandı" (done), "başarısız" (failed), "iptal edildi" (canceled), "zaman aşımı" (timeout). These are single-word or short-phrase forms suitable for status badges.

9. **"Upstream/downstream"** — translated as "yukarı akış / aşağı akış" which are the standard technical terms in Turkish for directed graph flow contexts.

10. **"Board" → "Pano"** — board as in kanban/canvas board. Alternative "tahta" (literal board/blackboard) was rejected as it doesn't fit the digital canvas context.

11. **Plural `_one` / `_other` keys** — Turkish has a single plural form (like English). Both suffixes carry the same translation value throughout, which is correct.

## SettingsPanel Language Picker

**CSS structure used:**

```tsx
<div className="settings-panel__section">
  <div className="settings-panel__label">{t("settings.language_section_label")}</div>
  <div className="settings-panel__hint">{t("settings.language_picker_desc")}</div>
  <select
    className="settings-panel__select"
    aria-label={t("settings.language_picker_aria")}
    value={locale}
    onChange={(e) => setLocale(e.target.value as Locale)}
  >
    {LOCALES.map((l) => (
      <option key={l.code} value={l.code}>{l.label}</option>
    ))}
  </select>
</div>
```

The `settings-panel__select` class is new (a native HTML `<select>` within the panel's section pattern). The existing CSS for `settings-panel__section`, `settings-panel__label`, and `settings-panel__hint` already provides appropriate spacing. A minimal style rule for `settings-panel__select` may be needed in `styles.css` for visual polish (width, padding) but is not strictly required for functionality — the browser default styling is acceptable.

**Placement:** First section inside the panel body, above Account Tier. Rationale: language is a meta-preference that affects how the user reads the rest of the panel.

## Verification Gates

| Gate | Result |
|------|--------|
| `npm install` | OK (no new deps) |
| `npm run lint` (tsc -b --noEmit) | PASSED — no TypeScript errors |
| `npm run build` | PASSED — 265 modules, built in ~830ms |
| Key parity (en == tr) | PASSED — 417 keys each |
| All Turkish values non-empty | PASSED — 0 empty values |
| Placeholder preservation | PASSED — all `{{...}}` tokens identical |

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree was behind main (missing Phase 2 i18n work)**

- **Found during:** Pre-execution setup
- **Issue:** The worktree at `agent-a20e59eb3d3d738a6` was created at commit `3806422` (before Phase 2 i18n). The `frontend/src/i18n/` directory did not exist in the worktree — no `en.json`, `tr.json`, or `i18n.ts`.
- **Fix:** Merged `main` (which contained all Phase 2 commits) into the worktree branch via `git merge main --no-edit`. Fast-forward merge succeeded with no conflicts.
- **Commit:** Fast-forward merge was the initial step; no separate deviation commit.

**2. CSS class `settings-panel__select`** — The plan sketch used `settings-section__*` class names, but the actual SettingsPanel uses `settings-panel__*`. Followed the actual file's pattern (Rule 3 auto-fix).

## Known Stubs

None. All 417 translations have non-empty values and are wired to components.

## Self-Check: PASSED

- `frontend/src/i18n/locales/tr.json` — FOUND, 417 keys, all non-empty
- `frontend/src/i18n/locales/en.json` — FOUND, 417 keys
- `frontend/src/components/SettingsPanel.tsx` — FOUND, language picker section present
- Commit `1dce091` — FOUND (feat: translate 414 keys)
- Commit `933f23b` — FOUND (feat: add picker keys)
- Commit `f95f151` — FOUND (feat: SettingsPanel picker)
