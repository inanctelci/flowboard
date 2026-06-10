---
phase: 02-english-extraction
verified: 2026-06-10T12:00:00Z
status: gaps_found
score: 3/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Maintainer searches frontend/src/ for any hardcoded English phrase and finds zero results outside frontend/src/i18n/ and frontend/src/constants/"
    status: failed
    reason: "Multiple user-visible strings were not in the Phase 1 string inventory and were not extracted. They remain as hardcoded literals in AccountPanel.tsx, AiProvidersSection.tsx, Board.tsx (drop-popover), ReferencesPanel.tsx, and AiProviderBadge.tsx."
    artifacts:
      - path: "frontend/src/components/AccountPanel.tsx"
        issue: "~13 un-extracted strings: aria-label='Account' (L181), '⚠ Extension not detected' (L257), 'Refresh the Flow tab, then reload the Flowboard extension.' (L260), title='Scan again for an extension connection' (L266), 'Try again' (L268), title='Scan for...' (L277), '🔍 Scan extension' (L279), aria-label='Open settings' (L289), title='Settings' (L290), 'Tier unknown' text node (L326), 'Open Flow once so the extension can detect your plan.' (L329), 'Ultra'/'Pro' tier labels (L169-171)"
      - path: "frontend/src/components/settings/AiProvidersSection.tsx"
        issue: "~15 un-extracted strings: 'The CLI is installed but not signed in...' (L321), 'Install the CLI from npm...' (L322), 'Setup help →' (L329), 'Test the connection, then Apply' (L342), 'Run the connection test successfully...' (L359), 'Applying…' (L364), 'Already active' (L366), 'Pinging the CLI…' (L417), 'Sends one tiny prompt...' (L418), 'Retry'/'Re-test' (L452-454), aria-label='Copy install command' (L494), '✓ Copied'/'Copy' (L496), 'Install / upgrade' (L488), 'Open {ref.docsLabel} ↗' (L505)"
      - path: "frontend/src/canvas/Board.tsx"
        issue: "aria-label='Add connected node' (L95), 'Image' and 'Video' text nodes in drop-popover (L98-101) — inventory incorrectly listed zero extractable strings"
      - path: "frontend/src/components/ReferencesPanel.tsx"
        issue: "'Unpin reference' aria-label (L309), 'Unpin'/'Pin to top' title strings (L310) — not in inventory"
      - path: "frontend/src/components/AiProviderBadge.tsx"
        issue: "title='Pick an AI provider to power Auto-Prompt, Vision, and Planner.' (L101) — not in inventory"
    missing:
      - "Add ~30 missing keys to en.json for AccountPanel, AiProvidersSection, Board.tsx drop-popover, ReferencesPanel, and AiProviderBadge"
      - "Wrap all remaining hardcoded strings with t() calls, using appropriate area prefixes"
      - "Add empty-string parity stubs to tr.json"
  - truth: "Product and model names (Veo 3.1 Lite, Nano Banana Pro, Omni Flash) do not appear as keys or values in en.json"
    status: failed
    reason: "'Omni Flash' appears as a substring inside 4 en.json values: gen.omni_no_ingredients, dialog.omni_duration_label, dialog.omni_info_tip, and dialog.model_tip. The ROADMAP SC forbids product names from appearing in en.json values. The Phase 1 inventory created the tension by proposing to extract sentences that embed brand names — the executor followed the inventory, but the strict SC was violated."
    artifacts:
      - path: "frontend/src/i18n/locales/en.json"
        issue: "gen.omni_no_ingredients: 'Omni Flash needs at least one ingredient...'; dialog.omni_duration_label: 'Duration (Omni Flash)'; dialog.omni_info_tip: 'Omni Flash dispatches via...'; dialog.model_tip: '...Omni Flash uses reference ingredients...'"
    missing:
      - "Decision needed: either (a) rewrite these 4 values to omit 'Omni Flash' and keep only the surrounding UI copy, or (b) accept the deviation by adding an override entry since the inventory explicitly proposed these extractions"
