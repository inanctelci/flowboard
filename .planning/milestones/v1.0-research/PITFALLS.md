# Pitfalls Research

**Domain:** React i18n retrofit — hardcoded-string extraction into react-i18next on a mature Vite + TS-strict + Zustand SPA
**Researched:** 2026-06-10
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Translating `@xyflow/react` node `data.title` — the single easiest mistake in this codebase

**What goes wrong:**
`FlowboardNodeData.title` is user-authored content — it is the name the user gave their node ("My hero character", "Product shot v2"). Wrapping `{data.title}` in `t()` translates it, turning user content into a lookup key, which either shows a raw key string or silently maps to a fixed UI phrase. Every existing board becomes corrupted in Turkish locale.

The trap is visually subtle: `NodeCard.tsx` renders `data.title` alongside UI chrome strings like `"Upload"`, `"Generate"`, `"Save to library"`. They live in the same JSX, so a blanket grep-replace `"..."` → `t("...")` will catch both.

**Why it happens:**
Automated extraction tools (i18next-parser, babel-plugin-i18next-extract) parse JSX and flag every string literal — they cannot distinguish user-authored data from static copy. A developer running the tool and applying all suggestions without reviewing each hit will wrap `data.title`, `data.prompt`, `data.aiBrief`, `ref.label`, and board names.

**How to avoid:**
Before extraction, identify and mark every variable that holds user-authored content:
- `data.title` — node name
- `data.prompt` — generation prompt text
- `data.aiBrief` — AI-generated description of user's media
- `ref.label` — reference library name
- `board.name` — board title
- Any string that came over the wire from `/api/*` and represents user-created content

These never go through `t()`. They render as-is: `{data.title}`, not `{t(data.title)}`. Document this boundary as a comment in `NodeCard.tsx` and `ReferencesPanel.tsx` before extraction begins.

**Warning signs:**
If after applying translations, switching to Turkish causes any node label on an existing board to display a raw key like `"node.title"` or to render a fixed Turkish phrase, user data is being translated.

**Phase to address:** Extraction — establish the user-data boundary checklist before any string is wrapped.

---

### Pitfall 2: Missing strings in non-JSX locations — the "invisible" 40%

**What goes wrong:**
JSX visible text is the easy 60%. The remaining 40% is invisible at render time and gets missed entirely:

| Location | Concrete example in Flowboard | Why missed |
|----------|-------------------------------|------------|
| `aria-label` | `aria-label="Replace character image"` (`NodeCard.tsx:170`), `aria-label="Dismiss error"` (`Toaster.tsx:58`), `aria-label="Save to library"` (`NodeCard.tsx:192`) | Not visible text; linters that scan text content skip it |
| `title` attribute | `title="Save this character to the library"` (`NodeCard.tsx:189`), `title={tip}` passed to `InfoTip` (`GenerationDialog.tsx:200`) | Tooltip, not rendered in DOM text |
| `placeholder` | Any `<input placeholder="...">` in the settings panels or dialog textarea | Attribute, not child text |
| Store error strings | `set({ error: "Open Flow once so the extension can detect your plan..." })` (`generation.ts:170`), `setError("no project")` (`NodeCard.tsx:112`), `setError(... "upload failed")` (`NodeCard.tsx:119`) | In TS files, no JSX, grep for `"` misses the context |
| `humanizeBackendError()` | The 4 long English-sentence branches in `api/client.ts:18-56` | Utility function, not a component |
| `document.title` | `index.html` has `<title>Flowboard</title>` — never updated dynamically, but if it ever is the string will be in TS not JSX |
| `activity-meta.ts` labels | `label: "Auto-Prompt"`, `label: "Generate image"` etc. in `ACTIVITY_TYPE_META` and `STATUS_META` | Pure data module, no JSX |
| `CAMERA_MOVEMENTS[*].label` | `"Static"`, `"Dynamic"` in `GenerationDialog.tsx:92-104` | Inline array constant, not text node |
| `VIDEO_MODEL_CHIPS[*].label` | `"Veo 3.1 Lite"`, `"Omni Flash"` in `GenerationDialog.tsx:127-131` | Same |
| `IMAGE_MODELS[*].label/hint` | `"Nano Banana Pro"`, hint strings in `SettingsPanel.tsx:28-38` | Data array in component file |
| `formatRelativeTime()` | Vietnamese-hardcoded strings `"vừa xong"`, `"phút trước"`, `"giờ trước"` in `ResultViewer.tsx:60-73` | Already localised to one language, now needs i18n |
| `relativeTime()` in `activity-meta.ts:49-63` | Produces `"just now"`, `"${sec}s ago"` etc. | Utility function |

**Why it happens:**
Extraction passes scan for JSX text nodes and string literals inside JSX attribute positions. Pure TS modules, store actions, and utility functions require a manual audit.

