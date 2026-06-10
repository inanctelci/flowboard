# Phase 1: Infra + Audit - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 11 (5 new, 6 modified)
**Analogs found:** 8 / 11 (3 new files are greenfield with no codebase analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/i18n/i18n.ts` | config/init | event-driven | `frontend/src/main.tsx` (side-effect import pattern) | partial |
| `frontend/src/i18n/i18n.d.ts` | config/types | — | none in codebase | no analog |
| `frontend/src/i18n/locales/en.json` | config/catalog | — | none in codebase | no analog |
| `frontend/src/i18n/locales/tr.json` | config/catalog | — | none in codebase | no analog |
| `frontend/src/main.tsx` | provider/entry | request-response | itself (current state) | exact — 2-line addition |
| `frontend/src/App.tsx` | component | event-driven | itself (current `useEffect`) | exact — add to existing hook block |
| `frontend/src/store/settings.ts` | store | CRUD | itself (current field/action pattern) | exact — pattern-identical addition |
| `frontend/src/api/client.ts` | utility | transform | itself (current line 19) | exact — 1-char diff |
| `frontend/src/components/ResultViewer.tsx` | component | transform | itself (current lines 60-73) | exact — function rewrite |
| `frontend/index.html` | config | — | itself | exact — no change needed |
| `.planning/phases/01-infra-audit/STRING-INVENTORY.md` | audit-doc | — | none | no analog |

---

## Pattern Assignments

### `frontend/src/i18n/i18n.ts` (config/init, event-driven)

**No codebase analog.** Greenfield file. The closest structural reference is the
side-effect import pattern already used in `frontend/src/main.tsx`.

**Side-effect import pattern** (`frontend/src/main.tsx` lines 4-5):
```typescript
import "@xyflow/react/dist/style.css";
import "./styles.css";
```

The i18n init follows the same convention: a bare `import "./i18n/i18n"` in
`main.tsx` is the side-effect that causes `i18n.ts`'s module-scope `i18n.init()`
to run before React renders. This is the only pattern in the codebase where
module-load order is load-bearing.

**Vite HMR note:** `frontend/src/vite-env.d.ts` does NOT exist in this project.
The `i18n.ts` skeleton must therefore include `/// <reference types="vite/client" />`
at the top to type `import.meta.hot`, or the `npm run lint` (`tsc -b --noEmit`)
check will fail with `Property 'hot' does not exist on type 'ImportMeta'`.

**Full skeleton** (from RESEARCH.md §5.1 — confirmed grounded against codebase):
```typescript
/// <reference types="vite/client" />
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

const SUPPORTED = ["en", "tr"] as const;
type Locale = (typeof SUPPORTED)[number];

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem("flowboard.i18n.locale");
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // localStorage may be disabled
  }
  const nav = (navigator.language ?? navigator.languages?.[0] ?? "en")
    .split("-")[0]
    .toLowerCase();
  return (SUPPORTED as readonly string[]).includes(nav) ? (nav as Locale) : "en";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: detectInitialLocale(),
    fallbackLng: "en",
    supportedLngs: ["en", "tr"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "flowboard.i18n.locale",
      caches: ["localStorage"],
    },
  });

if (import.meta.hot) {
  import.meta.hot.accept(
    ["./locales/en.json", "./locales/tr.json"],
    ([newEn, newTr]) => {
      if (newEn) i18n.addResourceBundle("en", "translation", newEn.default, true, true);
      if (newTr) i18n.addResourceBundle("tr", "translation", newTr.default, true, true);
    },
  );
}

export default i18n;
export type { Locale };
```

---

### `frontend/src/i18n/i18n.d.ts` (config/types)

**No codebase analog.** TypeScript declaration merging is not used anywhere else
in the project. The file is entirely defined by the i18next `CustomTypeOptions`
interface extension pattern. Use the RESEARCH.md §5.2 skeleton verbatim.

**Full skeleton** (RESEARCH.md §5.2):
```typescript
import "i18next";
import type en from "./locales/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
```

**Why this works:** `resolveJsonModule: true` is confirmed in `frontend/tsconfig.json`
line 14. The `frontend/src/i18n/` directory is under `"include": ["src"]` so this
file is automatically picked up by `tsc`.

---

### `frontend/src/i18n/locales/en.json` (config/catalog)

**No codebase analog.** Phase 1 stub contains only bug-fix keys. Use the
RESEARCH.md §5.3 structure exactly.

```json
{
  "time.just_now": "just now",
  "time.seconds_ago_one": "{{count}}s ago",
  "time.seconds_ago_other": "{{count}}s ago",
  "time.minutes_ago_one": "{{count}} min ago",
  "time.minutes_ago_other": "{{count}} min ago",
  "time.hours_ago_one": "{{count}} hr ago",
  "time.hours_ago_other": "{{count}} hr ago",
  "time.days_ago_one": "{{count}} d ago",
  "time.days_ago_other": "{{count}} d ago"
}
```

---

### `frontend/src/i18n/locales/tr.json` (config/catalog)

Same keys as `en.json`, all values empty string (triggers i18next fallback to
English at runtime). RESEARCH.md §5.4 skeleton.

---

### `frontend/src/main.tsx` (provider/entry — MODIFY)

**Analog:** itself. Current content confirmed at lines 1-11.

**Current file** (`frontend/src/main.tsx` lines 1-11 — full file):
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@xyflow/react/dist/style.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**What to add:** Three new import lines (lines 3-5 in the new version, before the
`App` import) and wrap `<App />` with `<I18nextProvider i18n={i18n}>`.

**Target state** (complete replacement):
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
// i18n side-effect import MUST precede App. Module load order in ES modules
// is top-to-bottom within the same file; this guarantees i18n.init() runs
// synchronously before <App /> renders, eliminating first-paint flicker.
import "./i18n/i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n";
import { App } from "./App";
import "@xyflow/react/dist/style.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
);
```

**Key constraint:** `import "./i18n/i18n"` must appear before `import { App }` —
this is the load-order invariant that prevents `loadPersistedLocale()` in
`settings.ts` from running before `i18n.resolvedLanguage` is populated.

---

### `frontend/src/App.tsx` (component — MODIFY)

**Analog:** itself. Current file confirmed at lines 1-58.

**Existing `useEffect` pattern** (`frontend/src/App.tsx` lines 24-31):
```typescript
useEffect(() => {
  if (ran.current) return;
  ran.current = true;
  loadInitialBoard();
  void loadReferences();
}, [loadInitialBoard, loadReferences]);
```

**What to add:** One new import and one new `useEffect` block.

**New import** (add to existing import block at top of file):
```typescript
import { useTranslation } from "react-i18next";
```

**New hook declarations** (add inside `App()` function body, after the existing
`const ran = useRef(false)` at line 22, before the existing `useEffect`):
```typescript
// BUGS-03: Keep <html lang> in sync with the active locale.
// document.documentElement is outside the React tree (#root) — direct
// DOM mutation is correct here.
const { i18n } = useTranslation();
useEffect(() => {
  document.documentElement.lang = i18n.resolvedLanguage ?? "en";
}, [i18n.resolvedLanguage]);
```

**Why `resolvedLanguage` not `language`:** `i18n.language` can be the full BCP 47
tag from the browser (e.g. `"tr-TR"`). `i18n.resolvedLanguage` is the matched
supported language — always `"en"` or `"tr"` for this config.

---

### `frontend/src/store/settings.ts` (store — MODIFY)

**Analog:** itself. Current file confirmed at lines 1-139.

**Existing field-add pattern** (`frontend/src/store/settings.ts` lines 52-61):
```typescript
interface SettingsState {
  imageModel: ImageModelKey;
  videoQuality: VideoQuality;
  videoModel: VideoModelFamily;
  omniFlashDuration: OmniFlashDuration;
  setImageModel(model: ImageModelKey): void;
  setVideoQuality(q: VideoQuality): void;
  setVideoModel(m: VideoModelFamily): void;
  setOmniFlashDuration(d: OmniFlashDuration): void;
}
```

**Existing action pattern** (`frontend/src/store/settings.ts` lines 130-138 — `setOmniFlashDuration` as the most recent action):
```typescript
setOmniFlashDuration(d) {
  set({ omniFlashDuration: d });
  persist({
    imageModel: get().imageModel,
    videoQuality: get().videoQuality,
    videoModel: get().videoModel,
    omniFlashDuration: d,
  });
},
```

**Existing persistence pattern** (`frontend/src/store/settings.ts` lines 63-88):
```typescript
const STORAGE_KEY = "flowboard.settings.v1";