---

# Phase 02: English Extraction Verification Report

**Phase Goal:** Every hardcoded user-visible string in `frontend/src/` replaced with `t()` calls; `en.json` complete coverage; TypeScript enforces key correctness; app renders in English identically to before.
**Verified:** 2026-06-10T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `t("any.nonexistent.key")` is a TypeScript compile error | ✓ VERIFIED | `i18n.d.ts` correctly augments `CustomTypeOptions` with `typeof en`; `npm run lint` exits 0 with no errors |
| 2 | Maintainer searches `frontend/src/` for hardcoded English phrases and finds zero results outside `i18n/` and `constants/` | ✗ FAILED | 13 un-extracted strings in AccountPanel.tsx; 15+ in AiProvidersSection.tsx; 3 in Board.tsx drop-popover; 3 in ReferencesPanel.tsx; 1 in AiProviderBadge.tsx |
| 3 | Product/model names (`"Veo 3.1 Lite"`, `"Nano Banana Pro"`, `"Omni Flash"`) absent from `en.json` | ✗ FAILED | "Omni Flash" appears embedded in 4 en.json values: `gen.omni_no_ingredients`, `dialog.omni_duration_label`, `dialog.omni_info_tip`, `dialog.model_tip`. "Veo 3.1" and "Nano Banana" do not appear in en.json — only "Omni Flash" fails this SC. |
| 4 | App renders in browser with same English UI — no blank labels, no raw key strings, no console translation-miss warnings | ? UNCERTAIN | Verified by code inspection: all primary production paths use `t()`. Residual hardcoded strings in AccountPanel and AiProvidersSection render verbatim (not as missing keys), so the app shows English text — just not from the catalog. Needs human spot-check. |
| 5 | Store error strings and activity-meta labels appear in English when code paths are exercised | ✓ VERIFIED | `store/generation.ts`, `store/pipeline.ts`, `api/client.ts` `humanizeBackendError`, and `activity-meta.ts` all use `i18n.t()` headless singleton with keys present in en.json. Activity time plurals resolve correctly via `_one`/`_other` suffix convention. |

**Score:** 3/5 truths verified (2 FAILED, 1 UNCERTAIN/human-needed)

### Deferred Items

