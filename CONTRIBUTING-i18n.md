# Contributing translations to Flowboard

Flowboard's UI is internationalised. v1 ships with English (`en`) and Turkish
(`tr`). Adding another locale is a JSON drop — no compiler config, no plugin
install, no maintainer round-trips for the translation itself.

This guide walks you through it.

## Quick start

```bash
# 1. From the repo root:
cp frontend/src/i18n/locales/en.json frontend/src/i18n/locales/<your-locale>.json
#    e.g.  frontend/src/i18n/locales/fr.json   for French
#           frontend/src/i18n/locales/de.json   for German
#           frontend/src/i18n/locales/ja.json   for Japanese

# 2. Open frontend/src/i18n/locales/<your-locale>.json and translate
#    every value (keys MUST stay identical to en.json).

# 3. Add the locale code to two places:
#    - frontend/src/i18n/i18n.ts: `supportedLngs: ["en", "tr", "<your-locale>"]`
#    - frontend/src/components/SettingsPanel.tsx: append to the `LOCALES`
#      constant with the language's NATIVE name as the label

# 4. Verify:
cd frontend && npm install && npm run lint
cd .. && node scripts/check-i18n-parity.mjs <your-locale>

# 5. Open a PR.
```

That's it. The maintainer reviews the translation diff, the parity script
keeps you honest about missing or mismatched keys, and the TypeScript
compiler ensures every key in the catalog has a matching `t()` call site.

## The i18n architecture in one paragraph

