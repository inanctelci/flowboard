# Maintainer manual-verification checklist — v1.0 i18n milestone

**Generated:** 2026-06-10
**Why:** Phase 4's verification requirements VERIFY-01, VERIFY-02, VERIFY-04
need a live browser. The autonomous orchestrator can't drive a browser,
so these items are deferred to the maintainer. The orchestrator has
already confirmed VERIFY-03 (lint passes) and all related automated
gates.

Tick each box as you confirm it. Once all are ticked, the milestone is
ready to ship.

## Automated gates (already confirmed by orchestrator)

- [x] `cd frontend && npm run lint` exits 0 (TypeScript strict + typed-key gate)
- [x] `cd frontend && npm run build` succeeds (~580 KB bundle, ~830 ms)
- [x] en.json / tr.json key parity: 424 / 424
- [x] Zero empty Turkish values
- [x] Zero placeholder mismatches (`{{xxx}}` tokens preserved in every key)
- [x] `grep -rE "(vừa xong|phút trước|giờ trước|ngày trước)" frontend/src` returns ZERO hits
- [x] `node scripts/check-i18n-parity.mjs` exits 0

## VERIFY-01 — Full generation flow in Turkish (manual browser drive)

Steps:

1. `cd frontend && npm run dev` — boots Vite on http://localhost:5173
2. In another shell: `make agent` — boots the FastAPI agent on :8101
3. Make sure the Chrome MV3 extension is loaded and connected (`extension/`)
4. Open the app in Chrome. In DevTools → Application → Local Storage,
   set `flowboard.i18n.locale = "tr"`. Hard reload.
5. Drive a full end-to-end flow in Turkish UI:
   - [ ] Create a new board (Toolbar → "Yeni Pano" or whatever the translated button reads)
   - [ ] Upload a character reference (Character node → upload an image)
   - [ ] Upload a visual asset reference
   - [ ] Compose an image node from the two refs (`▶ Üret` / Generate)
   - [ ] Wait for the image to render; open the Result Viewer overlay
   - [ ] Drive an i2v generation from the image (Video node)
   - [ ] Cancel a running generation (test the cancel button copy)
   - [ ] Check the Activity Bell — counts and labels are Turkish
   - [ ] Open the Activity Detail Modal for a completed item
   - [ ] Trigger a backend error (e.g. disconnect the extension while clicking ▶ Generate) — the error message should appear in Turkish

   Observed result: __________________________________________________

   No console errors? __________________________________________________

   Any untranslated English strings visible? __________________________

6. Switch back to English mid-session via Settings panel dropdown
   (`Dil / Language` section)
   - [ ] App re-renders in English instantly (no page reload required)
   - [ ] `<html lang>` flips back to `en` (verify in DevTools Elements tab)

## VERIFY-02 — Layout review at Turkish string lengths

Steps:

1. Same setup as VERIFY-01 (Turkish locale active)
2. At 1280×800 viewport (the default desktop target), inspect:
   - [ ] Toolbar — wordmark / buttons not overlapping
   - [ ] Add-node palette — chip labels not wrapping awkwardly
   - [ ] NodeCard — title/button/aria-label labels not clipping
   - [ ] Generation Dialog — section headers and form labels fit
   - [ ] Settings panel — section labels, descriptions, and select width all
         visible without horizontal scroll
   - [ ] Result Viewer overlay — metadata grid labels and action buttons fit
   - [ ] Activity Dropdown — title and item labels fit without truncation
   - [ ] Account panel — banner and status text reads naturally
   - [ ] Toaster — error messages don't overflow

3. At smaller breakpoints (768px, 1024px) if Flowboard supports them, repeat.

   Observed result: __________________________________________________

   Files / areas needing layout fixes: ______________________________

## VERIFY-04 — Turkish browser dotted-i exercise of BUGS-02 fix

Steps:

1. DevTools → Sensors (or Application → Manifest → Locale override) — set
   the browser locale to `tr-TR`
2. Set `localStorage.flowboard.i18n.locale = "tr"`. Hard reload.
3. Trigger a `PUBLIC_ERROR_*` flow from Google Flow (e.g. dispatch a
   generation that hits the content filter)
4. Confirm:
   - [ ] The error message renders as "Flow rejected: …" prefix +
         lowercased token (the `error.flow_rejected_prefix` key resolves
         correctly), NOT as the dotless-i corrupted variant
   - [ ] In DevTools Console: `"PUBLIC_ERROR_FOO".toLocaleLowerCase("en-US") === "public_error_foo"`
         (correct ASCII `i`, not dotless `ı`)

## TR-02 — Native Turkish translation quality review

You're the native Turkish speaker. Open `frontend/src/i18n/locales/tr.json`
side-by-side with `en.json` and refine:

- [ ] Translations that sound machine-generated or unnaturally literal
- [ ] Tone mismatches (e.g. an error message that's too formal, a button
      label that's too verbose)
- [ ] Plural-form values that should differ between `_one` and `_other`
      (Turkish uses one plural form so they're often identical, but check
      `dropdown_item_one` / `_other` and similar in context)
- [ ] Native-language conventions for app UI (capitalization, punctuation)
- [ ] Direct-address tone for buttons and confirmations (`Sen` vs `Siz`?
      decide on one and stick to it)

Commit any refinements with `fix(i18n): refine Turkish translations`
before declaring the milestone complete.

## Ready to ship?

- [ ] All items above ticked
- [ ] One round of `npm run lint && node scripts/check-i18n-parity.mjs`
      passes after any maintainer refinements
- [ ] Open the milestone PR (or merge directly if working solo)

Once the checklist is complete, run `/gsd-complete-milestone v1.0` to
archive the planning artifacts.
