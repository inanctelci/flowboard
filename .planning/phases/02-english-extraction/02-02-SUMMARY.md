---
phase: 02-english-extraction
plan: "02"
subsystem: i18n-dialogs
tags:
  - i18n
  - react-i18next
  - dialogs
  - GenerationDialog
  - ResultViewer
dependency_graph:
  requires:
    - "02-01-SUMMARY (node.* and palette.* keys in en.json)"
    - "Phase 1 i18n infrastructure (en.json, tr.json, i18n.ts, i18n.d.ts)"
  provides:
    - "dialog.* keys (42 translatable rows + Vietnamese rewrites)"
    - "result.* keys (30+ rows including metadata grid)"
    - "sponsor.* keys"
    - "provider.* keys (AiProviderDialog + ProviderSetupModal)"
  affects:
    - "frontend/src/i18n/locales/en.json"
    - "frontend/src/i18n/locales/tr.json"
tech_stack:
  added:
    - "Trans component from react-i18next (for storyboard_locked_hint and will_gen)"
  patterns:
    - "t() calls for all translatable UI strings in React components"
    - "i18n singleton via hook closure for store-error paths inside component functions"
    - "Trans component for JSX with embedded <strong> markup"
key_files:
  created: []
  modified:
    - "frontend/src/components/GenerationDialog.tsx"
    - "frontend/src/components/ResultViewer.tsx"
    - "frontend/src/components/SponsorDialog.tsx"
    - "frontend/src/components/AiProviderDialog.tsx"
    - "frontend/src/components/settings/ProviderSetupModal.tsx"
    - "frontend/src/i18n/locales/en.json"
    - "frontend/src/i18n/locales/tr.json"
decisions:
  - "Used Trans component for dialog.storyboard_locked_hint (contains <strong>) and dialog.will_gen"
  - "ProviderSetupModal extracts more strings than the inventory listed (full body content extracted)"
  - "SponsorDialog TIERS data (label/tagline/perks) marked do-not-translate — content data not UI chrome"
  - "ResultViewer store-error (handleRegenerate) uses i18n from useTranslation closure, not singleton import"
  - "dialog.source_image_label / dialog.source_images_label split for singular/plural (conditional)"
metrics:
  duration: "~2 hours"
  completed: "2026-06-10"
  tasks: 3
  files: 7
---

# Phase 02 Plan 02: Dialogs + ResultViewer Summary

**One-liner:** Dialog/viewer surface fully extracted — 139 new dialog/result/sponsor/provider keys, all Vietnamese strings replaced with English, Trans used for markup-embedded strings.

## Rows Extracted Per File

| File | t() calls | do-not-translate boundaries | Notes |
|------|-----------|----------------------------|-------|
| GenerationDialog.tsx | 55 | 8+ | Largest file; all Vietnamese rewrites done |
| ResultViewer.tsx | 37 | 6 | formatRelativeTime Phase 1 keys untouched |
| SponsorDialog.tsx | 13 | 4 | TIERS data kept as content data |
| AiProviderDialog.tsx | 4 | 0 | Force banner fully extracted |
| ProviderSetupModal.tsx | 31 | 5 | Full body content extracted (beyond inventory) |
| **Total** | **140** | **23+** | |

## Vietnamese Rewrites (GenerationDialog)

All 13 Vietnamese strings replaced with English:

| Key | Vietnamese (original) | English (stored) |
|-----|----------------------|------------------|
| dialog.video_prompt_placeholder | "Bỏ trống để tự sinh motion prompt từ source image ✨" | "Leave blank to auto-generate a motion prompt from the source image ✨" |
| dialog.prompt_node_placeholder | "Nhập prompt mồi để feed cho downstream image / video…" | "Enter a seed prompt to feed downstream image / video nodes…" |
| dialog.image_prompt_placeholder | "Bỏ trống để tự generate prompt từ upstream nodes ✨" | "Leave blank to auto-generate a prompt from upstream nodes ✨" |
| dialog.analyzing_image | "✨ Đang phân tích image…" | "✨ Analyzing image…" |
| dialog.building_prompt | "✨ Đang dựng prompt từ upstream context…" | "✨ Building prompt from upstream context…" |
| dialog.country_label | "Quốc gia" | "Country" |
| dialog.extras_label | "Mô tả thêm (tuỳ chọn)" | "Additional notes (optional)" |
| dialog.extras_placeholder | "Tuổi, kiểu tóc, trang phục, biểu cảm…" | "Age, hair, outfit, expression…" |
| dialog.select_at_least_one | "Chọn ít nhất 1 variant để gen video." | "Select at least 1 variant to generate video." |
| dialog.will_gen | "Sẽ gen <strong>…</strong>" | "Will generate <b>{{count}} video</b>" (Trans) |
| dialog.model_tip | Vietnamese sticky tip | English: "Sticky — your selection is remembered across dispatches…" |
| dialog.camera_tip | Vietnamese camera tip | English: "Static = locked-off camera; cinematic = subtle motion; dynamic = active camera moves." |
| dialog.extras_tip | Vietnamese infotip | English: "Prompt is auto-built: portrait headshot · vibe styling · photorealistic…" |