**How to avoid:**
Run this targeted grep before claiming extraction is complete:
```bash
# aria-label, title, placeholder attributes
grep -rn 'aria-label=\|title=\|placeholder=' frontend/src/ --include="*.tsx" --include="*.ts"

# String assignments in store actions (the error slots)
grep -rn 'set({.*error:' frontend/src/store/ --include="*.ts"
grep -rn 'setError(' frontend/src/ --include="*.tsx" --include="*.ts"

# Strings in .ts utility/data files (non-JSX)
grep -rn '"[A-Z][a-z]' frontend/src/ --include="*.ts" | grep -v '\.tsx'
```

Also manually audit: `frontend/src/api/client.ts` (all of `humanizeBackendError`), `frontend/src/components/activity/activity-meta.ts` (all label/status strings), `frontend/src/components/ResultViewer.tsx` (`formatRelativeTime` and `formatAspectRatio`), `frontend/src/components/activity/activity-meta.ts` (`relativeTime`, `formatDuration`).

**Warning signs:**
After Turkish translation is applied, switch the app to Turkish and trigger an upload failure — if the error toast shows English, the store error strings were missed.

**Phase to address:** Extraction — build a complete string inventory from grep before touching any file.

---

### Pitfall 3: Dynamic key construction breaks static analysis and missing-key detection

**What goes wrong:**
The `humanizeBackendError` function in `api/client.ts` does substring matching on error tokens:
```ts
// Current (partially dynamic):
if (t.startsWith("public_error_")) {
  return token.replace(/^PUBLIC_ERROR_/i, "Flow rejected: ").replace(/_/g, " ");
}
```

A developer might refactor this into:
```ts
// Tempting but wrong:
return t(`error.${errorCode}`);
```

This pattern:
1. Cannot be statically analysed — i18next-parser does not know which keys exist at runtime.
2. Makes the Turkish JSON file's coverage impossible to verify — `tsc` and the parser both report 0 missing keys even if 30 are absent.
3. Breaks tree-shaking optimizations that some i18next plugins do at build time.

The same trap appears anywhere a key contains a variable segment: `t(\`status.${status}\`)`, `t(\`nodeType.${type}\`)`, `t(\`model.${quality}\`)`.

**Why it happens:**
Dynamic keys feel DRY. The app has many enum-like values (`NodeStatus`, `VideoQuality`, `NodeType`) that map to labels — building keys programmatically avoids writing one translation per value.

**How to avoid:**
Use explicit object maps with individual `t()` calls instead:
```ts
// In the translation catalog:
// { "status.queued": "Sırada", "status.running": "İşleniyor", ... }

// In code — explicit, statically analysable:
const STATUS_LABELS: Record<NodeStatus, string> = {
  queued:  t("status.queued"),
  running: t("status.running"),
  done:    t("status.done"),
  error:   t("status.error"),
};
```
For `humanizeBackendError` specifically: keep the function as a TS switch/if-chain that calls `t("error.paygate_tier_unknown")` etc. per known token, with a fallback that returns `null` for unknown tokens (already the pattern — just swap the English strings for `t()` calls).

Dynamic keys are acceptable ONLY when the key set is externally defined and cannot be enumerated at build time (e.g. backend-generated event types where coverage completeness is not required). Not the case here.

**Warning signs:**
A translation JSON file that has zero missing keys reported by the extraction tool but the app still shows untranslated strings at runtime.

**Phase to address:** Extraction — establish the no-dynamic-keys rule before writing any `t()` call.

---

### Pitfall 4: Layout breakage under longer strings — buttons, chips, and dialog headers

**What goes wrong:**
Several UI elements in Flowboard have implicit width assumptions baked into CSS:

- `NodeCard.tsx` buttons: `"Upload"`, `"Generate"`, `"★ Save"` — these sit inside a compact card body. Turkish equivalents: `"Yükle"` (shorter), `"Oluştur"` (same length), `"★ Kaydet"` (similar) — Turkish is friendly here but other community locales won't be. More critically, `"Generating…"` → Turkish `"Oluşturuluyor…"` is 40% longer and sits inline.
- `GenerationDialog.tsx` video model chips: `"Veo 3.1 Lite (Low Priority)"` is already long. If a community locale translates this to a longer phrase, the chip row wraps unexpectedly.
- `SettingsPanel.tsx` hint text: hint strings in `IMAGE_MODELS` and `VIDEO_QUALITIES` are 60-90 character English sentences. Turkish sentences of equivalent meaning are often 20-30% longer.
- `Toaster.tsx` error messages: `humanizeBackendError` produces multi-sentence English paragraphs. The toaster has no scroll or max-height — very long Turkish sentences overflow the card height.
- `activity-meta.ts` `STATUS_META.label` strings: used as badge text in `ActivityRow`. English `"running"` → Turkish `"çalışıyor"` is 12% longer — probably fine. But `"canceled"` → `"iptal edildi"` is 33% longer and can break a narrow badge.

**Why it happens:**
CSS was written against English string lengths. No i18n load was ever placed on the layouts during development.

