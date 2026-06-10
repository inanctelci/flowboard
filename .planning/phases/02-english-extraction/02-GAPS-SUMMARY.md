---
phase: 02-english-extraction
plan: gaps
type: gap-closure
status: complete
date: 2026-06-10
keys_added: 31
files_modified:
  - frontend/src/i18n/locales/en.json
  - frontend/src/i18n/locales/tr.json
  - frontend/src/components/AccountPanel.tsx
  - frontend/src/components/settings/AiProvidersSection.tsx
  - frontend/src/canvas/Board.tsx
  - frontend/src/components/ReferencesPanel.tsx
  - frontend/src/components/AiProviderBadge.tsx
commits:
  - f7046cc: fix(02-gaps/locales): append 31 gap-closure keys
  - 0a7b6f8: fix(02-gaps/AccountPanel): extract missed strings
  - 5251cb1: fix(02-gaps/AiProvidersSection): extract missed strings
  - c745db9: fix(02-gaps/Board): extract missed strings
  - a5b8830: fix(02-gaps/ReferencesPanel): extract missed strings
  - 2bd6170: fix(02-gaps/AiProviderBadge): extract missed strings
---

# Phase 02 Gaps: English Extraction Gap-Closure Summary

## Objective

Resolve Gap 1 from 02-VERIFICATION.md: extract ~35 hardcoded user-visible strings missed by the Phase 2 string inventory from 5 source files.

## Setup

Before executing, the worktree branch needed to be fast-forwarded to `main` to pick up the 383-key i18n baseline written by plans 02-01 through 02-05 (those plans ran in parallel worktrees whose commits were merged into main before this gap-closure was spawned). A `git merge main --ff-only` succeeded cleanly.

## Keys Added Per File

| File | New keys (count) | Reused existing keys |
|------|-----------------|----------------------|
| `AccountPanel.tsx` | 11 | 2 (`account.scanning`, `account.open_flow`) |
| `AiProvidersSection.tsx` | 15 | 4 (`provider.copied`, `provider.copy`, `provider.docs_link`, `settings.apply`, `settings.test`, `settings.testing`) |
| `Board.tsx` | 1 (`node.add_connected`) | 2 (`palette.kind.image`, `palette.kind.video`) |
| `ReferencesPanel.tsx` | 3 | 1 (`panel.pin`) |
| `AiProviderBadge.tsx` | 1 (`provider.setup_tooltip`) | 2 (`provider.badge_label`, `provider.configure_title`) |
| **Total** | **31** | |

**Total keys in en.json after gap closure: 414** (383 baseline + 31 new)

## Detailed Extraction Log

### AccountPanel.tsx (11 new keys)

| Key | English value |
|-----|--------------|
| `account.aria_label` | "Account" |
| `account.scan_hint_title` | "⚠ Extension not detected" |
| `account.scan_hint_text` | "Refresh the Flow tab, then reload the Flowboard extension." |
| `account.scan_again_title` | "Scan again for an extension connection" |
| `account.try_again` | "Try again" |
| `account.scan_title` | "Scan for an extension connection and re-fetch user info" |
| `account.scan_extension` | "🔍 Scan extension" |
| `account.open_settings` | "Open settings" |
| `account.settings_title` | "Settings" |
| `account.tier_unknown_title` | "Tier unknown" |
| `account.tier_unknown_text` | "Open Flow once so the extension can detect your plan." |

**Skipped (do-not-translate):** `"Ultra"` / `"Pro"` tier labels — these are Google Flow paid plan tier brand names (PAYGATE_TIER_TWO = Ultra, PAYGATE_TIER_ONE = Pro). Added `// i18n: do-not-translate — "Ultra" and "Pro" are Google Flow plan tier brand names` boundary comment per CONTEXT.md decision pattern.

### AiProvidersSection.tsx (15 new keys)