## Do-Not-Translate Boundaries Marked

- Brand names: "Omni Flash" (option text), VIDEO_MODEL_CHIPS `{m.label}`, "Flowboard" (aria-label)
- User data: `data.title` (3 occurrences in ResultViewer), `boardName`, `p.node.data.title`
- Numeric: character count `/500`, `/200`, duration/credit format `{d}s · {c}c`
- Technical: `shortMediaId`, `slotError`, CLI commands in ProviderSetupModal
- TIERS constant array (SponsorDialog) — content data structure

## Keys Added

- **en.json:** 139 new keys (245 existing + 139 new = 384 total)
- **tr.json:** 139 matching empty-string stubs (parity confirmed)

Key prefixes:
- `dialog.*` — 43 keys (GenerationDialog)
- `result.*` — 38 keys (ResultViewer)
- `sponsor.*` — 13 keys (SponsorDialog)
- `provider.*` — 27 new keys (AiProviderDialog + ProviderSetupModal; 2 existed already)

## Deviations from Plan

### Auto-additions (inventory was under-specified)

**1. [Rule 2 - Missing coverage] ProviderSetupModal body content**
- **Found during:** Task 2
- **Issue:** Inventory listed only 3 rows (Setup title, Save, Cancel) but the actual file has extensive body content (ClaudeContent, GeminiContent, OpenAiContent with all step labels, hints, notes)
- **Fix:** Extracted all body strings (27 provider.* keys total)
- **Files modified:** ProviderSetupModal.tsx, en.json, tr.json

**2. [Rule 2 - Missing coverage] SponsorDialog additional strings**
- **Found during:** Task 2
- **Issue:** Inventory listed 2 rows but the actual dialog has 13+ translatable strings (close button, eyebrow, subtitle, tier CTA, footer text)
- **Fix:** Extracted all dialog chrome strings; TIERS content data left as-is with boundary comment

### Decisions Made

**3. Trans component for markup-embedded strings**
- `dialog.storyboard_locked_hint` — has `<strong>Storyboard motion template</strong>` embedded
- `dialog.will_gen` — has `<strong>{count} video</strong>` embedded
- Used `<Trans i18nKey="..." values={...} components={{ b: <strong /> }}` per CONTEXT.md guidance

**4. Source image label split**
- Original: `Source image{count > 1 ? 's (count)' : ''}`
- Decision: Two keys `dialog.source_image_label` and `dialog.source_images_label` with conditional in JSX
- Rationale: Simpler than i18next plural suffixes for this pattern

**5. Worktree rebase required**
- **Found during:** Task 1
- **Issue:** Worktree branch was on old pre-Phase-2 commit; en.json/tr.json/i18n infrastructure not present
- **Fix:** `git rebase main` to bring worktree up to Phase 2 baseline
- **Impact:** No code changes needed, just git state correction

## Commits

| Hash | Message |
|------|---------|
| 5032355 | feat(02-02-PLAN/SponsorDialog): extract strings to i18n |
| 19afd74 | feat(02-02-PLAN/AiProviderDialog): extract strings to i18n |
| 8558373 | feat(02-02-PLAN/ProviderSetupModal): extract strings to i18n |
| 9d0058f | feat(02-02-PLAN/ResultViewer): extract strings to i18n |
| 9162a21 | feat(02-02-PLAN/GenerationDialog): extract strings to i18n |
| 99ef30e | feat(02-02-PLAN/en.json): append dialog/result/sponsor/provider keys |
| cdaaff8 | feat(02-02-PLAN/tr-parity): add empty-string stubs for dialog/viewer keys |

## Self-Check: PASSED

### Files exist
- frontend/src/components/GenerationDialog.tsx: FOUND
- frontend/src/components/ResultViewer.tsx: FOUND
- frontend/src/components/SponsorDialog.tsx: FOUND
- frontend/src/components/AiProviderDialog.tsx: FOUND
- frontend/src/components/settings/ProviderSetupModal.tsx: FOUND
- frontend/src/i18n/locales/en.json: FOUND
- frontend/src/i18n/locales/tr.json: FOUND

### Key artifacts
- en.json contains "dialog.title_video": CONFIRMED
- en.json contains "result.open_in_flow": CONFIRMED
- en.json contains "sponsor.title": CONFIRMED
- tr.json has key parity with en.json (0 missing): CONFIRMED

### Verification checks
- `npm run lint` (tsc -b --noEmit): PASSED
- Vietnamese strings eliminated: PASSED (0 matches)
- Brand names not used as keys: PASSED
- data.title not concatenated with t(): PASSED
- t() calls across 5 files: 140 total (requirement: >=60)
- New keys in en.json: 139 (requirement: >=70)