**How to avoid:**
1. Use CSS `min-width` / `max-width` with `overflow: hidden; text-overflow: ellipsis` on badge/chip elements — not fixed `width`.
2. Use `flex-wrap: wrap` on button rows so they stack rather than overflow on long strings.
3. For the Toaster: add `max-height: 10rem; overflow-y: auto` so a very long translated error message is scrollable rather than overflowing the card.
4. During the Turkish translation pass, manually check every translated string against the rendered UI at 1280×800 viewport — do not rely on English-only visual review.
5. Use CSS logical properties (`margin-inline-start` instead of `margin-left`) — costs nothing now and future-proofs for RTL (see Pitfall 12).

**Warning signs:**
After switching to Turkish, take a screenshot. Any button text that is clipped, any dialog that is taller than the viewport, any chip row that wraps unexpectedly is a layout bug.

**Phase to address:** Polish — address layout after translations are applied so real string lengths drive the fix.

---

### Pitfall 5: Translating inside Zustand store actions — the "headless translation" trap

**What goes wrong:**
Flowboard stores construct user-visible strings outside React components. Specific sites:

- `store/generation.ts:170`: `set({ error: "Open Flow once so the extension can detect your plan..." })` — English sentence hardcoded in a Zustand action.
- `store/generation.ts:218` (approximately): similar pattern for the "no ingredients" Omni Flash error.
- `api/client.ts:18-56`: `humanizeBackendError()` — pure TS function, not a component.
- `api/client.ts` (the bare `api()` function): `throw new Error(\`${res.status} ${res.statusText}\`)` — not translated but worth noting.

The `useTranslation()` hook is React-only and cannot be called from a Zustand action or a plain utility function. Calling it outside a component will throw a React hooks violation.

**Why it happens:**
During extraction, a developer sees the English strings, grabs `useTranslation`, and tries to call `t()` in the store action — then hits a runtime error. The temptation then is to convert the action to a React callback, which incorrectly couples the store to the component layer.

**How to avoid:**
Use `i18n.t()` (the i18next instance directly) instead of the hook for code outside React:
```ts
// In store actions and utility functions — import the i18n instance:
import i18n from "../i18n"; // the configured i18next instance export

// In the Zustand action:
set({ error: i18n.t("errors.openFlowForTier") });

// In humanizeBackendError:
if (t === "paygate_tier_unknown") {
  return i18n.t("errors.paygateUnknown");
}
```

The i18n instance must be a named export from the i18n setup file (e.g. `frontend/src/i18n.ts`), separate from the React provider. This is the standard react-i18next pattern — `i18next` is the singleton, `react-i18next` wraps it with React integration.

**Warning signs:**
Any `import { useTranslation }` in a `.ts` file (not `.tsx`) is the bug. The TS compiler with strict mode will not catch this — it will compile, then throw at runtime when the action fires.

**Phase to address:** Setup — establish the `i18n.t()` vs `useTranslation()` split rule as part of wiring the i18n infrastructure, before extraction begins.

---

### Pitfall 6: Initial render flicker — locale JSON loads async, first paint is English

**What goes wrong:**
react-i18next loads locale JSON asynchronously (XHR or dynamic import). On first paint, before the Turkish JSON resolves, the app renders with fallback language (English). The user sees English, then immediately sees Turkish — a visible flash on every page load. On slow machines or slow storage this is 100-300 ms of wrong language.

**Why it happens:**
The default i18next `initImmediate: true` behaviour does not block rendering. The `<I18nextProvider>` mounts immediately and the first render uses the fallback language.

**How to avoid:**
For a local-only Vite app, inline the locale files as static imports rather than using the XHR backend. With Vite, this means:
```ts
// i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: detectLocale(), // synchronous read from localStorage
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
```

With bundled resources, `i18n.init()` resolves synchronously and there is no flicker. This is appropriate for a local app where bundle size is not constrained (stated in PROJECT.md: "Build size matters less than maintainability").

Do NOT use `i18next-http-backend` (fetches JSON at runtime) — it introduces the flicker and adds no value for a single-user local SPA.

**Warning signs:**
In the browser DevTools Network tab, if you see `GET /locales/tr/translation.json` (an HTTP request for locale JSON), you are using the HTTP backend and will have flicker. With bundled resources, no such request appears.

**Phase to address:** Setup — choose the bundled-resource approach when wiring i18n infrastructure.

---

### Pitfall 7: Hot module reload of locale JSON silently stale in Vite

**What goes wrong:**
When using `import tr from "./locales/tr.json"` (the correct bundled approach from Pitfall 6), Vite's HMR does watch JSON files and will hot-reload them. However, if the i18n instance is initialized at module level (outside a React component) and the JSON import is referenced by the initialized resources object, adding a new key to the JSON during development will NOT cause the running app to see the new key until a full page reload. The HMR update replaces the module but the already-initialized `i18n` instance still holds the old resources object in memory.

**Why it happens:**
HMR replaces the module's exported value but cannot retroactively update the i18next resource bundle that was loaded at `i18n.init()` time.