None. All failures are addressable in a gap-closure plan for Phase 2.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `frontend/src/i18n/i18n.ts` | i18next singleton, synchronous init | ✓ VERIFIED | Correct: LanguageDetector + initReactI18next, `fallbackLng: "en"`, `flowboard.i18n.locale` localStorage key |
| `frontend/src/i18n/i18n.d.ts` | `CustomTypeOptions` augmentation with `typeof en` | ✓ VERIFIED | Lines 20-27: `resources: { translation: typeof en }` — typed-key gate active |
| `frontend/src/i18n/locales/en.json` | 383 keys, 20 area prefixes | ✓ VERIFIED | 383 keys confirmed; areas: time.*, account.*, panel.*, provider.*, settings.*, sidebar.*, status.*, toaster.*, toolbar.*, node.*, palette.*, app.*, gen.*, pipeline.*, error.*, character.*, activity.*, sponsor.*, result.*, dialog.* |
| `frontend/src/i18n/locales/tr.json` | 383 keys, empty-string stubs, exact parity | ✓ VERIFIED | 383 keys, zero missing vs en.json, zero extra |
| `frontend/src/canvas/AddNodePalette.tsx` | useTranslation + t() calls | ✓ VERIFIED | useTranslation present; palette.* keys used |
| `frontend/src/canvas/NodeCard.tsx` | useTranslation + t() calls, user-data boundaries | ✓ VERIFIED | 65 t() calls; `data.title` never wrapped; boundary comments present |
| `frontend/src/components/GenerationDialog.tsx` | useTranslation; Vietnamese rewrites done | ✓ VERIFIED | 55 t() calls; all 13 Vietnamese strings replaced; Trans used for markup-embedded strings |
| `frontend/src/components/ResultViewer.tsx` | useTranslation; formatRelativeTime uses t() | ✓ VERIFIED | `formatRelativeTime` takes `t` and `resolvedLanguage` as params; uses `time.*` keys |
| `frontend/src/components/AccountPanel.tsx` | useTranslation; inventory rows extracted | ✗ STUB | useTranslation present (L2, L31) and 2 t() calls (`account.scanning`, `account.open_flow`) but ~13 strings outside the inventory were not extracted |
| `frontend/src/components/settings/AiProvidersSection.tsx` | useTranslation; inventory rows extracted | ✗ STUB | useTranslation present; 4 inventory rows extracted (`settings.apply`, `settings.configured`, etc.) but ~15 strings outside the inventory were not extracted |
| `frontend/src/canvas/Board.tsx` | No user-visible strings per inventory | ✗ STUB | Drop-popover at L90-103 has `aria-label="Add connected node"`, "Image", "Video" text nodes — inventory missed these |
| `frontend/src/components/ReferencesPanel.tsx` | useTranslation; inventory rows extracted | ✗ STUB | Most rows extracted; "Unpin reference"/"Unpin"/"Pin to top" (L309-310) missed |
| `frontend/src/api/client.ts` | humanizeBackendError uses i18n.t() for 4 branches | ✓ VERIFIED | L23, L27, L30, L39: all 4 branches use `i18n.t()`; BUGS-02 dotted-i fix present (L21 `.toLocaleLowerCase("en-US")`) |
| `frontend/src/store/generation.ts` | Headless i18n.t() for 8 store error strings | ✓ VERIFIED | L135 `gen.no_board_loaded`, L171 `gen.tier_unknown`, confirmed via en.json key presence |
| `frontend/src/store/pipeline.ts` | Headless i18n.t() for 2 store error strings | ✓ VERIFIED | L33 `pipeline.failed_to_start`, L63 `pipeline.failed` |
| `frontend/src/components/activity/activity-meta.ts` | Headless i18n.t() for ACTIVITY_TYPE_META + STATUS_META + relativeTime | ✓ VERIFIED | All labels use `get label()` getter with `i18n.t()`; `relativeTime()` uses `activity.*` keys |
| `frontend/src/App.tsx` | useTranslation + t("app.loading_board") + lang effect | ✓ VERIFIED | L30 `const { t, i18n } = useTranslation()`; L32 `document.documentElement.lang` effect; L51 `t("app.loading_board")` |
| `frontend/src/constants/character.ts` | Enum data preserved; localized helpers added | ✓ VERIFIED | Original constants unchanged; `localizedGenderLabel`, `localizedCountryLabel`, `localizedVibeLabel` helpers use `i18n.t()` |
| `frontend/src/store/board.ts` | Vietnamese JSDoc comment rewritten | ✓ VERIFIED | L70-72: `// Powers the relative-time display in ResultViewer.` — no Vietnamese strings remain |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `AccountPanel.tsx` | `en.json` | `t("account.*")` | ✗ PARTIAL | Only `account.scanning` and `account.open_flow` wired; ~11 strings remain hardcoded |
| `AiProvidersSection.tsx` | `en.json` | `t("settings.*")` | ✗ PARTIAL | Inventory rows wired; ~15 strings outside inventory remain hardcoded |
| `api/client.ts` | `en.json` | `i18n.t("error.*")` | ✓ WIRED | All 4 humanizeBackendError branches use i18n.t(); keys present in en.json |
| `activity-meta.ts` | `en.json` | `i18n.t("activity.*")` | ✓ WIRED | 9 type labels + 6 status labels + relative time — all wired |
| `NodeCard.tsx` | `en.json` | `t("node.*")` | ✓ WIRED | 65 t() calls; all node.* keys present |
| `Board.tsx` drop-popover | `en.json` | `t()` | ✗ NOT_WIRED | Drop-popover strings not extracted; no t() calls in Board.tsx |
| `ReferencesPanel.tsx` | `en.json` | `t("panel.*")` | ✗ PARTIAL | Most panel.* keys wired; unpin/pin-to-top strings not wired |

