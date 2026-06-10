# Phase 1 String Inventory — Flowboard frontend/src/

**Generated:** 2026-06-10
**Source:** Phase 1 audit pass over frontend/src/ (canvas, components, store, api, lib, App.tsx)
**Consumer:** Phase 2 (EXTRACT-01..07) extraction plans

## How to read this file

Each section below is one source file. Each row is one string site identified by line number, current verbatim string (truncated to ~60 chars with `…`), a proposed i18n key in `area.concept` dot-notation, and a `Kind` from the closed enum.

## Kind enum

| Kind | Meaning |
|------|---------|
| `text-node` | JSX text node: `<span>Text</span>` |
| `aria-label` | `aria-label="..."` JSX prop |
| `title-attr` | `title="..."` JSX prop (tooltip) |
| `placeholder` | `placeholder="..."` JSX prop |
| `store-error` | String set on a Zustand store `error` slot |
| `utility-fn` | String returned by a pure `.ts` function |
| `toaster-msg` | String that flows to the Toaster component |
| `activity-label` | String in `activity-meta.ts` label/status tables |
| `error-humanizer` | Branch return value in `humanizeBackendError` |
| `do-not-translate` | Product name, model name, brand identifier, or user-authored data — never enters catalog |

## Negative list (do-not-translate)

These appear in JSX alongside translatable strings and MUST NOT be wrapped in `t()`:

- **Product/model brand identifiers** (per D-08 — research SUMMARY.md §4): `Veo 3.1 Lite`, `Veo 3.1 Fast`, `Veo 3.1 Quality`, `Veo 3.1 Lite (Low Priority)`, `Omni Flash`, `Omni Flash · 4s`, `Omni Flash · 6s`, `Omni Flash · 8s`, `Omni Flash · 10s`, `Nano Banana Pro`, `Nano Banana 2`, `Banana Pro`, `Banana 2`, `Flowboard` (product name in toolbar and error messages).
- **User-authored data fields**: `data.title`, `data.prompt`, `data.aiBrief`, `ref.label`, `board.name`, chat message bodies. These render verbatim via React's JSX escaping — wrapping them in `t()` would attempt translation against a key that is actually a user phrase.
- **`frontend/src/constants/character.ts` enum entries**: `CHARACTER_COUNTRIES`, `CHARACTER_VIBES`, `CHARACTER_GENDERS` — these are data enum values passed to the backend as API parameters. Their `label` fields are currently in Vietnamese (UI copy in that language, not yet English UI strings to translate). See the constants section for full details.

## Phase 2 Consumption Contract

Phase 2 executes file-by-file in order of String Density (files with most rows first). For each row:
1. If `Kind = do-not-translate` — add a code comment marking the boundary; skip extraction.
2. Otherwise — add `Key proposal` to `en.json`, wrap the string with `t("key.proposal")` or `aria-label={t("key.proposal")}` etc., appropriate for the Kind.
3. `const { t } = useTranslation()` goes at the top of any React component touched.
4. For `store-error`, `utility-fn`, `error-humanizer` — use `import i18n from "../i18n/i18n"; i18n.t("key")` (the headless singleton — `useTranslation()` is a hooks violation in `.ts` files).

---

## frontend/src/App.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 40 | "Loading board…" | `app.loading_board` | text-node | Shown while initial board loads |

---

## frontend/src/canvas/AddNodePalette.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 34 | "Add node" | `palette.add_node` | aria-label | Container aria-label |
| 42 | "Add ${chip.label} node" | `palette.add_node_type` | aria-label | Dynamic — uses chip.label; interpolation `{{label}}` |
| 12 | "Character" | — | do-not-translate | CHIPS label — node type name, but also UI display label; ambiguous. Flagged for human review (see deviations). |
| 13 | "Image" | — | do-not-translate | CHIPS label |
| 14 | "Storyboard" | — | do-not-translate | CHIPS label |
| 15 | "Video" | — | do-not-translate | CHIPS label |
| 16 | "Visual asset" | `palette.visual_asset` | text-node | UI label for node type |
| 17 | "Prompt" | — | do-not-translate | CHIPS label — also matches prompttype key |
| 18 | "Note" | — | do-not-translate | CHIPS label |

---

## frontend/src/canvas/Board.tsx

No user-visible strings found in the reviewed portion. The file handles canvas/graph logic. Status: no extractable strings.

---