**How to avoid:**
Add an explicit HMR accept handler in the i18n setup file:
```ts
// At the bottom of frontend/src/i18n.ts:
if (import.meta.hot) {
  import.meta.hot.accept(["./locales/en.json", "./locales/tr.json"], ([newEn, newTr]) => {
    if (newEn) i18n.addResourceBundle("en", "translation", newEn.default, true, true);
    if (newTr) i18n.addResourceBundle("tr", "translation", newTr.default, true, true);
  });
}
```

This means: when Vite detects a change to either locale JSON, call `addResourceBundle` with the new content, replacing the old. The `true, true` flags mean "deep merge" and "overwrite existing keys".

Without this, the workflow during translation is: edit JSON → no visible change → manually reload page → repeat. Adds minutes of friction per translation session.

**Warning signs:**
Edit a value in `tr.json`, save, and observe the running app. If the change is not reflected immediately (without a page reload), HMR is not wired up.

**Phase to address:** Setup — add the HMR handler when creating the i18n setup file.

---

### Pitfall 8: Turkish dotted/dotless-i bug — `.toLowerCase()` and `.toUpperCase()` on user input

**What goes wrong:**
Turkish has four i-variants: `i` (dotless lowercase), `İ` (dotted uppercase), `ı` (dotless uppercase), `I` (dotted lowercase — no, wait: `I` is dotted uppercase in English but **dotless uppercase** in Turkish). The critical case: `"I".toLowerCase()` returns `"i"` in en-US locale but `"ı"` (dotless i) in tr-TR locale. Similarly, `"i".toUpperCase()` returns `"I"` in en-US but `"İ"` in tr-TR.

In Flowboard, any string comparison that folds case before comparing will produce wrong results when the app is running in Turkish locale:
- `humanizeBackendError` in `api/client.ts:19`: `const t = token.toLowerCase()` — if the backend ever sends a token containing `"I"`, this comparison silently fails in Turkish locale.
- `activity-meta.ts:49-63`: `relativeTime` does not call `toLowerCase()` but any future search/filter feature on activity or reference labels will.

**Why it happens:**
JavaScript's `String.prototype.toLowerCase()` is locale-sensitive when called without a locale argument — it uses the system/browser locale. In a Turkish browser, the default locale is `tr-TR`. Code written assuming en-US semantics will produce wrong results.

**How to avoid:**
Never call bare `.toLowerCase()` or `.toUpperCase()` for comparison or matching logic. Instead:
```ts
// Wrong — locale-sensitive:
const t = token.toLowerCase();

// Correct — explicitly locale-independent:
const t = token.toLocaleLowerCase("en-US");  // for backend token matching
// or use locale-aware comparison for user-visible search:
const match = haystack.localeCompare(needle, "tr-TR", { sensitivity: "base" }) === 0;
```

For `humanizeBackendError`, the tokens are backend-controlled ASCII strings — use `toLocaleLowerCase("en-US")` to lock the comparison to ASCII semantics regardless of browser locale.

For any future search/filter over user labels (ref names, node titles), use `localeCompare` with the active locale.

**Warning signs:**
Set the browser language to Turkish (`tr-TR`). Type an uppercase `I` into any search or filter field, or trigger a `PUBLIC_ERROR_UNSAFE_GENERATION` error (which contains uppercase letters). If the error is not matched by `humanizeBackendError`, the dotted-i bug is active.

**Phase to address:** Extraction — audit all `.toLowerCase()` / `.toUpperCase()` calls as part of the string inventory. Fix before Turkish locale is activated.

---

### Pitfall 9: Persisted locale in Zustand — race condition on rehydration

**What goes wrong:**
The existing `settings.ts` store manually reads from `localStorage` at module load time (the `loadPersisted()` / `persist()` pattern). If the locale preference is added to this same store (or to its own store with the same pattern), the race condition is:

1. `i18n.ts` initialises with browser-detected locale (e.g. `"en"` from `navigator.language`).
2. React mounts, `App.tsx` renders — i18n is already active.
3. `useSettingsStore` rehydrates — locale is `"tr"` from localStorage.
4. Something calls `i18n.changeLanguage("tr")` in response to the store hydration.
5. The whole app re-renders with Turkish strings — visible flash, and any string that was rendered in step 2 before the language change is now stale.

**Why it happens:**
The settings store's `loadPersisted()` is synchronous but the i18n initialization is separate. When the stored locale drives the i18n provider's language, the two must initialize from the same source in the same tick.

**How to avoid:**
Read the persisted locale ONCE, BEFORE `i18n.init()`, and pass it directly to `initI18n`:
```ts
// In i18n.ts (loaded before React renders):
function detectLocale(): string {
  try {
    const raw = localStorage.getItem("flowboard.settings.v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.locale === "tr") return "tr";
    }
  } catch { /* ignore */ }
  // Browser language detection fallback:
  const nav = navigator.language ?? navigator.languages?.[0] ?? "en";
  return nav.startsWith("tr") ? "tr" : "en";
}

i18n.init({ lng: detectLocale(), ... });
```

The Zustand settings store's `setLocale` action then calls `i18n.changeLanguage(newLocale)` after the initial mount — this is a user-initiated change, not rehydration, so the flash is expected and acceptable.

