---
status: complete
phase: 04-polish-verify
source:
  - .planning/phases/04-polish-verify/MAINTAINER-CHECKLIST.md
  - .planning/phases/04-polish-verify/04-VERIFICATION.md
started: 2026-06-16T00:00:00Z
updated: 2026-06-16T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold-start in Turkish
expected: |
  Set localStorage flowboard.i18n.locale = "tr", hard reload, app renders in
  Turkish end-to-end. <html lang="tr">. No console errors. No missing-key
  warnings from i18next.
result: pass
note: |
  Toolbar + add-node palette + status pills fully Turkish (ajan, eklenti,
  Karakter, Görsel, Storyboard, Video, Görsel varlık, Prompt, Not).
  502 on /api/flow/projects observed but treated as separate setup blocker
  (Chrome extension auth / labs.google session) — does not affect i18n correctness.

### 2. Full generation flow in Turkish (VERIFY-01)
expected: |
  In Turkish UI: create a board, upload a character ref + visual asset ref,
  compose an image node, run generation, open Result Viewer, drive a video
  generation from the image, cancel a running gen, check Activity Bell counts
  + labels, open Activity Detail modal, trigger a backend error (e.g.
  disconnect extension during ▶ Üret). Every visible string is Turkish; no
  console errors; no English leakage.
result: issue
reported: |
  prompts should be turkish also, i dont want to translate prompts but it
  should be translated in visibility. Screenshot: Character generation
  dialog ("Karakter üret") shows Vietnamese option labels — CINSIYET pills
  Nam/Nữ; ÜLKE pills Việt Nam/Nhật Bản/Hàn Quốc/Trung Quốc/Thái Lan/Mỹ/Pháp.
  Footer reads "Untitled · 9 nodes" (English "nodes" suffix) inside Turkish
  dialog. Card header behind dialog reads "Character" not "Karakter".
severity: major

### 3. Layout at Turkish string lengths (VERIFY-02)
expected: |
  At 1280×800 with TR locale active, no clipping or awkward wrapping in:
  toolbar, add-node palette, NodeCard title/buttons/aria, Generation Dialog
  section headers + form labels, Settings panel (incl. select width), Result
  Viewer metadata + actions, Activity Dropdown, Account panel, Toaster.
result: pass

### 4. Live language switch via Settings (SWITCH-02/03)
expected: |
  In Settings panel "Dil / Language" section, switch English ↔ Türkçe. App
  re-renders instantly with no full reload. `<html lang>` flips between
  "en" and "tr" (verify in DevTools Elements). The choice persists across
  page refresh.
result: pass

### 5. tr-TR browser dotted-i fix (VERIFY-04, BUGS-02)
expected: |
  Override browser locale to tr-TR (DevTools Sensors). With TR app locale
  active, trigger a PUBLIC_ERROR_* path (e.g. content-filter rejection).
  Error renders as "Flow reddetti: public_error_foo" (correct ASCII `i`),
  NOT the dotless-ı corrupted variant. Spot-check:
  `"PUBLIC_ERROR_FOO".toLocaleLowerCase("en-US") === "public_error_foo"`
  in the Console.
result: pass

### 6. Native-quality refinement of tr.json (TR-02)
expected: |
  Open `frontend/src/i18n/locales/tr.json` next to `en.json` and read with a
  native speaker's ear. Refine any machine-feeling literals, normalize
  Sen/Siz tone, fix tone mismatches, clean punctuation/capitalization. If
  refinements are made, commit them as `fix(i18n): refine Turkish translations`.
result: pass
note: Native speaker accepted first-pass translations as-is; no refinement commit needed.

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Generation dialog option labels render in active locale (Turkish), with English/internal `tag` field still feeding the AI prompt"
  status: failed
  reason: "frontend/src/constants/character.ts:14-25 — GENDERS and COUNTRIES arrays hold raw Vietnamese strings in the `label` field (Nam/Nữ; Việt Nam/Nhật Bản/Hàn Quốc/Trung Quốc/Thái Lan/Mỹ/Pháp). Phase 2 carve-out 'product/model names stay in constants/' was applied too broadly — gender + country are UI copy, not brand names. `tag` field stays English (correct, drives prompt build in buildCharacterPrompt)."
  severity: major
  test: 2
  artifacts:
    - "frontend/src/constants/character.ts:13-25"
    - "frontend/src/components/GenerationDialog.tsx:638-639 (buildCharacterPrompt consumes tag, not label)"
  missing:
    - "en.json + tr.json keys: character.gender.male, character.gender.female, character.country.{vn,jp,kr,cn,th,us,fr}"
    - "Lookup helper in constants/character.ts or call site that resolves label via t() while keeping tag for prompts"

- truth: "Static text wrapping dynamic values is translated; only the dynamic values are do-not-translate"
  status: failed
  reason: "frontend/src/components/GenerationDialog.tsx:1354-1356 — the do-not-translate annotation correctly fences {boardName} and {nodeCount}, but the surrounding ' node' / ' nodes' suffix is hardcoded English (and embeds Anglo plural logic). In Turkish UI footer reads 'Untitled · 9 nodes'."
  severity: minor
  test: 2
  artifacts:
    - "frontend/src/components/GenerationDialog.tsx:1354-1356"
  missing:
    - "en.json + tr.json key: dialog.footer.node_count with {{count}} interpolation (Turkish has no plural form distinction — single key)"

- truth: "Character node card header reads as the localized node-type label"
  status: failed
  reason: "Screenshot shows 'Character' header on the visible NodeCard while the dialog overlay is fully Turkish. Worth confirming whether this is a Character node TITLE default (`data.title || nodeTypeLabel`) or a hardcoded fallback string. If it's a fallback, it needs a t() lookup; if it's user data the default should localize."
  severity: major
  test: 2
  artifacts:
    - "frontend/src/canvas/NodeCard.tsx (header render path — investigate)"
  missing:
    - "Verification of node-type fallback label source; t() key if hardcoded"