## frontend/src/canvas/NodeCard.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 45 | "✨ Composing prompt…" | `node.composing_prompt` | text-node | BriefHint: LLM composing status |
| 48 | "✨ Analyzing…" | `node.analyzing` | text-node | BriefHint: aiBrief pending status |
| 117 | "upload failed" | `node.upload_failed` | store-error | Catch fallback in uploadOwn |
| 170 | "Replace character image" | `node.replace_char_image` | aria-label | Character avatar button |
| 189 | "Save this character to the library" | `node.save_char_to_library_title` | title-attr | Save button tooltip |
| 192 | "Save to library" | `node.save_to_library` | aria-label | Character save button |
| 195 | "★ Save" | `node.save_star` | text-node | Button text |
| 221 | data.title | — | do-not-translate | USER DATA — img alt; node title typed by user; never wrap in t() |
| 222 | "Generating…" | `node.generating` | text-node | Processing state label |
| 223 | "Drop image" | `node.drop_image` | text-node | Drag-over hint |
| 232 | "Uploading…" | `node.uploading` | text-node | Upload in-progress label |
| 235 | "Upload" | `node.upload` | text-node | Upload button label |
| 241 | "Generate" | `node.generate` | text-node | Generate button label |
| 371 | "Open variant ${alt}" | `node.open_variant` | aria-label | Dynamic; interpolation `{{title}}` |
| 405 | "Use this variant as the reference for a downstream node" | `node.use_variant_ref_title` | title-attr | Use button tooltip (truncated) |
| 411 | "Use this variant as reference" | `node.use_variant_ref` | aria-label | Use button aria-label |
| 413 | "Use →" | `node.use_arrow` | text-node | Use button text |
| 426 | "Save this variant to the library" | `node.save_variant_to_library_title` | title-attr | Star save button tooltip |
| 429 | "Save to library" | `node.save_to_library` | aria-label | Star save button |
| 495 | "Couldn't pin variant: ${…}" | `node.pin_variant_error` | store-error | Error set on generation store; prefix translatable, suffix is raw error message |
| 531 | "Pick downstream target" | `node.pick_downstream_title` | aria-label | VariantPicker dialog aria-label |
| 533 | "Use variant v${…} for:" | `node.use_variant_for` | text-node | VariantPicker heading; interpolation `{{variantIdx}}` |
| 543 | "video" | `node.kind_video` | text-node | VariantPicker kind label |
| 543 | "image" | `node.kind_image` | text-node | VariantPicker kind label |
| 545 | " · empty" | `node.kind_empty` | text-node | Appended when no prompt |
| 556 | "Cancel" | `node.cancel` | text-node | VariantPicker cancel button |
| 612 | "no project" | `node.no_project` | store-error | Set when project missing |
| 614 | "upload failed" | `node.upload_failed` | store-error | Catch fallback in ImageBody |
| 683 | "Drop image" | `node.drop_image` | text-node | Drag-over state |
| 691 | "Uploading…" | `node.uploading` | text-node | Upload busy |
| 694 | "Upload" | `node.upload` | text-node | Upload button |
| 699 | "Generate" | `node.generate` | text-node | Generate button |
| 723 | "Connect this image to a downstream image/video target first." | `node.connect_downstream_first` | store-error | Error set on generation store |
| 749 | data.title | — | do-not-translate | USER DATA — tile alt text |
| 840 | "Variant blocked: ${slotError} — click for details" | `node.variant_blocked_title` | title-attr | Blocked tile title; suffix is backend error token (do-not-translate) |
| 851 | "Blocked" | `node.blocked` | text-node | Video blocked label |
| 875 | "Open variant ${alt}" | `node.open_variant` | aria-label | Dynamic |
| 1014 | data.title | — | do-not-translate | USER DATA — video tile alt |
| 1109 | "no project" | `node.no_project` | store-error | VisualAssetBody |
| 1119 | "link upload failed" | `node.link_upload_failed` | store-error | uploadFromLink catch |
| 1129 | "no project" | `node.no_project` | store-error | uploadRef |
| 1131 | "ref upload failed" | `node.ref_upload_failed` | store-error | uploadRef catch |
| 1165 | "Generating…" | `node.generating` | text-node | VisualAsset processing |
| 1171 | "https://… (png/jpg/webp)" | `node.link_placeholder` | placeholder | Link mode URL input |
| 1188 | "Fetching…" | `node.fetching` | text-node | Uploading from URL |
| 1191 | "Save" | `node.save` | text-node | Link save button |
| 1213 | "Uploading…" | `node.uploading` | text-node | Upload in progress |
| 1216 | "Upload" | `node.upload` | text-node | Upload button |
| 1221 | "Add link" | `node.add_link` | text-node | Add link button |
| 1233 | "Generate" | `node.generate` | text-node | Generate button |
| 1263 | "Refine image" | `node.refine_image` | aria-label | Refine button |
| 1267 | "Refine" | `node.refine` | text-node | Refine button text |
| 1278 | "Save this asset to the library" | `node.save_asset_to_library_title` | title-attr | Save asset tooltip |
| 1281 | "Save to library" | `node.save_to_library` | aria-label | Save asset button |
| 1287 | "★ Save" | `node.save_star` | text-node | Button text |
| 1260 | data.title | — | do-not-translate | USER DATA — visual asset img alt |
| 1293 | "Refine" | `node.refine_region` | aria-label | Refine panel region aria-label |
| 1296 | "Describe the change…" | `node.refine_placeholder` | placeholder | Refine textarea |
| 1308 | "Ref ✓ (${refRefreshKey})" | `node.ref_confirmed` | text-node | Ref upload confirmed; interpolation `{{key}}` |
| 1308 | "Add ref" | `node.add_ref` | text-node | Add ref button |
| 1313 | "Refine →" | `node.refine_arrow` | text-node | Refine submit button |
| 1395 | "Style direction (e.g. cinematic warm tone, magazine…)" | `node.prompt_placeholder` | placeholder | Prompt node editing placeholder (truncated) |
| 1398 | "Note, TODO, label…" | `node.note_placeholder` | placeholder | Note node editing placeholder |
| 1408 | "Double-click to add direction…" | `node.prompt_display_placeholder` | text-node | Prompt node display |
| 1410 | "Double-click to add note…" | `node.note_display_placeholder` | text-node | Note node display |
| 1416 | "Double-click to edit" | `node.double_click_edit` | title-attr | Editable body tooltip |
| 1541 | "Composing…" | `node.composing` | text-node | LLM pill composing state |
| 1541 | "Analyzing…" | `node.analyzing` | text-node | LLM pill analyzing state |
| 1549 | "Download media" | `node.download_media` | aria-label | Download button |
| 1552 | "Download" | `node.download` | title-attr | Download button tooltip |
| 1560 | "Generate from this node" | `node.generate_from_node` | aria-label | Generate button |
| 1561 | "Backend is still composing — try again in a moment" | `node.composing_hint` | title-attr | LLM busy tooltip |
| 1561 | "Generate" | `node.generate` | title-attr | Normal generate tooltip |
| 1444 | "Composite layout: ${label} (${…} panels)" | `node.storyboard_layout_title` | title-attr | Storyboard badge title; interpolation `{{label}}`, `{{total}}` |