Do NOT make the Zustand store drive the i18n provider's `lng` prop via a React effect — that is the race condition pattern.

**Warning signs:**
On a hard page reload with locale set to Turkish in localStorage, the app briefly shows English before switching to Turkish. If you see this, the initialization order is wrong.

**Phase to address:** Setup — establish the `detectLocale()` → `i18n.init()` initialization chain before writing any language-switching UI.

---

### Pitfall 10: `<html lang>` staleness and screen reader breakage

**What goes wrong:**
`frontend/index.html` has `<html lang="en">` hardcoded. When the app switches to Turkish, the `lang` attribute stays as `"en"`. Screen readers use the `lang` attribute to determine which TTS voice engine and phoneme rules to use — a Turkish-speaking user with a screen reader hears their own language spoken with English phoneme rules, which is often unintelligible for Turkish text.

SEO is irrelevant for a local app, but `lang` is a WCAG 2.1 Level A criterion (1.3.3 — "Language of Page"). Since Flowboard already has `role="alert"` and `aria-label` attributes, the team cares about accessibility — this gap is inconsistent with that intent.

**Why it happens:**
`index.html` is a static file. The developer adds translations, everything looks right, but the `lang` attribute is not part of the JSX render tree and is not updated by react-i18next automatically.

**How to avoid:**
Add a `useEffect` that updates `document.documentElement.lang` whenever the locale changes:
```ts
// In App.tsx or a dedicated useLocaleEffect hook:
import { useTranslation } from "react-i18next";

export function App() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  // ...
}
```

This is 3 lines of code and fully prevents the issue. Also update `document.title` here if it ever becomes locale-specific (currently static `"Flowboard"` in `index.html` — acceptable to leave as-is for v1 since the app is single-tab).

**Warning signs:**
Switch to Turkish in the app, then inspect `<html lang="...">` in DevTools. If it still says `"en"`, the effect is missing.

**Phase to address:** Polish — add after translations are wired but before verification.

---

### Pitfall 11: `formatRelativeTime` hardcoded in Vietnamese — must be replaced, not translated

**What goes wrong:**
`ResultViewer.tsx:60-73` contains `formatRelativeTime()` which produces strings hardcoded in Vietnamese: `"vừa xong"`, `"phút trước"`, `"giờ trước"`, `"ngày trước"`, and calls `new Date(t).toLocaleDateString("vi-VN")`. This function must be completely replaced as part of i18n, not just translated as a string.

The `activity-meta.ts:49-63` `relativeTime()` function produces English: `"just now"`, `"${sec}s ago"`, `"${min}m ago"`, `"${hr}h ago"`, `"${day}d ago"`. Same problem, different language.

Both functions have the same architecture: they build the string by concatenating a number with a translated suffix — which breaks for languages where word order or agreement rules change the suffix position.

**Why it happens:**
These were written for a specific locale before i18n was considered. The string construction pattern assumes the suffix always follows the number.

**How to avoid:**
Use i18next's interpolation for all relative time strings. Define them in the locale JSON as complete phrases with `{{count}}` placeholders:
```json
{
  "time.justNow": "just now",
  "time.secondsAgo": "{{count}}s ago",
  "time.minutesAgo": "{{count}}m ago",
  "time.hoursAgo": "{{count}}h ago",
  "time.daysAgo": "{{count}}d ago"
}
```
Turkish equivalents keep the same `{{count}}` pattern (Turkish sentence structure for these phrases is also number-first), so interpolation order works. But defining them as full i18n keys ensures future locales with different order can override the entire phrase.

Replace `toLocaleDateString("vi-VN")` with `new Date(t).toLocaleDateString(i18n.language)` — pass the active locale dynamically.

**Warning signs:**
In Turkish locale, `ResultViewer` still shows Vietnamese relative time text. This is a regression, not a missing translation — the Vietnamese strings are hardcoded and will always render regardless of the active locale until the function is rewritten.

**Phase to address:** Extraction — `formatRelativeTime` must be rewritten (not just wrapped) during string extraction; it cannot be deferred to polish.

---

### Pitfall 12: Plurals and `{{count}}` interpolation — Turkish is simple but set it up correctly anyway

**What goes wrong:**
Turkish uses a single plural form (no special plural for 1 vs many — same as base form). This makes Turkish plurals trivial compared to languages like Russian (3 forms) or Arabic (6 forms). However, if the i18n setup defines `pluralResolver` incorrectly or omits the `_other` / `_one` suffix convention, the count interpolation will output the wrong key.

More concretely: i18next's default plural suffix for `tr` is `_other` for all counts (since Turkish has one form). If a key is defined as `"filesUploaded": "{{count}} dosya yüklendi"` without a `_one` variant, i18next will look for `filesUploaded_other` and fall back to the base key. This only fails silently if your JSON structure is misaligned.

