---
phase: "03"
plan: "gaps"
subsystem: "frontend/i18n"
tags: ["i18n", "turkish", "gap-closure", "TR-04"]
---

# Phase 03 Gap Closure Summary

## Gap Source

Phase 3 verifier reported `gaps_found` on TR-04 — 8 hardcoded English strings remained across 4 files after the main Phase 3 execution.

## Keys Added (7 new keys, parity 417 → 424 in both locales)

| Key | English | Turkish | Notes |
|-----|---------|---------|-------|
| `provider.setup_ai_cta` | `"Setup AI"` | `"AI'yı Kur"` | Short CTA; "AI" kept as brand |
| `provider.active_badge` | `"Active"` | `"Aktif"` | Badge label on ProviderCard |
| `settings.logout_hint` | Full paragraph (see below) | See below | Logout section hint text |
| `refs.rename_title` | `"Rename"` | `"Yeniden Adlandır"` | Rename button tooltip |
| `refs.confirm_delete_aria` | `"Confirm delete reference"` | `"Referansı silmeyi onayla"` | Accessible label for armed delete |
| `refs.confirm_delete_title` | `"Click again to confirm — auto-cancels in 3s"` | `"Onaylamak için tekrar tıklayın — 3 saniye sonra iptal edilir"` | Delete confirm tooltip |
| `refs.confirm_question` | `"Confirm?"` | `"Emin misin?"` | Delete button text when armed |

### Turkish Phrasing Notes

**`provider.setup_ai_cta`** — "AI'yı Kur" is a natural Turkish CTA. "AI" is retained as-is (common in Turkish tech UI, no native equivalent expected). Apostrophe is used for Turkish grammatical suffix attachment to the foreign word.

**`settings.logout_hint`** — English: "Clears the cached identity and tells the extension to drop its in-memory token. The WebSocket stays open so signing back in doesn't require a Chrome restart."

Turkish: "Önbelleğe alınmış kimliği temizler ve eklentiye bellek içi token'ı bırakmasını bildirir. WebSocket bağlantısı açık kalır, dolayısıyla tekrar giriş yapmak için Chrome'u yeniden başlatmak gerekmez."

Phrasing is natural Turkish, not literal. "token" is kept untranslated (technical term common in Turkish software UI). "WebSocket" is retained as a technical term.

**`refs.confirm_question`** — "Emin misin?" ("Are you sure?") chosen over "Onayla?" ("Confirm?") because it is more natural in Turkish for a destructive-action confirmation. Same semantic intent.

**`refs.confirm_delete_title`** — "3 saniye sonra iptal edilir" is a natural Turkish rendering of "auto-cancels in 3s", preserving the time-limit warning without awkward verbatim translation.

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/i18n/locales/en.json` | +7 keys appended |
| `frontend/src/i18n/locales/tr.json` | +7 keys appended (parity maintained) |
| `frontend/src/components/AiProviderBadge.tsx` | `"Setup AI"` → `t("provider.setup_ai_cta")` |
| `frontend/src/components/settings/ProviderCard.tsx` | `"Active"` → `t("provider.active_badge")` |
| `frontend/src/components/SettingsPanel.tsx` | logout hint paragraph → `t("settings.logout_hint")` |
| `frontend/src/components/ReferencesPanel.tsx` | 4 strings → `t(...)` calls |

## Parity Verification

```
en keys: 424
tr keys: 424
Missing in TR: []
Missing in EN: []
```

## Lint

`tsc -b --noEmit` exits 0 after `npm install` in the worktree (node_modules were absent from the worktree at execution start — pre-existing infrastructure gap, not caused by this closure).

## Commits

| Hash | Message |
|------|---------|
| `3798107` | `fix(03-gaps/locales): append 7 gap-closure keys to en.json + tr.json parity` |
| `8955bfa` | `fix(03-gaps/AiProviderBadge): extract missed string to i18n` |
| `427a3a1` | `fix(03-gaps/ProviderCard): extract missed string to i18n` |
| `854ca3c` | `fix(03-gaps/SettingsPanel): extract missed string to i18n` |
| `ee68402` | `fix(03-gaps/ReferencesPanel): extract missed strings to i18n` |

## Notes

- All 4 components already had `useTranslation` imported from Phase 2/3 work — no new hook setup needed.
- The merge from `main` was required to bring i18n infrastructure into this worktree branch (worktree was branched from `3806422`, before Phase 2/3 i18n work landed).
- "Delete (underlying image stays in storage)" tooltip on the non-armed delete button is out of scope for this gap list — not included in TR-04.