| Key | English value |
|-----|--------------|
| `provider.cli_not_signed_in` | "The CLI is installed but not signed in. Open Setup help for the login command." |
| `provider.cli_install_hint` | "Install the CLI from npm and sign in. Open Setup help for the exact commands." |
| `provider.setup_help` | "Setup help →" |
| `provider.test_then_apply` | "Test the connection, then Apply" |
| `provider.apply_title_unchanged` | "{{name}} is already active." |
| `provider.apply_title_needs_test` | "Run the connection test successfully to enable Apply." |
| `provider.apply_title_ready` | "Apply {{name}} to all features." |
| `provider.applying` | "Applying…" |
| `provider.already_active` | "Already active" |
| `provider.pinging` | "Pinging the CLI…" |
| `provider.test_hint` | "Sends one tiny prompt to verify the CLI answers." |
| `provider.retest` | "Re-test" |
| `provider.retry` | "Retry" |
| `provider.copy_install_aria` | "Copy install command" |
| `provider.install_upgrade` | "Install / upgrade" |

**Reused:** `provider.copied` ("✓ Copied"), `provider.copy` ("Copy"), `provider.docs_link` ("Open {{name}} docs ↗"), `settings.apply`, `settings.test`, `settings.testing` — all pre-existing in en.json.

**Added `useTranslation()` hook to `CliReference` sub-component** (previously it had no hook call despite being a React component). The `AiProvidersSection` and `ConnectionTestRow` functions already had the hook from 02-03.

**Skipped (do-not-translate):**
- `labelOf()` return values (`"Claude"`, `"Gemini"`, `"OpenAI"`) — brand names with existing `// i18n: do-not-translate — brand names` comment.
- Intro paragraph "Pick which AI powers Flowboard…" — was marked `{/* i18n: do-not-translate */}` by 02-03 executor; not in verifier gap list.
- Mixed-state notice text — not in verifier gap list.
- Connection ok subtitle `Connected · ${latencyMs}ms · powers Auto-Prompt, Vision, Planner` — contains brand-adjacent text; not in gap list.

### Board.tsx (1 new key + 2 reused)

| Key | Notes |
|-----|-------|
| `node.add_connected` → "Add connected node" | New key for drop-popover `aria-label` |
| `palette.kind.image` → "Image" | Reused (already defined by 02-01) |
| `palette.kind.video` → "Video" | Reused (already defined by 02-01) |

**Added `import { useTranslation } from "react-i18next"` and `const { t } = useTranslation()` to `DropAddPopover` sub-component.** The main `Board` function has no user-visible strings and did not need the hook.

### ReferencesPanel.tsx (3 new keys)

| Key | English value |
|-----|--------------|
| `refs.unpin_aria` | "Unpin reference" |
| `refs.unpin_title` | "Unpin" |
| `refs.pin_title` | "Pin to top" |

The existing `t("panel.pin")` for the pin state aria-label was already in place from 02-03; only the unpin-state values were missing.

### AiProviderBadge.tsx (1 new key)

| Key | English value |
|-----|--------------|
| `provider.setup_tooltip` | "Pick an AI provider to power Auto-Prompt, Vision, and Planner." |

## Strings Discovered While Editing (Not in Verifier Gap List)

| File | String | Decision |
|------|--------|----------|
| `AiProviderBadge.tsx` L105 | `"Setup AI"` badge label text | **Not extracted** — outside the 1-string scope stated by verifier for this file. Flagged here for Phase 3 / re-verification. |
| `AiProvidersSection.tsx` L276-277 | `"Pick which AI powers Flowboard..."` intro paragraph | **Not extracted** — already marked `do-not-translate` by 02-03 executor; contains brand name. Not in gap list. |

## Do-Not-Translate Boundaries Added

| File | String | Reason |
|------|--------|--------|
| `AccountPanel.tsx` | `"Ultra"` / `"Pro"` tier labels | Google Flow paid plan tier brand names |

## tr.json Parity

All 31 new keys added as empty-string stubs to `tr.json`. Parity confirmed: 414 keys in both files.

## Lint Gate

`npm run lint` (`tsc -b --noEmit`) passed after each per-file commit. Zero TypeScript errors.

## Self-Check

- en.json has 414 keys: VERIFIED
- tr.json has 414 keys: VERIFIED
- All 5 target files modified: VERIFIED
- 6 git commits made (1 locale + 5 component): VERIFIED