---

## frontend/src/canvas/VariantEdge.tsx

No user-visible strings. The `v{pin+1}` chip text is a dynamic value (not translatable UI copy — it's a variant index).

---

## frontend/src/components/AccountPanel.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| ~100 | "Tier unknown — Open Flow" | `account.tier_unknown_banner` | text-node | Banner warning; "Open Flow" is a link label |
| ~110 | "Sign out" | `account.sign_out` | text-node | Logout button |
| ~85 | "Scanning…" | `account.scanning` | text-node | Scan state |
| ~120 | "Open Flow" | `account.open_flow` | text-node | Link to labs.google — partial do-not-translate; "Flow" is a product name |

---

## frontend/src/components/AiProviderBadge.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "AI Providers" | `provider.badge_label` | text-node | Badge button label |
| — | "Configure AI providers" | `provider.configure_title` | aria-label | Badge aria-label |

---

## frontend/src/components/AiProviderDialog.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "AI Provider Setup" | `provider.dialog_title` | text-node | Dialog heading |
| — | "Apply" | `provider.apply` | text-node | Apply button |
| — | "Close" | `provider.close` | aria-label | Close button |
| — | "Test" | `provider.test` | text-node | Test button |
| — | "Testing…" | `provider.testing` | text-node | Test in progress |

---

## frontend/src/components/GenerationDialog.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 782 | "Generate video" | `dialog.title_video` | text-node | Dialog h2 title |
| 785 | "Generate character" | `dialog.title_character` | text-node | Dialog h2 title |
| 787 | "Generate storyboard" | `dialog.title_storyboard` | text-node | Dialog h2 title |
| 789 | "Edit prompt" | `dialog.title_prompt` | text-node | Dialog h2 title |
| 790 | "Generate image" | `dialog.title_image` | text-node | Dialog h2 title |
| 799 | "Close dialog (Escape)" | `dialog.close` | aria-label | Close button |
| 810 | "Motion prompt" | `dialog.motion_prompt_label` | text-node | Label for video prompt |
| 811 | "Prompt" | `dialog.prompt_label` | text-node | Label for image prompt |
| 813 | "✨ auto" | `dialog.auto_badge` | text-node | Auto-generated badge |
| 813 | "Auto-generated from upstream nodes" | `dialog.auto_badge_title` | title-attr | Auto badge tooltip |
| 817 | "/500" | — | do-not-translate | Character count suffix — format not UI string |
| 831 | "Bỏ trống để tự sinh motion prompt từ source image ✨" | `dialog.video_prompt_placeholder` | placeholder | BUGS-01 — Vietnamese placeholder; replace with English |
| 833 | "Nhập prompt mồi để feed cho downstream image / video…" | `dialog.prompt_node_placeholder` | placeholder | Vietnamese placeholder; replace with English |
| 835 | "Bỏ trống để tự generate prompt từ upstream nodes ✨" | `dialog.image_prompt_placeholder` | placeholder | Vietnamese placeholder; replace with English |
| 840 | "Locked: storyboard motion template (animates panels in order)" | `dialog.locked_storyboard_title` | title-attr | Locked prompt tooltip |
| 847 | "🎬 Storyboard motion template — locked because an upstream …" | `dialog.storyboard_locked_hint` | text-node | Long hint text (truncated) |
| 855 | "✨ Đang phân tích image…" | `dialog.analyzing_image` | text-node | BUGS-01 — Vietnamese progress; replace with English |
| 857 | "✨ Đang dựng prompt từ upstream context…" | `dialog.building_prompt` | text-node | Vietnamese progress; replace with English |
| 869 | "Gender" | `dialog.gender_label` | text-node | Character builder label |
| 884 | "Quốc gia" | `dialog.country_label` | text-node | Vietnamese "Country" — replace with English |
| 900 | "Vibe" | `dialog.vibe_label` | text-node | Character builder label |
| 917 | "Mô tả thêm (tuỳ chọn)" | `dialog.extras_label` | text-node | Vietnamese "Additional description (optional)" |
| 919 | "Prompt được auto-build: portrait headshot · vibe…" | `dialog.extras_tip` | aria-label | InfoTip content (truncated) |
| 924 | "Tuổi, kiểu tóc, trang phục, biểu cảm…" | `dialog.extras_placeholder` | placeholder | Vietnamese placeholder; replace with English |
| 944 | "Source image${…}" | `dialog.source_image_label` | text-node | Video source image label; interpolation `{{count}}` |
| 956 | "All" | `dialog.select_all` | text-node | Select All button |
| 963 | "None" | `dialog.select_none` | text-node | Select None button |
| 988 | "Variant ${i+1}${checked ? ' selected' : ''}" | `dialog.variant_n` | aria-label | Source thumb; interpolation `{{n}}`, `{{selected}}` |
| 1005 | "Chọn ít nhất 1 variant để gen video." | `dialog.select_at_least_one` | text-node | Vietnamese validation; replace with English |
| 1012 | "Sẽ gen <strong>…</strong>" | `dialog.will_gen` | text-node | Vietnamese generation summary; replace with English |
| 1023 | "Connect an upstream image node with rendered media first" | `dialog.no_source_image` | text-node | Empty source image state |
| 1037 | "Source references (${count})" | `dialog.source_refs_label` | text-node | Source refs label; interpolation `{{count}}` |
| 1042 | "(empty prompt)" | `dialog.empty_prompt` | text-node | Empty prompt chip label |
| 1047 | "Prompt" | — | do-not-translate | Fallback title for prompt chip — NODE DATA context |
| 1108 | "Pick variant for ${title}" | `dialog.pick_variant_for` | aria-label | Variant picker dialog; interpolation `{{title}}` |
| 1122 | "Variant ${i+1}" | `dialog.variant_n_title` | title-attr | Picker item; interpolation `{{n}}` |
| 1127 | "Variant ${i+1}" | `dialog.variant_n_alt` | aria-label | Picker item alt; interpolation `{{n}}` |
| 1147 | "Aspect ratio" | `dialog.aspect_ratio_label` | text-node | Section label |
| 1169 | "Duration (Omni Flash)" | `dialog.omni_duration_label` | text-node | "Omni Flash" is brand name |
| 1170 | "Omni Flash dispatches via video:batch…" | `dialog.omni_info_tip` | aria-label | InfoTip content (truncated) |
| 1183 | "${d}s · ${…}c" | — | do-not-translate | Duration + credit cost — numeric label |
| 1203 | "Model" | `dialog.model_label` | text-node | Model section label |
| 1203 | "Sticky — selection được lưu…" | `dialog.model_tip` | aria-label | InfoTip; Vietnamese content; replace with English |
| 1227 | "Omni Flash" | — | do-not-translate | Brand name in select option |
| 1239 | "${m.label}" | — | do-not-translate | VIDEO_MODEL_CHIPS label — Veo 3.1 Lite/Fast/Quality etc. |
| 1241 | " · Ultra only" | `dialog.ultra_only` | text-node | Appended to locked option |
| 1253 | "Camera" | `dialog.camera_label` | text-node | Camera section label |
| 1254 | "Static = locked-off…" | `dialog.camera_tip` | aria-label | InfoTip; Vietnamese content; replace with English |
| 1277 | "Variants" | `dialog.variants_label` | text-node | Variants section label |
| 1282 | "Decrease variants" | `dialog.decrease_variants` | aria-label | Minus button |
| 1291 | "Increase variants" | `dialog.increase_variants` | aria-label | Plus button |
| 1296 | "1–4 images per request" | `dialog.variants_hint` | text-node | Hint text |
| 1310 | "Grid" | `dialog.grid_label` | text-node | Grid section label |
| 1310 | "Storyboard renders as a SINGLE composite image…" | `dialog.grid_tip` | aria-label | InfoTip (truncated) |
| 1329 | "${total} panels (${dimsLabel})" | `dialog.grid_panels_title` | title-attr | Grid chip tooltip; interpolation `{{total}}`, `{{dims}}` |
| 1342 | "${boardName} · ${nodeCount} node${…}" | — | do-not-translate | USER DATA — board name is user data; `nodeCount` is numeric |
| 1355 | "Backend is still composing — try again in a moment" | `dialog.composing_wait` | title-attr | Disabled generate tooltip |
| 1358 | "Building…" | `dialog.building` | text-node | Working state button text |
| 1360 | "Save ⌘↵" | `dialog.save_kbd` | text-node | Prompt node save with keyboard hint |
| 1362 | "Generate ⌘↵" | `dialog.generate_kbd` | text-node | Generate with keyboard hint |
| 697 | "Auto-prompt failed: ${…}" | `dialog.auto_prompt_failed` | store-error | Set on generation store; prefix translatable |
| 697 | "Auto-prompt failed" | `dialog.auto_prompt_failed` | store-error | Fallback error |
| 562 | "Couldn't pin variant: ${…}" | `dialog.pin_variant_failed` | store-error | Set on generation store |

---

## frontend/src/components/ForcedSetupGate.tsx

No user-visible strings (delegates all rendering to AiProviderDialog).

---

## frontend/src/components/ProjectSidebar.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 65 | "All boards already on Flow ✓" | `sidebar.all_boards_synced` | text-node | Sync summary; "Flow" is product name |
| 72 | "Pushed ${ok} board${…} to Flow ✓" | `sidebar.boards_pushed` | text-node | Sync success; interpolation `{{count}}` |
| 74 | "Pushed ${ok}, ${fail} failed — see agent log" | `sidebar.boards_pushed_partial` | text-node | Partial sync failure |
| ~80 | "sync failed" | `sidebar.sync_failed` | store-error | Catch fallback |
| ~95 | "New board" | `sidebar.new_board` | text-node | New board button/dialog title |
| ~100 | "Create" | `sidebar.create` | text-node | Create button |
| ~105 | "Delete board" | `sidebar.delete_board` | text-node | Delete confirm dialog |
| ~110 | "Are you sure you want to delete "${name}"?" | `sidebar.delete_confirm` | text-node | Confirm message; USER DATA interpolation for board name |
| ~115 | "Untitled" | `sidebar.untitled` | text-node | Default board name fallback |

---

## frontend/src/components/ReferencesPanel.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 40 | "Collapse references" | `panel.collapse_refs` | aria-label | Toggle tab (open state) |
| 40 | "Open references" | `panel.open_refs` | aria-label | Toggle tab (closed state) |
| 41 | "Collapse library" | `panel.collapse_library_title` | title-attr | Toggle tab tooltip |
| 41 | "Open library" | `panel.open_library_title` | title-attr | Toggle tab tooltip |
| 55 | "Library" | `panel.library_title` | text-node | Panel heading |
| 58 | "Collapse references panel" | `panel.collapse_refs_btn` | aria-label | Close button |
| 59 | "Collapse" | `panel.collapse_title` | title-attr | Close button tooltip |
| 70 | "🔍 search references…" | `panel.search_placeholder` | placeholder | Search input |
| 72 | "Search references" | `panel.search_label` | aria-label | Search input aria-label |
| 79 | "Loading…" | `panel.loading` | text-node | Loading state |
| 83 | "Save a variant from any image node to start your library." | `panel.empty_library` | text-node | Empty state message |
| 89 | "No references match "${query}"." | `panel.no_results` | text-node | Empty filter state; USER DATA interpolation for query |
| ~110 | "Rename" | `panel.rename` | aria-label | Rename action |
| ~115 | "Delete" | `panel.delete` | aria-label | Delete action |
| ~120 | "Pin" | `panel.pin` | aria-label | Pin action |
| ref.label | ref.label | — | do-not-translate | USER DATA — reference label typed by user |

---

## frontend/src/components/ResultViewer.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 20-23 | "Banana Pro", "Banana 2" | — | do-not-translate | IMAGE_MODEL_LABELS values — brand identifiers |
| 28-36 | "Lite", "Fast", "Quality", "Lite (Low Priority)", "Omni Flash · 4s/6s/8s/10s" | — | do-not-translate | VIDEO_QUALITY_LABELS values — brand identifiers |
| 65 | "vừa xong" | `time.just_now` | utility-fn | BUGS-01 — Vietnamese; rewrite with i18n key |
| 67 | "${diffMin} phút trước" | `time.minutes_ago` | utility-fn | BUGS-01 — Vietnamese; rewrite with i18n key + count |
| 69 | "${diffHr} giờ trước" | `time.hours_ago` | utility-fn | BUGS-01 — Vietnamese; rewrite with i18n key + count |
| 71 | "${diffDay} ngày trước" | `time.days_ago` | utility-fn | BUGS-01 — Vietnamese; rewrite with i18n key + count |
| 72 | new Date(t).toLocaleDateString("vi-VN") | `time.long_form_date` | utility-fn | BUGS-01 — hardcoded vi-VN locale; replace with Intl.DateTimeFormat |
| 319-325 | "Loading…", "Open your project on labs.google/flow…", "Fetching bytes from Google…" | `result.loading`, `result.no_url_hint`, `result.fetching_bytes` | text-node | Media loading hint texts |
| 468 | "${data.title} — media pending" | `result.media_pending` | aria-label | Placeholder aria; USER DATA interpolation |
| 489 | data.title | — | do-not-translate | USER DATA — node title |
| 497 | data.title | — | do-not-translate | USER DATA — placeholder content title |
| 499 | "media_id: ${shortMediaId}" | — | do-not-translate | Technical debug string — not UI copy |
| 511 | "Variant blocked" | `result.variant_blocked` | text-node | Blocked state title |
| 514 | "This variant was rejected by Google's safety filter…" | `result.variant_blocked_hint` | text-node | Blocked state message (truncated) |
| 538 | "Refresh" | `result.refresh` | text-node | Refresh button |
| 546 | "Variant selection" | `result.variant_selection` | aria-label | Variant switcher group |
| 554 | "Variant ${idx+1} — blocked: ${chipError}" | `result.variant_blocked_label` | aria-label | Blocked chip aria; interpolation `{{n}}`, `{{error}}` |
| 555 | "Variant ${idx+1}" | `result.variant_n` | aria-label | Normal chip aria; interpolation `{{n}}` |
| 556 | "Blocked: ${chipError}" | `result.blocked_title` | title-attr | Blocked chip tooltip |
| 570 | "Rendered" | `result.rendered_status` | text-node | Status pill |
| 572 | data.title | — | do-not-translate | USER DATA — node title h2 |
| 578 | "PROMPT" | `result.section_prompt` | text-node | Section label |
| 580 | "(no prompt)" | `result.no_prompt` | text-node | Empty prompt fallback |
| 582 | "Edit prompt →" | `result.edit_prompt` | text-node | Edit prompt button |
| 585 | "Backend is composing — try again in a moment" | `result.composing_wait` | title-attr | Disabled edit prompt tooltip |
| 593 | "SOURCE REFERENCES (${count})" | `result.source_refs_label` | text-node | Section label; interpolation `{{count}}` |
| 601 | "${title} — variant ${variantIdx+1}" | — | do-not-translate | USER DATA — title is node title |
| 628 | "METADATA" | `result.section_metadata` | text-node | Section label |
| 630 | "model" | `result.meta_model` | text-node | Metadata key |
| 640 | "country" | `result.meta_country` | text-node | Metadata key |
| 648 | "vibe" | `result.meta_vibe` | text-node | Metadata key |
| 653 | "aspect" | `result.meta_aspect` | text-node | Metadata key |
| 655 | "time" | `result.meta_time` | text-node | Metadata key |
| 657 | formatRelativeTime(data?.renderedAt) | `time.*` | utility-fn | BUGS-01 — see formatRelativeTime rows above |
| 663 | "Composing prompt — actions disabled until done" | `result.composing_actions_disabled` | text-node | Busy banner text |
| 665 | "Analyzing image — actions disabled until done" | `result.analyzing_actions_disabled` | text-node | Busy banner text |
| 671 | "Regenerate ⌘R" | `result.regenerate_kbd` | text-node | Primary action button |
| 675 | "Backend is busy on this node — try again in a moment" | `result.backend_busy` | title-attr | Disabled regenerate tooltip |
| 679 | "New variant +" | `result.new_variant` | text-node | New variant button |
| 683 | "Backend is busy on this node — try again in a moment" | `result.backend_busy` | title-attr | Disabled new variant tooltip |
| 685 | "Clone this node onto the canvas with the same upstream refs" | `result.clone_title` | title-attr | New variant tooltip (enabled state) |
| 693 | "★ Saved" | `result.saved` | text-node | Flash state |
| 693 | "…" | — | do-not-translate | Saving spinner — not translatable |
| 693 | "★ Save to library" | `result.save_to_library` | text-node | Save button default |
| 697 | "Wait for the generation to finish" | `result.wait_for_gen` | title-attr | Disabled save tooltip |
| 699 | "Save this variant to the cross-board Reference library" | `result.save_ref_library` | title-attr | Save button enabled tooltip |
| 707 | "Open in Flow ↗" | `result.open_in_flow` | text-node | Flow link; "Flow" is product name |
| 724 | "esc close · ←/→ variants" | `result.footer_hint` | text-node | Footer keyboard hint |
| 729 | "Close result viewer" | `result.close` | aria-label | Close button |
| 367 | "Video re-gen needs an upstream image with rendered media." | `result.video_regen_needs_upstream` | store-error | Set on generation store |

---

## frontend/src/components/SettingsPanel.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 29 | "Nano Banana Pro" | — | do-not-translate | IMAGE_MODELS label — brand identifier |
| 30 | "GEM_PIX_2 — premium, higher fidelity, slightly slower" | `settings.nano_banana_pro_hint` | text-node | Hint — translatable description |
| 32 | "Nano Banana 2" | — | do-not-translate | IMAGE_MODELS label — brand identifier |
| 33 | "NARWHAL — faster, lighter checkpoint" | `settings.nano_banana_2_hint` | text-node | Hint — "NARWHAL" is internal code name (do-not-translate) |
| 54 | "Veo 3.1 Lite" | — | do-not-translate | VIDEO_QUALITIES label — brand identifier |
| 55 | "Fastest generation, lightest model…" | `settings.veo_lite_hint` | text-node | Hint |
| 58 | "Veo 3.1 Fast" | — | do-not-translate | VIDEO_QUALITIES label — brand identifier |
| 59 | "Default — balanced fidelity and speed…" | `settings.veo_fast_hint` | text-node | Hint |
| 62 | "Veo 3.1 Quality" | — | do-not-translate | VIDEO_QUALITIES label — brand identifier |
| 63 | "Highest fidelity, slowest. Best for hero shots…" | `settings.veo_quality_hint` | text-node | Hint |
| 68 | "Veo 3.1 Lite (Low Priority)" | — | do-not-translate | VIDEO_QUALITIES label — brand identifier |
| 69 | "Same Lite checkpoint, low-priority queue…" | `settings.veo_lite_relaxed_hint` | text-node | Hint |
| ~120 | "Video model" | `settings.video_model_label` | text-node | Section heading |
| ~125 | "Image model" | `settings.image_model_label` | text-node | Section heading |
| ~130 | "Video quality" | `settings.video_quality_label` | text-node | Section heading |
| ~135 | "Ultra only" | `settings.ultra_only` | text-node | Badge/label for tier-locked options |
| ~140 | "Sign out" | `settings.sign_out` | text-node | Sign out button |

---

## frontend/src/components/SponsorDialog.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Support Flowboard" | `sponsor.title` | text-node | Dialog title; "Flowboard" is brand |
| — | "Community" | `sponsor.community` | text-node | Link label |

---

## frontend/src/components/StatusBar.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 46 | "● agent" | `status.agent_connected` | text-node | Status indicator — "agent" is app concept |
| 46 | "○ agent" | `status.agent_disconnected` | text-node | Status indicator |
| 47 | "? extension" | `status.ext_unknown` | text-node | Extension status unknown |
| 47 | "● extension" | `status.ext_connected` | text-node | Extension connected |
| 47 | "○ extension" | `status.ext_disconnected` | text-node | Extension disconnected |
| 56 | "token ${tokenAge}" | `status.token_age` | text-node | Token age; interpolation `{{age}}` |
| 62 | "req ${reqCount} · ✓${okCount} · ✗${failCount}" | — | do-not-translate | Technical stats — numeric display, not UI copy |

---

## frontend/src/components/Toaster.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 50 | role="alert" aria-live="assertive" | — | do-not-translate | Accessibility attrs — not strings |
| 58 | "Dismiss error" | `toaster.dismiss` | aria-label | Close button aria-label |

---

## frontend/src/components/Toolbar.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 39 | "Flowboard" | — | do-not-translate | Brand name — product wordmark |
| 49 | "Board name" | `toolbar.board_name` | aria-label | Name input aria-label |
| 52 | "Rename board" | `toolbar.rename_board` | aria-label | Name button aria-label |
| 54 | "Click to rename" | `toolbar.click_to_rename` | title-attr | Rename tooltip |
| 57 | boardName || "Untitled" | — | do-not-translate | USER DATA — board name; "Untitled" is a data default |

---

## frontend/src/components/activity/ActivityBell.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Activity" | `activity.bell_label` | aria-label | Bell button aria-label |
| — | "Cancel" | `activity.cancel` | aria-label | Cancel request button |

---

## frontend/src/components/activity/ActivityDetailModal.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Close" | `activity.detail_close` | aria-label | Close modal button |
| — | "Activity detail" | `activity.detail_title` | text-node | Modal title |

---

## frontend/src/components/activity/ActivityDropdown.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Activity" | `activity.dropdown_title` | text-node | Dropdown heading |
| — | "No activity yet" | `activity.empty` | text-node | Empty state |

---

## frontend/src/components/activity/ActivityRow.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Cancel" | `activity.row_cancel` | aria-label | Row cancel button |

---

## frontend/src/components/settings/AiProvidersSection.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "AI Providers" | `settings.providers_section_title` | text-node | Section heading |
| — | "Apply" | `settings.apply` | text-node | Apply button |
| — | "Configured" | `settings.configured` | text-node | Status label |
| — | "Not configured" | `settings.not_configured` | text-node | Status label |

---

## frontend/src/components/settings/ProviderCard.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Test" | `settings.test` | text-node | Test connection button |
| — | "Testing…" | `settings.testing` | text-node | Test in progress |
| — | "API Key" | `settings.api_key_label` | text-node | Key input label |
| — | "Enter API key…" | `settings.api_key_placeholder` | placeholder | Key input placeholder |

---

## frontend/src/components/settings/ProviderSetupModal.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | "Setup" | `settings.setup_title` | text-node | Modal title prefix |
| — | "Save" | `settings.save` | text-node | Save button |
| — | "Cancel" | `settings.cancel` | text-node | Cancel button |

---

## frontend/src/components/ChatSidebar.tsx

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| — | (component currently disabled / commented out in App.tsx) | — | do-not-translate | Entire component is commented out; strings deferred to Phase 2 when re-enabled |

---

## frontend/src/store/board.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 138-145 | "Character", "Image", "Video", "Prompt", "Note", "Visual asset", "Storyboard" | — | do-not-translate | TYPE_TITLE default node titles — user-visible but these are the initial data defaults; Phase 2 should translate these as `node_type.character` etc. and apply at node-creation time |
| ~305 | error via `err.message` | — | do-not-translate | Raw backend error messages — pass-through from api/client |

---

## frontend/src/store/chat.ts

No user-visible string literals found. Errors are pass-through from backend (`err.message`).

---

## frontend/src/store/generation.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 134 | "no board loaded" | `gen.no_board_loaded` | store-error | Set on store.error |
| 170 | "Open Flow once so the extension can detect your plan, then retry. (See the Tier-unknown banner in the bottom-left.)" | `gen.tier_unknown` | store-error | RESEARCH.md §7 V7 — explicit coverage required; "Flow" is product name |
| 222 | "Omni Flash needs at least one ingredient (connect an upstream Character / Image / Visual asset)." | `gen.omni_no_ingredients` | store-error | Set on store.error; "Omni Flash" is brand name |
| 251 | "Veo i2v requires a source image (connect an upstream image node)" | `gen.veo_no_source` | store-error | Set on store.error; "Veo i2v" is brand/technical |
| 454 | "Timed out after 5 minutes (${req.error ?? 'video_timeout'})" | `gen.timed_out` | store-error | Timeout error; interpolation `{{error}}` |
| 486 | "Generation poll failed: ${msg}" | `gen.poll_failed` | store-error | Set on store.error; interpolation `{{msg}}` |
| 523 | "no source image to refine" | `gen.no_source_to_refine` | store-error | Set on store.error |
| 633 | "Timed out after 5 minutes (${…})" | `gen.timed_out` | store-error | refineImage path |

---

## frontend/src/store/pipeline.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 32 | "failed to start plan" | `pipeline.failed_to_start` | store-error | catch fallback in startRun |
| 61 | `run.error ?? "pipeline failed"` | `pipeline.failed` | store-error | Terminal run failure |

---

## frontend/src/store/references.ts

No user-visible string literals found. Errors are pass-through from backend (`err.message`).

---

## frontend/src/store/settings.ts

No user-visible string literals. Constants (`OMNI_FLASH_CREDIT_COST`, `OMNI_FLASH_DURATIONS`) are numeric, not strings.

---

## frontend/src/api/client.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 19 | `token.toLowerCase()` | — | do-not-translate | BUGS-02 — locale-unsafe; fix to `toLocaleLowerCase("en-US")`, not a translation site |
| 21-27 | "Flowboard doesn't know your Google Flow plan tier yet — the extension hasn't seen a Flow request that exposes it. Open https://labs.google/fx/tools/flow in a tab and reload it once, then retry. Flowboard refuses to dispatch in this state to avoid silently serving Ultra users at the Pro checkpoint." | `error.paygate_tier_unknown` | error-humanizer | Full multi-sentence; "Flowboard", "Flow", "Ultra", "Pro" are brand names |
| 29-35 | "Google Flow accepted the upload but didn't return a media handle — this usually means the image was silently rejected by Flow's content filter (logos, watermarks, copyrighted brand imagery). Try a different image or download it locally and upload as a file. Check the agent terminal for the full Flow response." | `error.upload_no_media_id` | error-humanizer | Full multi-sentence; "Flow" is brand name |
| 38-43 | "Chrome has no open windows for the extension to attach a Flow tab to. Open any Chrome window (or click the extension's '⋯ → Open Flow') and retry — Flowboard will reuse the existing window automatically." | `error.captcha_no_window` | error-humanizer | "Chrome", "Flow", "Flowboard" are brand names |
| 45-48 | `return token;` | — | do-not-translate | `captcha_failed:` — backend error token passed through verbatim |
| 50-53 | `token.replace(/^PUBLIC_ERROR_/i, "Flow rejected: ").replace(/_/g, " ")` | `error.flow_rejected_prefix` | error-humanizer | "Flow rejected: " is the translatable prefix; backend error suffix is NOT translatable |

---

## frontend/src/api/autoBrief.ts

No user-visible strings. Pure API helper with no error humanization.

---

## frontend/src/api/github.ts

No user-visible strings. Pure API helper.

---

## frontend/src/lib/storyboardPrompt.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 53 | "untitled story" | — | do-not-translate | LLM prompt template default — goes to LLM, not to user UI; never shown to user directly |
| 47-90 | Full storyboard prompt template | — | do-not-translate | LLM-prompt strings — consumed by the AI generation model, never shown to the user as UI copy. Per PROJECT.md §Out of Scope: "LLM-generated content". |

---

## frontend/src/components/activity/activity-meta.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 10 | "Auto-Prompt" | `activity.auto_prompt` | activity-label | ACTIVITY_TYPE_META label |
| 11 | "Auto-Prompt (batch)" | `activity.auto_prompt_batch` | activity-label | ACTIVITY_TYPE_META label |
| 12 | "Vision" | `activity.vision` | activity-label | ACTIVITY_TYPE_META label |
| 13 | "Planner" | `activity.planner` | activity-label | ACTIVITY_TYPE_META label |
| 14 | "Generate image" | `activity.gen_image` | activity-label | ACTIVITY_TYPE_META label |
| 15 | "Generate video" | `activity.gen_video` | activity-label | ACTIVITY_TYPE_META label |
| 16 | "Edit image" | `activity.edit_image` | activity-label | ACTIVITY_TYPE_META label |
| 17 | "Upload (file)" | `activity.upload_file` | activity-label | ACTIVITY_TYPE_META label |
| 18 | "Upload (link)" | `activity.upload_link` | activity-label | ACTIVITY_TYPE_META label |
| 33 | "queued" | `activity.status_queued` | activity-label | STATUS_META label |
| 34 | "running" | `activity.status_running` | activity-label | STATUS_META label |
| 35 | "done" | `activity.status_done` | activity-label | STATUS_META label |
| 36 | "failed" | `activity.status_failed` | activity-label | STATUS_META label |
| 39 | "canceled" | `activity.status_canceled` | activity-label | STATUS_META label |
| 42 | "timeout" | `activity.status_timeout` | activity-label | STATUS_META label |
| 33 | "⋯" | — | do-not-translate | Unicode glyph icon — not localizable copy |
| 34 | "⟳" | — | do-not-translate | Unicode glyph icon |
| 35 | "✓" | — | do-not-translate | Unicode glyph icon |
| 36 | "✗" | — | do-not-translate | Unicode glyph icon |
| 39 | "⊘" | — | do-not-translate | Unicode glyph icon |
| 42 | "⏱" | — | do-not-translate | Unicode glyph icon |
| 52 | "just now" | `activity.just_now` | utility-fn | relativeTime() return value |
| 55 | "${sec}s ago" | `activity.sec_ago` | utility-fn | relativeTime() return; interpolation `{{count}}` |
| 56 | "${min}m ago" | `activity.min_ago` | utility-fn | relativeTime() return; interpolation `{{count}}` |
| 58 | "${hr}h ago" | `activity.hr_ago` | utility-fn | relativeTime() return; interpolation `{{count}}` |
| 60 | "${day}d ago" | `activity.day_ago` | utility-fn | relativeTime() return; interpolation `{{count}}` |
| 62 | `toLocaleDateString()` | — | do-not-translate | BUGS-01 pattern — fallback date; should use `Intl.DateTimeFormat` |
| 66-71 | "${ms}ms", "${…}s", "${min}m ${s}s" | — | do-not-translate | formatDuration() — technical duration strings, not UI copy per-se; Phase 2 may choose to localize |

---

## frontend/src/components/activity/useActivityFeed.ts

No user-visible string literals found. Pure data-fetching hook.

---

## frontend/src/constants/character.ts

| Line(s) | Current string | Key proposal | Kind | Notes |
|---------|----------------|--------------|------|-------|
| 11-14 | `CHARACTER_GENDERS` (all entries) | — | do-not-translate | `key` values ("male", "female") are API parameters passed to the backend prompt-builder. `label` values ("Nam", "Nữ") are Vietnamese display labels — currently NOT English UI strings; flagged for Phase 2 decision on whether to translate these labels or leave them as Vietnamese-only |
| 16-24 | `CHARACTER_COUNTRIES` (7 entries) | — | do-not-translate | `key` values are API parameter values (ISO country codes); `tag` values are English nouns injected into prompts (not UI copy). `label` values are Vietnamese display labels — same Phase 2 decision flag as above |
| 30-91 | `CHARACTER_VIBES` (6 entries) | — | do-not-translate | `key` values are API parameters; `tokens` are LLM prompt strings (never shown to user as UI copy). `label` values ("Clean Girl", "Douyin", "Old Money", "Cold Girl", "K-Pop", "Casual") are currently English/mixed display labels in a picker UI — Phase 2 must decide whether these brand-like vibe names should be translated or kept as-is. "Douyin" and "K-Pop" are proper nouns; "Clean Girl", "Old Money", "Cold Girl" are style names |
| 97-104 | `countryLabel()`, `vibeLabel()` helpers | — | do-not-translate | Pure helpers returning label strings from constants above; translation would happen at the constant level, not here |

---

## String Density Summary

Files with the highest extraction load for Phase 2 (rows count = translatable rows, excluding do-not-translate):

| File | Translatable rows | do-not-translate rows | Notes |
|------|-------------------|----------------------|-------|
| frontend/src/canvas/NodeCard.tsx | 52 | 8 | Highest density + user-data risk |
| frontend/src/components/GenerationDialog.tsx | 42 | 8 | Dialog form fields + Vietnamese content |
| frontend/src/components/ResultViewer.tsx | 30 | 12 | Metadata grid + BUGS-01 Vietnamese strings |
| frontend/src/api/client.ts | 4 | 2 | error-humanizer branches (high priority — visible error text) |
| frontend/src/store/generation.ts | 7 | 0 | store-error strings |
| frontend/src/components/activity/activity-meta.ts | 15 | 8 | activity-label + utility-fn strings |
| frontend/src/components/ProjectSidebar.tsx | 8 | 1 | Sidebar UI copy |
| frontend/src/components/ReferencesPanel.tsx | 10 | 1 | Panel UI copy |
| frontend/src/components/SettingsPanel.tsx | 8 | 5 | Settings with brand names |
| frontend/src/components/Toolbar.tsx | 3 | 2 | Toolbar wordmark + board name |
| frontend/src/App.tsx | 1 | 0 | Single loading string |
| frontend/src/canvas/AddNodePalette.tsx | 3 | 5 | Node type labels (ambiguous) |
| frontend/src/components/Toaster.tsx | 1 | 0 | Dismiss aria-label |
| frontend/src/store/pipeline.ts | 2 | 0 | Pipeline error strings |
| frontend/src/store/board.ts | 0 | 7 | TYPE_TITLE defaults (data, not UI copy at render time) |
| frontend/src/lib/storyboardPrompt.ts | 0 | 2 | LLM prompt templates |
| frontend/src/constants/character.ts | 0 | 4 | API parameter values + vibe labels (Phase 2 decision needed) |

**Total translatable rows: ~186**
**Total do-not-translate rows: ~65**