### Data-Flow Trace (Level 4)

Not applicable for this phase. Phase 2 concerns string extraction (key catalog), not data fetching.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vietnamese strings absent | `grep -rE "(vừa xong\|phút trước\|giờ trước\|ngày trước)" frontend/src` | Zero hits | ✓ PASS |
| board.ts Vietnamese comment absent | `grep -n "vừa xong\|phút trước" frontend/src/store/board.ts` | Zero hits | ✓ PASS |
| Product names not standalone en.json values | grep for "Veo 3.1", "Nano Banana Pro" in en.json | Zero hits | ✓ PASS (partial) |
| "Omni Flash" in en.json values | `grep "Omni Flash" frontend/src/i18n/locales/en.json` | 4 hits in values | ✗ FAIL (SC3 breach) |
| en.json / tr.json key parity | python3 set comparison | 383 keys, 0 missing in tr | ✓ PASS |
| tsc --noEmit | `npm run lint` | Exit 0 | ✓ PASS |
| Hardcoded aria-labels outside i18n | `grep -rn 'aria-label="[A-Za-z]' frontend/src --include="*.tsx"` | 8 instances, several un-extracted | ✗ FAIL |

### Probe Execution

No probes declared or applicable for this extraction phase.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EXTRACT-01 | 02-01, 02-02, 02-03, 02-04, 02-05 | All JSX text nodes wrapped with t() | ✗ PARTIAL | Primary components (NodeCard, GenerationDialog, ResultViewer, dialogs, activity, stores) done; AccountPanel, AiProvidersSection, Board drop-popover, ReferencesPanel have residual hardcoded text nodes |
| EXTRACT-02 | 02-01, 02-02, 02-03, 02-04, 02-05 | All attribute strings (aria-label, title, placeholder) extracted | ✗ PARTIAL | Most extracted; ~6 files have un-extracted aria-labels and title strings: AccountPanel (aria-label="Account", "Open settings", title="Settings"), AiProvidersSection (aria-label="Copy install command"), Board ("Add connected node"), ReferencesPanel ("Unpin reference"), AiProviderBadge (title="Pick an AI provider...") |
| EXTRACT-03 | 02-04, 02-05 | Non-component code paths use headless i18n.t() | ✓ SATISFIED | store/generation.ts, store/pipeline.ts, api/client.ts, activity-meta.ts, constants/character.ts all use headless singleton |
| EXTRACT-04 | 02-05 | humanizeBackendError branches use i18n.t() | ✓ SATISFIED | All 4 branches in api/client.ts use `i18n.t()` with error.* keys; BUGS-02 fix present |
| EXTRACT-05 | 02-04 | activity-meta.ts event labels extracted | ✓ SATISFIED | ACTIVITY_TYPE_META and STATUS_META use `get label()` with i18n.t(); relativeTime() uses activity.* keys |
| EXTRACT-06 | 02-01, 02-03 | Product/model names stay in constants, not in catalog | ✗ PARTIAL | "Veo 3.1 Lite", "Nano Banana Pro" absent from en.json; "Omni Flash" appears embedded in 4 en.json values — violates strict SC reading |
| EXTRACT-07 | All | User-authored content never wrapped with t() | ✓ SATISFIED | data.title, data.prompt, boardName, ref.label confirmed unwrapped with do-not-translate boundary comments throughout |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/AccountPanel.tsx` | 181 | `aria-label="Account"` hardcoded | ✗ BLOCKER | Untranslatable for Turkish locale |
| `frontend/src/components/AccountPanel.tsx` | 257-268 | Extension-not-detected UI copy hardcoded (3 strings) | ✗ BLOCKER | Untranslatable error recovery flow |
| `frontend/src/components/AccountPanel.tsx` | 279 | `"🔍 Scan extension"` hardcoded | ✗ BLOCKER | Primary UI action untranslatable |
| `frontend/src/components/AccountPanel.tsx` | 289-290 | `aria-label="Open settings"`, `title="Settings"` hardcoded | ✗ BLOCKER | Core chrome untranslatable |
| `frontend/src/components/AccountPanel.tsx` | 326, 329 | "Tier unknown" and Open Flow banner text hardcoded | ✗ BLOCKER | Visible warning text untranslatable |
| `frontend/src/components/AccountPanel.tsx` | 169-171 | `"Ultra"` / `"Pro"` tier labels hardcoded | ⚠ WARNING | Tier labels shown in UI; may be intentional (brand tier names) |
| `frontend/src/components/settings/AiProvidersSection.tsx` | 321-322, 329, 342, 359, 364, 366, 417-418, 452-454, 488, 494, 496, 505 | ~15 hardcoded strings in selection panel and CLI reference | ✗ BLOCKER | Provider setup flow entirely untranslatable |
| `frontend/src/canvas/Board.tsx` | 95, 98-101 | `aria-label="Add connected node"`, "Image", "Video" in drop-popover | ✗ BLOCKER | Canvas interaction UI untranslatable |
| `frontend/src/components/ReferencesPanel.tsx` | 309-310 | "Unpin reference", "Unpin", "Pin to top" hardcoded | ⚠ WARNING | Pin/unpin actions untranslatable |
| `frontend/src/components/AiProviderBadge.tsx` | 101 | `title="Pick an AI provider..."` hardcoded | ⚠ WARNING | Badge tooltip untranslatable |
| `frontend/src/i18n/locales/en.json` | — | "Omni Flash" in 4 value strings | ⚠ WARNING | Conflicts with SC3; was proposed by Phase 1 inventory |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

### Human Verification Required

None identified for automated checks. (Status is `gaps_found` due to code-level failures, not uncertainty requiring human testing.)

### Gaps Summary

Two categories of gaps block phase goal achievement:

**Gap 1 — Incomplete string extraction (SC2, EXTRACT-01, EXTRACT-02)**

The Phase 1 STRING-INVENTORY.md missed several files' complete string coverage. Plan 02-03 extracted the inventoried rows only. The following files contain user-visible hardcoded strings not in `en.json`:

- `AccountPanel.tsx`: ~13 strings (extension scan flow, tier display, settings cog aria-label, version area)
- `AiProvidersSection.tsx`: ~15 strings (provider selection panel, connection test row, CLI reference)
- `Board.tsx`: 3 strings (drop-popover: 1 aria-label + 2 text nodes)
- `ReferencesPanel.tsx`: 3 strings (pin/unpin aria-labels and title)
- `AiProviderBadge.tsx`: 1 string (force-configured tooltip)

Total: ~35 strings requiring extraction.

**Gap 2 — "Omni Flash" brand name in en.json values (SC3, EXTRACT-06)**

The strict SC says product names must not appear as keys or values in `en.json`. "Omni Flash" appears embedded in 4 en.json values. This conflict arises because the Phase 1 inventory proposed extracting sentences that contain the brand name (pragmatic approach) while the ROADMAP SC forbids it (strict approach).

Resolution options:
1. Rewrite the 4 values to omit "Omni Flash" entirely (e.g., `gen.omni_no_ingredients` → "At least one ingredient is required (connect an upstream Character / Image / Visual asset).")
2. Accept the deviation with an override in VERIFICATION.md frontmatter.

**Root cause:** The Phase 1 STRING-INVENTORY.md was the source of truth for Phase 2 extraction. For `AccountPanel.tsx`, only 4 rows were inventoried (tier banner, sign-out, scanning, open-flow link). The actual component has ~17 user-visible strings. Similar under-specification affected `AiProvidersSection.tsx`, `Board.tsx`, and `ReferencesPanel.tsx`.

---

_Verified: 2026-06-10T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