The harder problem: variable order in sentences can differ by language. `"${count} variants generated"` — in Turkish this is `"{{count}} varyant oluşturuldu"` (same order). But a community locale in Arabic would need `"{{count}} متغيرات"` vs `"متغير {{count}}"` depending on count parity. Designing keys as `t("variantsGenerated", { count })` with full-sentence values in each locale JSON handles this correctly. Building keys as `count + t("variants") + t("generated")` does not.

**Why it happens:**
Developers split translation strings at word boundaries to reduce key count — `t("variants")` + `t("generated")` seems DRY. It breaks for any language with agreement rules.

**How to avoid:**
Always define count-bearing translations as complete sentences with `{{count}}`:
```json
// en.json:
{ "generation.variantsGenerated": "{{count}} variant generated", "generation.variantsGenerated_other": "{{count}} variants generated" }
// tr.json:
{ "generation.variantsGenerated": "{{count}} varyant oluşturuldu", "generation.variantsGenerated_other": "{{count}} varyant oluşturuldu" }
```
Because Turkish has one plural form, `en.json` and `tr.json` both supply `_other` (and optionally `_one` for 1-count English) — the keys just resolve to the same value in Turkish.

For v1 (English + Turkish only), pluralization complexity is minimal. The risk is in the key design: if keys are designed without sentence-level keys, adding a language like Russian later requires restructuring the key set.

**Phase to address:** Extraction — decide on the key naming convention (sentence-level with `{{count}}`) before writing any Turkish strings.

---

### Pitfall 13: JSX inside translation strings — the community-contributor trap

**What goes wrong:**
When a translation key's value contains React markup — e.g. a link, a `<strong>` tag, or a `<code>` block — the naive approach is:
```ts
// Tempting but wrong — translator sees raw HTML:
t("errors.openFlow") // returns "Open <a href='...'>Flow</a> once"
```
Non-developer community translators (the open-source audience this project courts) see `<a href='...'>`, misplace or delete the tag, and break the rendered UI or inject XSS.

Flowboard does not currently have any JSX-embedded translation strings — but `humanizeBackendError` produces multi-sentence text that contains a URL inline: `"Open https://labs.google/fx/tools/flow in a tab"`. If this URL is made into a clickable link during i18n (a natural UX improvement), the temptation to embed JSX in the key value is high.

**Why it happens:**
react-i18next provides `Trans` component for this use case, but its API is unfamiliar. The simpler wrong path is to embed HTML.

**How to avoid:**
Keep all translation strings HTML-free. When rich markup is needed:
1. Split the string into parts around the markup and use the `Trans` component:
```tsx
<Trans i18nKey="errors.openFlow">
  Open <a href={FLOW_URL} target="_blank">Flow</a> once and reload.
</Trans>
```
2. Define the key value with placeholders that match the component children index:
```json
{ "errors.openFlow": "Open <1>Flow</1> once and reload." }
```
The number-tagged slots (`<1>`) are safe for translators — they know not to change numbers, only surrounding text.

For this codebase, the safest rule for v1: zero HTML in translation strings. The URL in `humanizeBackendError` should remain as a plain-text string in the locale JSON (`"url.flow": "https://labs.google/fx/tools/flow"`) interpolated into a sentence, not as a hyperlink inside the translation value.

**Warning signs:**
Any translation value in the JSON files that contains `<` or `>` is a signal that the `Trans` component should be used instead — and that the translator experience is degraded.

**Phase to address:** Extraction — establish the no-HTML-in-values rule when designing the key schema.

---

### Pitfall 14: Baking in LTR assumptions — prophylactic CSS cost is near-zero

**What goes wrong:**
RTL support is explicitly out of scope for v1. However, CSS written during this milestone will be inherited by future contributors who add Arabic, Hebrew, or Farsi. The specific patterns that create debt:

- `margin-left` / `margin-right` — directional, do not flip in RTL without CSS overrides
- `padding-left` / `padding-right` — same
- `left: 0` / `right: 0` positioning — same
- `text-align: left` — same
- `border-left` / `border-right` on status strips — same

Flowboard's `status-strip` and node card layout use directional CSS extensively. The `NodeCard.tsx` `StatusStrip` component anchors the strip on the left side of the card.

**Why it happens:**
English is LTR. Developers write `margin-left` naturally. CSS logical properties are available since 2020 across all major browsers but adoption is low because there is no lint rule enforcing them.