interface PersistShape {
  imageModel?: ImageModelKey;
  // ...
}

function loadPersisted(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function persist(state: PersistShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage disabled / quota — non-fatal, just lose persistence.
  }
}
```

**Changes to make — follow this exact pattern:**

1. **Add import** after `import { create } from "zustand"` (line 1):
```typescript
import i18n, { type Locale } from "../i18n/i18n";
```

2. **Add fields to `SettingsState` interface** (after `omniFlashDuration: OmniFlashDuration` at line 56):
```typescript
  locale: Locale;
  setLocale(l: Locale): void;
```

3. **Add new constant and helpers** after `const STORAGE_KEY = "flowboard.settings.v1"` (line 63):
```typescript
const LOCALE_KEY = "flowboard.i18n.locale";

function loadPersistedLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "en" || stored === "tr") return stored;
  } catch { /* ignore */ }
  const resolved = i18n.resolvedLanguage;
  if (resolved === "en" || resolved === "tr") return resolved;
  return "en";
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch { /* ignore */ }
}
```

4. **Add initial value** in the `create<SettingsState>((set, get) => ({` block (after `omniFlashDuration: persisted.omniFlashDuration ?? 4` at line 102):
```typescript
  locale: loadPersistedLocale(),
```

5. **Add action** in the `create` block (after `setOmniFlashDuration` at line 138):
```typescript
  setLocale(l) {
    set({ locale: l });
    persistLocale(l);
    // i18n.changeLanguage is the ONLY call site — components never call
    // changeLanguage directly; they call setLocale() on this store.
    void i18n.changeLanguage(l);
    // NOTE: do NOT call persist() here — locale lives in its own key
    // (flowboard.i18n.locale), not in the settings blob.
  },
```

**Critical:** The locale does NOT get added to `PersistShape` and the
`setLocale` action does NOT call `persist()`. The locale has its own
dedicated `LOCALE_KEY = "flowboard.i18n.locale"` handled by `persistLocale()`.
This matches the locked decision from CONTEXT.md and mirrors the `STORAGE_KEY`
pattern structurally while staying separate by key.

---

### `frontend/src/api/client.ts` (utility — MODIFY, line 19)

**Analog:** itself. Line 19 confirmed.

**Current code** (`frontend/src/api/client.ts` line 19):
```typescript
  const t = token.toLowerCase();
```

**Replacement** (1-char change — add locale argument):
```typescript
  const t = token.toLocaleLowerCase("en-US");
```

**Surrounding context** (`frontend/src/api/client.ts` lines 15-56 — no other changes):
```typescript
// Map cryptic Flow / pipeline error tokens to a sentence the user can act on.
function humanizeBackendError(token: string): string | null {
  const t = token.toLocaleLowerCase("en-US");  // <-- the only change
  if (t === "paygate_tier_unknown") { ... }
  if (t === "no_media_id_in_upload_response") { ... }
  if (t.includes("captcha_failed: no current window")) { ... }
  if (t.startsWith("captcha_failed:")) { ... }
  if (t.startsWith("public_error_")) { ... }
  return null;
}
```

All four downstream `t.startsWith(...)` / `t === ...` / `t.includes(...)` checks
use only ASCII-lowercase tokens — they are unaffected by the locale change. The
fix only matters when `token` contains uppercase `I` (which maps to dotless `ı`
in a Turkish locale under bare `.toLowerCase()`).

---

### `frontend/src/components/ResultViewer.tsx` (component — MODIFY, lines 57-73 + call site)

**Analog:** itself. Lines 57-73 and call site at line 657 confirmed.

**Current `formatRelativeTime` function** (`frontend/src/components/ResultViewer.tsx` lines 57-73):
```typescript
/** Format an ISO timestamp as a Vietnamese relative time string —
 *  "vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước". Falls
 *  back to "—" when the timestamp is missing or unparseable. */
function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return "vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(t).toLocaleDateString("vi-VN");
}
```

**Current call site** (`frontend/src/components/ResultViewer.tsx` line 657):
```tsx
<dd>{formatRelativeTime(data?.renderedAt)}</dd>
```

**Changes — three locations in the file:**

**1. Add import** (top of file, with other imports):
```typescript
import { useTranslation } from "react-i18next";
```

**2. Replace function definition** (lines 57-73):
```typescript
/** Format an ISO timestamp as a relative time string using the active locale.
 *  Returns "—" when the timestamp is missing or unparseable.
 *
 *  Pass `t` (from useTranslation) and `resolvedLanguage` (from i18n) as
 *  parameters so the function remains a pure utility — no hook calls inside. */
function formatRelativeTime(
  iso: string | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
  resolvedLanguage: string,
): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "—";
  const diffSec = Math.max(0, (Date.now() - ts) / 1000);
  if (diffSec < 60) return t("time.just_now");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("time.minutes_ago", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("time.hours_ago", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("time.days_ago", { count: diffDay });
  return new Intl.DateTimeFormat(resolvedLanguage).format(new Date(ts));
}
```

**Note on plural key resolution:** Calling `t("time.minutes_ago", { count: diffMin })`
causes i18next to look up `time.minutes_ago_one` (count === 1) or
`time.minutes_ago_other` (count !== 1) automatically — the base key
`time.minutes_ago` does not need to exist in `en.json`. The `_one`/`_other`
suffixed keys defined in `en.json` are the ones that are actually resolved.

**3. Add hook call inside `ResultViewer` function body** (near other hooks, before
the early return at the `if (!data)` guard — confirmed at line ~277 per RESEARCH.md;
the hooks block starts at line 76):
```typescript
const { t, i18n } = useTranslation();
```

**4. Update call site** (line 657):
```tsx
<dd>{formatRelativeTime(data?.renderedAt, t, i18n.resolvedLanguage ?? "en")}</dd>
```

---

### `frontend/index.html` (config — no change)

**Keep `lang="en"` as-is.** The `useEffect` in `App.tsx` updates
`document.documentElement.lang` dynamically after React mounts. No change to
`index.html` is needed for Phase 1.

---

### `.planning/phases/01-infra-audit/STRING-INVENTORY.md` (audit-doc)

**No codebase analog.** This is a planning deliverable, not source code. Populate
it according to the schema in RESEARCH.md §6 after grepping the codebase. The
RESEARCH.md §7 (V7 verification) lists the minimum required coverage:

- `frontend/src/canvas/NodeCard.tsx` — aria-labels at lines 170, 189, 192
- `frontend/src/api/client.ts` — all 4 `humanizeBackendError` branch strings
- `frontend/src/store/generation.ts` — store error string at ~line 170
- `frontend/src/components/activity/activity-meta.ts` — ACTIVITY_TYPE_META labels
- `frontend/src/components/Toaster.tsx` — aria-label at line 58
- `frontend/src/constants/character.ts` — mark all entries `do-not-translate`

---

## Shared Patterns

### TypeScript Conventions (apply to all new `.ts` / `.tsx` files)

**Source:** `frontend/src/store/settings.ts` (confirmed), `frontend/src/App.tsx` (confirmed)

From CONTEXT.md §Established Patterns:
- `"strict": true` in `frontend/tsconfig.json` — no implicit `any`, no unused locals
- `npm run lint` = `tsc -b --noEmit` — this is the only lint step; no ESLint
- Named exports everywhere — `export default` only for `i18n` instance (matches
  i18next library's own pattern; acceptable exception per RESEARCH.md §Project Constraints)
- Relative imports — `"../i18n/i18n"` not `"@/i18n/i18n"` (no path aliases in this project)
- Double-quoted strings, 2-space indent, semicolons throughout

### localStorage Read/Write (apply to `settings.ts` additions)

**Source:** `frontend/src/store/settings.ts` lines 72-88

Pattern: wrap every `localStorage` call in `try/catch`, return empty/default on
failure, never throw. The `persist()` function swallows quota errors silently.
The `loadPersistedLocale()` and `persistLocale()` additions must follow this same
pattern exactly.

### Zustand `set` + manual persist (apply to `setLocale` action)

**Source:** `frontend/src/store/settings.ts` lines 103-138

Pattern:
```typescript
setXxx(value) {
  set({ field: value });
  persist({ ...get all other fields..., field: value });
},
```

`setLocale` diverges intentionally: it calls `persistLocale(l)` (dedicated key)
instead of the shared `persist()` (blob key). The `set({ locale: l })` call is
identical to the existing pattern.

### `useEffect` with external dependency (apply to App.tsx lang-sync effect)

**Source:** `frontend/src/App.tsx` lines 24-31

Pattern:
```typescript
useEffect(() => {
  // guard or side effect
}, [dep1, dep2]);
```

The lang-sync `useEffect` uses `[i18n.resolvedLanguage]` as its dependency array.
No cleanup return is needed (setting `document.documentElement.lang` is idempotent
and has no teardown).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/i18n/i18n.ts` | config/init | event-driven | First i18n file in this codebase; module-scope init pattern has no direct analog |
| `frontend/src/i18n/i18n.d.ts` | config/types | — | No TypeScript declaration merging exists anywhere in the project |
| `frontend/src/i18n/locales/en.json` | config/catalog | — | No locale catalog files exist yet |
| `frontend/src/i18n/locales/tr.json` | config/catalog | — | No locale catalog files exist yet |
| `.planning/phases/01-infra-audit/STRING-INVENTORY.md` | audit-doc | — | Planning deliverable; no code analog needed |

---

## Metadata

**Analog search scope:** `frontend/src/` (all subdirectories)
**Files read directly:** `main.tsx`, `App.tsx`, `store/settings.ts`, `api/client.ts`, `components/ResultViewer.tsx` lines 50-130
**Files scanned:** 5 source files (complete reads); confirmed current content at all modification targets
**Pattern extraction date:** 2026-06-10