Flowboard's frontend uses [react-i18next](https://react.i18next.com/) 17 +
[i18next](https://www.i18next.com/) 26 +
[i18next-browser-languagedetector](https://github.com/i18next/i18next-browser-languageDetector)
8. Catalogs are bundled (not HTTP-loaded), so there's no first-paint
flicker. The i18n module initialises synchronously at module scope in
`frontend/src/i18n/i18n.ts` before React renders. TypeScript typed-key
augmentation (`frontend/src/i18n/i18n.d.ts`) means `t("nonexistent.key")`
is a compile-time error. Active locale lives in i18next as the source of
truth, mirrored in the Settings Zustand store for the language picker.
Persistence: `localStorage["flowboard.i18n.locale"]`.

## Adding a new locale — detailed steps

### 1. Create the catalog file

Copy `frontend/src/i18n/locales/en.json` to `frontend/src/i18n/locales/<code>.json`,
where `<code>` is the ISO 639-1 language tag (e.g. `fr`, `de`, `ja`,
`pt-BR`).

### 2. Translate every value

The keys are the contract — never change them. Translate the values.

- **Preserve placeholders verbatim.** Anywhere you see `{{count}}`,
  `{{error}}`, `{{label}}`, `{{title}}`, `{{key}}`, `{{msg}}`, `{{model}}`,
  `{{id}}`, `{{name}}`, `{{variantIdx}}`, `{{total}}`, `{{ref}}`, etc. —
  those tokens must appear unchanged in your translated value. They get
  replaced at render time with real values.
- **Keys ending in `_one` / `_other`** are i18next's native plural form
  suffix. If your language has the same single-plural rule as English and
  Turkish, both values are typically identical. If your language has more
  forms (Russian, Polish, Arabic), the i18next docs cover how to add
  `_few` / `_many` / etc.
- **Brand names stay English.** Flowboard, Veo 3.1, Veo i2v, Nano Banana
  Pro, Nano Banana 2, Omni Flash, Claude Code, Gemini CLI, OpenAI Codex,
  Google Flow, Pro/Ultra plan tier names — these are product identifiers,
  not UI copy. They render verbatim in every locale.
- **Tone matters.** Error messages should stay direct and actionable;
  tooltips should stay informative; button labels should stay imperative.
  Read a few of the surrounding entries before you start to feel the tone.
- **Length matters.** Some UI elements (buttons, tab labels) have tight
  layout budgets. If your translation is significantly longer than the
  English, the maintainer may ask for a shorter alternative.

### 3. Register the locale

In `frontend/src/i18n/i18n.ts`, add your locale code to `supportedLngs`:

```ts
supportedLngs: ["en", "tr", "<your-locale>"]
```

In `frontend/src/components/SettingsPanel.tsx`, add an entry to the
`LOCALES` array with the language's **native name** as the label (e.g.
`{ code: "fr", label: "Français" }`, not `"French"`):

```ts
const LOCALES: { code: Locale; label: string }[] = [
  // i18n: locale names — intentionally not translated (native names by convention)
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "fr", label: "Français" },  // ← your entry
];
```

You'll also need to update the `Locale` union type in
`frontend/src/i18n/i18n.ts` to include the new code.

### 4. Verify

From the repo root:

```bash
cd frontend && npm install
npm run lint                                     # TypeScript typed-key check
cd .. && node scripts/check-i18n-parity.mjs <your-locale>
```

The parity script:
- Exits 0 if your locale has the same key set as `en.json` with all
  placeholders preserved
- Exits 1 if keys differ
- Exits 2 if placeholders differ
- Empty values are warned but not blocked (so you can ship a partial
  translation if needed — empty values fall back to English)

### 5. Open a PR

Title: `feat(i18n): add <Language Name> (<code>) translation`. Include in
the PR body:
- A note about your level of fluency / context (native speaker, ten years
  abroad, etc.)
- Anything you struggled to translate that you'd like the maintainer to
  double-check
- Whether you tested the UI in a browser with your locale active (set
  `localStorage["flowboard.i18n.locale"] = "<your-locale>"` in DevTools,
  hard reload)

## What MUST NOT be translated

- **Brand and product names**: Flowboard, Veo 3.1, Veo i2v, Nano Banana
  Pro / Nano Banana 2, Omni Flash (and `Omni Flash · 4s/6s/8s/10s`
  duration variants), Claude Code, Gemini CLI, OpenAI Codex, Google Flow,
  Pro / Ultra plan tier names.
- **User-authored data**: node titles, prompts, ref labels, board names,
  chat messages. These are content the user wrote; translating them would
  be wrong by definition.
- **Glyph icons**: `★`, `✓`, `✗`, `⋯`, `⟳`, `⊘`, `⏱`, etc. They're
  language-neutral.
- **SI units and technical abbreviations**: `ms`, `s`, `m`, `kB`, `MB`,
  `PNG`, `JPG`, `WEBP`, etc.
- **`frontend/src/constants/` enum `key` fields**: those are API
  parameter values sent to the backend, not display labels. The display
  labels (where they're rendered to the user) are already translated via
  `t()` at the consumption site.

## Common pitfalls

### Placeholder preservation

Wrong:

```json
"node.open_variant": "Ouvrir la variante"    // dropped {{title}}!
```

Right:

```json
"node.open_variant": "Ouvrir la variante {{title}}"
```

The parity script catches this. If the script complains, check that
every `{{xxx}}` in `en.json` appears in your value.

### Length and layout

Some languages run 20-40% longer than English. If your translation
genuinely needs more space than fits in a button or a tight label, talk
to the maintainer — they may prefer to widen the UI rather than truncate
your translation.

### Locale-aware case conversion (Turkish dotted-i lesson)

If you're contributing a locale that has unusual case-folding rules
(Turkish's dotted vs dotless `i`, Lithuanian, Azerbaijani), be aware that
JavaScript's bare `.toLowerCase()` / `.toUpperCase()` is locale-sensitive.
Flowboard's source code uses `toLocaleLowerCase("en-US")` in
`frontend/src/api/client.ts:19` specifically to avoid this trap when
matching backend error tokens. If you spot another bare `.toLowerCase()`
call on a string compared against an ASCII pattern, please flag it.

### Plural forms

Languages with more than two plural forms (e.g. Russian, Polish, Arabic)
need extra keys. The i18next docs cover the exact suffix conventions:
<https://www.i18next.com/translation-function/plurals>. The convention
is keys like `time.minutes_ago_zero`, `_one`, `_few`, `_many`, `_other`
depending on the language's CLDR plural rules.

## Reviewing translation PRs (for the maintainer)

For each translation PR, the maintainer should:

- [ ] Run `npm run lint` — typed-key gate passes
- [ ] Run `node scripts/check-i18n-parity.mjs <code>` — parity + placeholders OK
- [ ] Spot-check 10-20 entries across different area prefixes for native quality
- [ ] Hard-reload the app with `localStorage["flowboard.i18n.locale"] = "<code>"` set and drive a representative flow (board create → ref upload → generation → settings → activity feed)
- [ ] Check layout: any clipped buttons? any wrapped dialog headers? any text overflowing chips or pills?
- [ ] Add the locale code to `LOCALES` in `SettingsPanel.tsx` if the PR didn't (and to `Locale` type / `supportedLngs`)
- [ ] Bump the changelog: `feat(i18n): add <Language> translation`

## Adding context for translators (string area prefixes)

The catalog is flat (single namespace) but keys use area prefixes for
discoverability:

| Prefix | Area |
|--------|------|
| `time.*` | Relative-time formatting (just now, N minutes ago, …) |
| `app.*` | App-level top-bar copy |
| `node.*`, `palette.*` | Canvas node card UI and the add-node palette |
| `dialog.*` | The Generation Dialog |
| `result.*` | The Result Viewer overlay |
| `panel.*`, `refs.*` | The References panel |
| `sidebar.*` | The Project sidebar |
| `toolbar.*` | The top toolbar |
| `settings.*` | Settings panel chrome and rows |
| `provider.*` | AI provider selection (Claude Code / Gemini CLI / Codex) |
| `account.*` | The account/connection panel |
| `activity.*` | The activity feed (bell, dropdown, row, detail modal) |
| `status.*` | The bottom status bar |
| `sponsor.*` | The sponsor dialog |
| `toaster.*` | Toast notifications |
| `gen.*` | Generation store error messages |
| `pipeline.*` | Pipeline runner errors |
| `error.*` | The error humanizer (`humanizeBackendError`) |
| `character.*` | The character-builder picker (gender / country / vibe) |

Use the prefix to find similar strings nearby; it helps with tone
consistency.

---

Thanks for translating Flowboard. If anything in this guide is unclear,
open an issue and we'll improve it.