**How to avoid:**
During the i18n milestone, when touching any CSS file, replace directional properties with logical equivalents:
| Directional | Logical equivalent |
|-------------|-------------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left` (in positioned elements) | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

Do NOT do a wholesale CSS replacement — that is a refactor, not an i18n task. Only replace properties in CSS rules that are being touched anyway during the i18n milestone. New CSS written in this milestone should use logical properties exclusively.

**Warning signs:**
A contributor attempting to add Arabic support files a PR that contains a large `[dir="rtl"] { ... }` override block — this is the symptom of accumulated directional CSS debt.

**Phase to address:** Polish — opportunistically replace directional properties when editing CSS during the translation pass.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Wrapping all visible strings with `t()` in one pass without auditing non-JSX locations | Fast extraction | Toaster errors, aria-labels, activity labels stay English forever — discovered at QA not during extraction | Never — the non-JSX audit takes 30 min and prevents a full re-extraction pass |
| Using `i18next-http-backend` to load locale JSON at runtime | Lazy loading, smaller initial bundle | Render flicker on every load; no benefit for a local single-user app where bundle size is not constrained | Never for this project (see PROJECT.md: "Build size matters less than maintainability") |
| Dynamic key construction (`t(\`error.${code}\`)`) | DRY, fewer lines | Static analysis blind spot; Turkish JSON can have zero missing keys but 30 untranslated paths | Acceptable only for truly open-ended key spaces (not the case here) |
| Defining locale in Zustand store driven by a React effect that calls `i18n.changeLanguage` | Looks clean | Race condition on rehydration — first render is always English; visible flash | Never for initial locale; acceptable for user-initiated language switches |
| Leaving `activity-meta.ts` strings untranslated for v1 | Less work now | Activity feed stays English in Turkish locale — inconsistent experience | Acceptable only if activity feed is considered a "power user" surface and documented as known gap |
| Skipping `<html lang>` update | Saves 3 lines | WCAG 2.1 Level A failure; screen reader mispronounces Turkish | Never — 3-line fix |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| react-i18next + Vite | Using `i18next-http-backend` (loads locale JSON via fetch) — adds flicker and requires a Vite plugin or public folder configuration | Bundle locales as static imports; use `import.meta.hot.accept` for HMR during development |
| react-i18next + TypeScript strict | Not generating typed keys — `t("nonexistent.key")` compiles fine and silently shows the key string at runtime | Use `i18next-resources-to-backend` or generate a `d.ts` from locale JSON using `i18next-typescript` or equivalent; OR enforce with TS path aliases |
| react-i18next + Zustand (no `zustand/middleware` persist) | Storing locale in a Zustand store that is initialized after `i18n.init()` — causes rehydration flash | Read locale from localStorage synchronously in `i18n.ts` before React mounts; only use Zustand for user-initiated language changes |
| `humanizeBackendError` + i18n | Calling `useTranslation()` in a plain TS utility function — throws hooks violation | Import and call `i18n.t()` directly from the i18next singleton instance |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-renders from `useTranslation()` on every `i18n.changeLanguage` | All components re-render simultaneously on language switch | This is expected and acceptable — language switch is infrequent. Use `useMemo` for expensive computations that depend on translated strings if needed. | Not a real problem for this app size |
| `NodeCard` re-renders because translation context changes | Canvas lag when language is switched | `React.memo` on `NodeCard` (already identified as a missing optimization in CONCERNS.md) — separate concern, not introduced by i18n | Only with 50+ nodes on canvas AND without memoization |
| Bundling both locale JSONs in main chunk | Slightly larger initial JS | Acceptable for this app (see PROJECT.md constraint on bundle size) | Not a problem for local app |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Language switcher in Settings panel requires scroll to find | Turkish-speaking users who haven't yet found Settings stay in English | Place the language picker as the first item in SettingsPanel, above model preferences |
| No persisted locale → reverts to English on reload | User re-sets language on every session | Persist locale in `localStorage` under the existing `flowboard.settings.v1` key (or a sibling key) — read it synchronously in `i18n.ts` at init time |
| Browser auto-detect resolves `tr-TR` but i18n config only handles `"tr"` | Language detection fails silently, app loads in English | In `detectLocale()`, normalize `"tr-TR"` → `"tr"` before matching against configured locales |
| Error messages from server (`humanizeBackendError`) shown in English even in Turkish locale | Confusing: UI is Turkish but errors are English | All `humanizeBackendError` branches must use `i18n.t()` — see Pitfall 5 |
| `formatRelativeTime` in ResultViewer shows Vietnamese strings | Existing users see Vietnamese text regardless of locale | Rewrite using i18n keys — see Pitfall 11 |

---

## "Looks Done But Isn't" Checklist

- [ ] **aria-labels translated:** Open DevTools → Accessibility tab on NodeCard. All `aria-label` values display Turkish when locale is `tr`. Check `NodeCard.tsx` (Replace character image, Save to library), `Toaster.tsx` (Dismiss error), `GenerationDialog.tsx` (InfoTip aria-label).
- [ ] **Store error strings translated:** Trigger a dispatch with no project (delete project from DB manually), then trigger the paygate-unknown error. Both Toaster messages appear in Turkish.
- [ ] **Activity feed labels translated:** Open the activity feed, run a generation. The type label ("Generate image") and status label ("running", "done") appear in Turkish.
- [ ] **humanizeBackendError translated:** Cause a `captcha_failed` error (disconnect the extension). The Toaster message appears in Turkish.
- [ ] **formatRelativeTime replaced:** ResultViewer shows relative time in Turkish format (e.g., "5 dakika önce"), NOT Vietnamese.
- [ ] **`<html lang>` dynamic:** Switch to Turkish. Inspect `<html>` in DevTools. `lang` attribute reads `"tr"`.
- [ ] **No user data translated:** Board with Turkish node title ("Ürün çekimi") — switch to English and back. Node title is preserved exactly; it does not transform.
- [ ] **xyflow node labels not translated:** Nodes on the canvas have their user-authored `data.title` intact in both languages. The `@xyflow/react` internal node labels (none used in this codebase — node type is rendered by NodeCard, not by xyflow's built-in label prop) are not affected.
- [ ] **Locale persisted across reload:** Set language to Turkish, close tab, reopen — app starts in Turkish without flash.
- [ ] **HMR works during development:** Add a new key to `tr.json`, save — running app shows the new string without page reload.
- [ ] **Static analysis covers all keys:** Run i18next-parser or equivalent. Zero new missing-key warnings. No dynamic key constructions in the output.
- [ ] **No dotted-i regression:** With browser language set to Turkish, trigger a `PUBLIC_ERROR_UNSAFE_GENERATION` error. `humanizeBackendError` correctly matches and returns the translated string (not `null`).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| User data translated (Pitfall 1) | HIGH — existing boards display wrong content | Revert the `t()` call on `data.title`/`data.prompt` etc.; redeploy; boards recover automatically since the data is in the DB unchanged |
| Missing strings discovered post-launch (Pitfall 2) | LOW | Add keys to locale JSON, redeploy — no code change needed |
| Render flicker from HTTP backend (Pitfall 6) | MEDIUM | Switch from `i18next-http-backend` to bundled imports; requires rebuild |
| Dotted-i comparison bug (Pitfall 8) | LOW — targeted fix | Audit and replace bare `.toLowerCase()` with `.toLocaleLowerCase("en-US")` at each comparison site |
| Dynamic key construction (Pitfall 3) | MEDIUM | Enumerate all possible values, add explicit `t("key.value")` per value, remove dynamic template |
| Vietnamese strings still visible (Pitfall 11) | MEDIUM | Rewrite `formatRelativeTime` with i18n keys; straightforward but requires testing |
| `<html lang>` never updated (Pitfall 10) | LOW | Add 3-line `useEffect` in App.tsx |
| `i18n.changeLanguage` called from Zustand effect causing flash (Pitfall 9) | MEDIUM | Refactor initialization to read locale from localStorage before `i18n.init()` |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Translating user data (`data.title`, `data.prompt`, etc.) | Extraction | Switch to Turkish; check existing board node labels are unchanged |
| Missing non-JSX strings (aria, store errors, utility functions) | Extraction | English-locale grep audit + Turkish smoke test of every error path |
| Dynamic key construction | Extraction | Run i18next-parser; confirm zero dynamic-key patterns in output |
| Layout breakage under longer strings | Polish | Screenshot at 1280×800 in Turkish; check every button, badge, dialog |
| Headless translation (Zustand/utility) | Setup | `grep -rn "useTranslation" frontend/src/**/*.ts` returns zero results |
| Initial render flicker | Setup | Hard reload with Turkish in localStorage; observe first paint |
| Vite HMR for locale JSON | Setup | Edit `tr.json`, save; app updates without page reload |
| Turkish dotted-i `.toLowerCase()` | Extraction | Browser in Turkish locale; trigger every `humanizeBackendError` branch |
| Persisted locale race condition | Setup | Hard reload with Turkish stored; no English flash before Turkish |
| `<html lang>` staleness | Polish | DevTools inspect after language switch |
| Vietnamese `formatRelativeTime` | Extraction | ResultViewer in Turkish shows Turkish relative time, not Vietnamese |
| Plurals and interpolation design | Extraction | Define and verify count-bearing keys before writing Turkish strings |
| JSX-in-translation-strings | Extraction | JSON files contain zero `<` or `>` characters |
| LTR CSS assumptions | Polish | Opportunistically replace directional properties in touched CSS rules |

---

## Sources

- Direct codebase audit: `frontend/src/` at v1.2.20 (2026-06-10) — all specific file references above are confirmed against the actual source
- `frontend/src/components/ResultViewer.tsx:60-73` — Vietnamese-hardcoded `formatRelativeTime` (confirmed present)
- `frontend/src/api/client.ts:18-56` — `humanizeBackendError` English strings (confirmed present)
- `frontend/src/canvas/NodeCard.tsx:170,189,192` — untranslated `aria-label` and `title` attributes (confirmed present)
- `frontend/src/store/generation.ts:170` — store-action error string (confirmed present)
- `frontend/src/components/activity/activity-meta.ts` — hardcoded label/status strings (confirmed present)
- react-i18next official documentation — bundled resources pattern and `import.meta.hot.accept` for Vite HMR
- Turkish locale specification — dotted/dotless-i behaviour in `String.prototype.toLowerCase()` (ECMA-262 §22.1.3.26: locale-sensitive case conversion)
- i18next TypeScript integration docs — typed key generation approaches
- CSS Logical Properties specification (W3C CSS Writing Modes Level 3) — browser support table for `margin-inline-start` etc.

---
*Pitfalls research for: React i18n retrofit on Flowboard frontend (Vite + TS strict + Zustand)*
*Researched: 2026-06-10*
