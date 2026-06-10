<!-- GSD:project-start source:PROJECT.md -->

## Project

**Flowboard**

Flowboard is a local-only, single-user infinite-canvas workspace for AI media
workflows. It composes characters, products, scenes, and videos as a directed
graph and drives generation through a Chrome MV3 extension that proxies
requests to Google Flow (Veo 3.1 / GEM_PIX_2). The repo is public on GitHub and
the current milestone adds internationalization so non-English users (starting
with Turkish) can use the canvas in their own language.

**Core Value:** The frontend canvas — every visible UI string in `frontend/src/` — must be
usable end-to-end in a non-English language without losing any existing
generation, reference, or planner functionality.

### Constraints

- **Tech stack**: React 18.3 + TypeScript 5.6 strict + Vite 5.4 — i18n choice must integrate cleanly with this trio. No ejecting from Vite, no switching bundlers.
- **Tech stack**: Zustand 5 for state — locale state lives in a Zustand slice (or the i18n library's own provider), not in React Context indirection.
- **Tech stack**: No frontend test runner today — don't make i18n the reason one has to be added; if tests are valuable here, gate that as a separate concern.
- **Scope**: Frontend only (`frontend/src/`). Do not touch `agent/flowboard/` or `extension/` for translation strings in this milestone.
- **Compatibility**: All existing flows (generation, references, planner, chat, settings, board CRUD) must work identically in English after the migration — i18n is a pure additive layer to UI text, not a refactor of behavior.
- **Compatibility**: Build size matters less than maintainability — the repo is local-only and not bandwidth-constrained, so a slightly heavier i18n library with good DX is acceptable.
- **Audience**: Repo is public — choose patterns the open-source community will recognize (react-i18next is the default expectation for React/TS projects unless there's a reason against it; will confirm in research).

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- Python 3.10+ — agent backend (`agent/flowboard/`); declared in `agent/pyproject.toml` (`requires-python = ">=3.10"`, `tool.ruff.target-version = "py310"`)
- TypeScript 5.6 — frontend (`frontend/src/`); strict mode enabled in `frontend/tsconfig.json`
- JavaScript (browser, no transpile) — Chrome extension (`extension/background.js`, `extension/content.js`, `extension/injected.js`, `extension/popup.js`)
- HTML — extension popup (`extension/popup.html`) and frontend shell (`frontend/index.html`)
- CSS — single global stylesheet at `frontend/src/styles.css`

## Runtime

- Python interpreter: CPython 3.10+ (per `agent/pyproject.toml`)
- Node.js: implicit (Vite 5 requires Node 18+); no `.nvmrc` pin
- Chrome / Chromium with Manifest V3 support — service worker background page (`extension/manifest.json` → `"manifest_version": 3`)
- Agent: `uv` (preferred) or stdlib `venv` + `pip` — branching lives in `Makefile` (`HAS_UV := $(shell command -v uv 2>/dev/null)`)
- Lockfile: `agent/uv.lock` (uv-managed)
- Frontend: `npm` — `frontend/package-lock.json` present (npm v3 lockfile)

## Frameworks

- FastAPI ≥ 0.115 — HTTP API surface; routers registered in `agent/flowboard/main.py:86-102`
- Uvicorn ≥ 0.30 (`[standard]` extras) — ASGI server; launched via `make agent` → `uvicorn flowboard.main:app --reload --port 8101`
- SQLModel ≥ 0.0.22 — ORM (SQLAlchemy 2 + Pydantic) atop SQLite; models in `agent/flowboard/db/models.py`
- Pydantic ≥ 2.8 — request/response validation throughout `agent/flowboard/routes/`
- websockets ≥ 12.0 — dedicated WS server on port 9223 (`agent/flowboard/services/ws_server.py`) for the Chrome extension bridge
- python-multipart ≥ 0.0.9 — multipart upload parsing in `agent/flowboard/routes/upload.py`
- httpx ≥ 0.27 — outbound HTTP client for Google `/v1/credits`, OpenAI REST API, GCS signed-URL media fetches
- React 18.3.1 + react-dom 18.3.1 — UI runtime; `frontend/src/main.tsx` mounts via `createRoot` in StrictMode
- @xyflow/react ^12.3.5 — infinite canvas / node-graph engine for the board (`frontend/src/canvas/Board.tsx`)
- Zustand ^5.0.0 — lightweight state store; multiple slices in `frontend/src/store/` (board, chat, generation, pipeline, references, settings)
- pytest ≥ 8.0 — agent unit/integration tests in `agent/tests/`
- pytest-asyncio ≥ 0.23 — async test support (FastAPI/websockets/httpx mocks)
- No frontend test framework configured; `package.json` has no test script
- Vite ^5.4.9 — frontend dev server (port 5173) + production bundler; config at `frontend/vite.config.ts` (proxies `/api`, `/media`, `/ws` to the agent on `localhost:8101`)
- @vitejs/plugin-react ^4.3.2 — React Fast Refresh + JSX transform
- TypeScript ^5.6.2 — type-check (`npm run lint` → `tsc -b --noEmit`) and emit (`npm run build` → `tsc -b && vite build`)
- ruff ≥ 0.6 (optional `[dev]` extra) — Python linter; `line-length = 100`, `target-version = "py310"`
- hatchling — Python build backend (`[build-system]` in `agent/pyproject.toml`)

## Key Dependencies

- `fastapi` — entire HTTP surface depends on it; route registration in `agent/flowboard/main.py`
- `sqlmodel` / `sqlalchemy` — SQLite ORM; engine in `agent/flowboard/db/session.py` enables `PRAGMA foreign_keys=ON` via a connect-event listener
- `httpx` — bidirectional traffic with `aisandbox-pa.googleapis.com`, `api.openai.com`, and `flow-content.google` (media CDN)
- `websockets` — extension bridge transport on `ws://127.0.0.1:9223`
- `@xyflow/react` — the whole board UI; its default stylesheet is imported in `frontend/src/main.tsx` (`import "@xyflow/react/dist/style.css"`)
- `zustand` — every UI state slice; no Redux / Context-only fallback
- `uvicorn[standard]` — pulls in `uvloop`, `httptools`, `watchfiles` for the `--reload` dev experience
- `claude` (Anthropic Claude CLI) — auto-discovered by `agent/flowboard/services/claude_cli.py`
- `gemini` (Google Gemini CLI) — `agent/flowboard/services/llm/gemini.py`, pinned to `gemini-2.5-flash` model
- `codex` (OpenAI Codex CLI, `@openai/codex`) — `agent/flowboard/services/llm/openai.py`; falls back to REST API when CLI lacks vision flag

## Configuration

- All agent config lives in `agent/flowboard/config.py`, read from env vars at import time:
- No `.env` / `.env.example` files in the repo; `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` defensively
- No `.nvmrc` / `.python-version` pin
- `frontend/vite.config.ts` — Vite config, `@` path alias → `src/`
- `frontend/tsconfig.json` — strict TS, ES2022 target, `react-jsx`, `@/*` paths
- `agent/pyproject.toml` — project metadata, deps, ruff config
- `extension/manifest.json` — Chrome MV3 manifest (permissions, host permissions, service worker, content scripts, DNR rules)
- `Makefile` — orchestrates install/dev/agent/frontend/extension/clean targets

## Platform Requirements

- macOS, Linux, or Windows (Windows-specific npm-shim resolution in `agent/flowboard/services/llm/cli_utils.py:get_windows_npm_paths`)
- Python ≥ 3.10
- Node.js 18+ implied by Vite 5
- Chrome / Chromium for the unpacked extension (`load unpacked` from `./extension/`)
- Optional: `uv` (Astral) for ~10× faster Python installs
- At least one LLM CLI installed (`claude` / `gemini` / `codex`) OR an OpenAI API key configured via the Settings panel
- Local single-user desktop app — no production deployment target. The agent refuses to bind WS to a non-loopback host (`main.py:22-26`) and CORS allows `*` because the only intended client is `http://localhost:5173`.
- Storage is on-disk SQLite + a media cache folder; no remote DB, no cloud sync, no auth boundary beyond OS file permissions on `~/.flowboard/secrets.json` (chmod `0o600`).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

| Surface | Language | Location |
|---------|----------|----------|
| Agent (backend) | Python 3.10+ | `agent/flowboard/` |
| Frontend (dashboard) | TypeScript + React 18 | `frontend/src/` |
| Browser extension | Vanilla JavaScript (MV3) | `extension/` |

## Naming Patterns

### Files

- React components: `PascalCase.tsx` — e.g. `NodeCard.tsx`, `GenerationDialog.tsx`, `AccountPanel.tsx`, `ActivityBell.tsx`.
- Zustand stores: `lowercase.ts` (single noun) — e.g. `board.ts`, `chat.ts`, `generation.ts`, `pipeline.ts`, `references.ts`, `settings.ts`.
- API client + helpers: `camelCase.ts` — e.g. `client.ts`, `autoBrief.ts`, `github.ts`.
- Hooks / metadata helpers inside component folders: `camelCase.ts` — e.g. `useActivityFeed.ts`, `activity-meta.ts`.
- Constants: `camelCase.ts` — e.g. `constants/character.ts`.
- All modules `snake_case.py` — e.g. `flow_client.py`, `claude_cli.py`, `pipeline_executor.py`, `media_project_sync.py`.
- Test files: `test_<subject>.py` — e.g. `test_boards.py`, `test_llm_openai_dual_mode.py`.
- Flat lowercase: `background.js`, `content.js`, `injected.js`, `popup.js`, `popup.html`, `manifest.json`, `rules.json`.

### Directories

- All lowercase, no separators: `frontend/src/canvas/`, `frontend/src/components/activity/`, `agent/flowboard/services/llm/`, `agent/flowboard/routes/`.
- Component sub-features are grouped: `components/activity/`, `components/settings/`. The parent folder hosts the top-level entry component; the sub-folder hosts pieces wired only from that entry.

### Functions

- `snake_case` for module-level functions and methods — e.g. `generate_unique_short_id`, `record_activity`, `read_active_providers`.
- Private helpers prefixed with single underscore — e.g. `_utcnow()`, `_extract_plan()`, `_handle_proxy()`, `_recover_orphan_running_requests()`.
- FastAPI route handlers named for the HTTP verb + resource — e.g. `list_boards()`, `create_board()`, `update_board()`, `delete_board()`.
- `camelCase` for functions, methods, and store actions — e.g. `loadInitialBoard`, `dispatchGeneration`, `mapReferenceRow`, `humanizeBackendError`.
- React components: `PascalCase` — e.g. `Toaster`, `NodeCard`, `DropAddPopover`.

### Variables

- `snake_case` for locals, parameters, attributes.
- `_SCREAMING_SNAKE` for module-level constants (`_FLOW_API_KEY`, `_COORD_MIN`, `_TIER_REFRESH_MIN_INTERVAL_S`). Public constants without leading underscore (`MAX_UPLOAD_BYTES`, `ALLOWED_UPLOAD_MIMES`, `DEFAULT_TIMEOUT`).
- `camelCase` for locals and props.
- `SCREAMING_SNAKE` for module-level constants — e.g. `OMNI_FLASH_CREDIT_COST`, `OMNI_FLASH_DURATIONS`, `IMAGE_ASPECT_RATIOS`, `REF_SOURCE_TYPES`, `ACCEPT_MIME`, `STATUS_COLOR`, `ICON`.

### Types

- `PascalCase` for classes (SQLModel rows, Pydantic models, error classes) — e.g. `Board`, `NodeCreate`, `BoardUpdate`, `LLMError`, `FlowClient`.
- `Literal["..."]` aliases for closed enums at module top — e.g. `NodeType = Literal["character", "image", "video", ...]`, `NodeStatus = Literal["idle", "queued", ...]`.
- `PascalCase` for `interface`/`type`/`class` — e.g. `FlowboardNodeData`, `NodeDTO`, `EdgeDTO`, `BoardDetail`, `ReferenceItem`.
- DTO suffix for wire types from the backend: `NodeDTO`, `EdgeDTO`, `ChatMessageDTO`, `PlanDTO`, `RequestDTO`, `PipelineRunDTO`.
- `*Key` suffix for string-union enums tied to backend tokens — e.g. `ImageModelKey`, `VideoQuality`, `VideoModelFamily`, `GenderKey`, `CountryKey`, `VibeKey`.
- `*Wire` suffix on internal snake_case row shapes used purely to convert to camelCase — e.g. `ReferenceRowWire` mapped to `ReferenceItem` via `mapReferenceRow`.

## Code Style

### Formatting

- No Prettier / no ESLint config in repo. Hand-formatted to ~80–100 columns. 2-space indent.
- Double-quoted strings (`"..."`) for everything — see `frontend/src/api/client.ts`, `frontend/src/canvas/Board.tsx`.
- Trailing commas in multi-line arrays / objects / JSX prop lists.
- Semicolons required.
- `ruff` configured in `agent/pyproject.toml`:
- 4-space indent. Double-quoted strings.
- Vanilla JS, semicolons, double-quoted strings inside files, mixed indentation aligned for visual columns (`const AGENT_WS_URL  = '...'`).

### Linting

- TypeScript `tsc -b --noEmit` is the only lint pass. Configured strict in `frontend/tsconfig.json`:
- Lint command: `npm run lint` → `tsc -b --noEmit`. Same check runs implicitly via `npm run build` → `tsc -b && vite build`.
- `ruff` (configured in `agent/pyproject.toml`). Invoked manually (no pre-commit hook).
- `# noqa: BLE001` is the only suppression token in active use — broad `except Exception` blocks in the worker, e.g. `agent/flowboard/worker/processor.py:140`, `:345`, `:438`, `:615`, `:633`, `:775`. The annotation is intentional: the worker MUST catch everything so a single bad request doesn't kill the queue loop.
- `# noqa: E402` used in `agent/tests/conftest.py` for late imports that follow env-var setup.

## Import Organization

### TypeScript

- `@/*` → `src/*` is declared in both `tsconfig.json` and `vite.config.ts`, but the code consistently uses **relative imports** (`../store/board`, `./NodeCard`). Treat the alias as available-but-unused; match the relative-import style when adding new code.

### Python

## Error Handling

### Backend (FastAPI)

- All user-visible errors raise `HTTPException(status_code, detail)`. Standard codes:
- Worker handlers (`agent/flowboard/worker/processor.py`) return `tuple[dict, Optional[str]]` — the second element is the error code string (`"missing_url"`, `"url_not_allowed"`, `"missing_prompt"`, `"PUBLIC_ERROR_UNSAFE_GENERATION"`, etc.). The worker writes that into the `Request.error` column and flips `status="failed"` — never raises.
- The frontend's `humanizeBackendError()` in `frontend/src/api/client.ts:18-56` maps a closed set of these codes (`paygate_tier_unknown`, `no_media_id_in_upload_response`, `captcha_failed:*`, `public_error_*`) to user-readable sentences. **When you add a new error token in the worker, add a humaniser branch there too** if it can surface to a dispatch.
- Catch-all in worker: `except Exception:  # noqa: BLE001` — the broad catch is intentional; never narrow it without a clear story for keeping the queue alive on unexpected raises.

### LLM layer

- Single error type: `LLMError(RuntimeError)` in `agent/flowboard/services/llm/base.py`. Every provider raises subclasses (or this directly) so the HTTP layer surfaces one shape.
- `LLMError` must **never** carry the API key or any token — comment-enforced.

### Frontend

- API helpers throw `Error(message)`. The `extractErrorMessage()` helper in `frontend/src/api/client.ts:58-88` tries JSON → text → status-line in that order and feeds the result through `humanizeBackendError`.
- Errors land on per-store `error: string | null` slots (board, chat, generation, pipeline). `frontend/src/components/Toaster.tsx` reads all four with a fixed priority order (`chat > pipeline > generation > board`) and auto-dismisses after 5 s.
- `try/catch` at the call site sets the store's `error` slot — never `alert()` / `console.error` as a primary UX. `console.warn`/`console.error` is used sparingly for true engineer-only paths (e.g. `Board.tsx:161`, `store/board.ts:481`).

## Logging

### Backend

- `logging` standard library; module-level `logger = logging.getLogger(__name__)` per file (`main.py:28`, `worker/processor.py:23`, `services/flow_client.py:30`, `routes/upload.py:35`, `routes/llm.py:30`).
- `logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")` set once in `agent/flowboard/main.py:29`.
- Levels:
- **NEVER log secrets**: bearer tokens, API keys, callback secrets must not appear in any logger call. See the explicit "NOT logged anywhere — see fetch_paygate_tier() for the only consumer" comment in `agent/flowboard/services/flow_client.py:61`.

### Frontend

- `console.warn` for non-fatal background failures with engineer context — `frontend/src/canvas/Board.tsx:161`, `frontend/src/store/pipeline.ts:71`, `frontend/src/components/activity/ActivityBell.tsx:40`, `frontend/src/store/generation.ts:651`.
- `console.error` for unexpected exceptions inside try/catch — `frontend/src/store/board.ts:481`.
- All user-facing failures must route through a store's `error` slot for `Toaster.tsx` to render — never `console.*` alone.

### Extension

- Console-only. The popup re-renders the last 50 entries from an in-memory `requestLog` ring buffer (`extension/background.js:36-49`).

## Comments

### When to Comment

- `frontend/src/api/client.ts:196-219` — multi-paragraph docblock on `DataPatch` explaining the shallow-merge contract and the data-loss bug it prevents.
- `agent/flowboard/services/flow_client.py:33-43` — explains why the Google Flow API key appears verbatim and why the tier-refresh interval is 60 s.
- `agent/tests/test_claude_cli.py:1-15` — explains why the CLI is invoked via stdin instead of `-p <prompt>` (Windows cmd.exe argv re-parser bug).
- `agent/flowboard/services/llm/registry.py:29-32` — explains why providers are module-level singletons (probe caching).

### JSDoc / TSDoc

- Used on exported API helpers and store actions when the contract is non-obvious — see the long `/** ... */` block on `DataPatch` and `patchEdge` in `frontend/src/api/client.ts`, on `useSettingsStore` in `frontend/src/store/settings.ts`, on `collectUpstreamRefMediaIds` in `frontend/src/store/generation.ts`.
- Skip for trivial getters / simple props.

### Python docstrings

- Module-level docstrings on every service / route file, explaining what it does and any non-obvious design choices — see `agent/flowboard/services/flow_client.py:1-17`, `agent/flowboard/routes/llm.py:1-16`, `agent/flowboard/services/claude_cli.py:1-12`, `agent/flowboard/services/planner.py:1-20`.
- Public route handlers: docstring required when there's any side-effect or ordering invariant — see `delete_board()` in `agent/flowboard/routes/boards.py:72-83` enumerating the FK delete order.
- Pydantic `BaseModel` field docstrings: prefer inline `# ...` comments above fields over docstrings.

## Function Design

### Size

- No hard limit; functions grow when they're orchestrating a multi-step Flow round-trip (e.g. `_handle_gen_image` in `agent/flowboard/worker/processor.py` is ~150 lines because every guard / mapping is inline for readability).
- Prefer module-level private helpers (`_extract_plan`, `_recover_orphan_running_requests`) over class methods when state is not involved.

### Parameters

- Use keyword-only arguments (`*,`) for anything beyond the primary 1–2 inputs — see `LLMProvider.run(self, user_prompt, *, system_prompt=None, attachments=None, timeout=90.0)` in `agent/flowboard/services/llm/base.py:34`.
- Default to `Optional[T] = None` over mutable defaults.
- Pydantic `BaseModel` for every request body — `NodeCreate`, `BoardUpdate`, `_ApiKeyBody`, `_ConfigBody`. Range constraints via `Field(ge=..., le=..., gt=...)`.
- Options-bag object for >2 parameters — see `dispatchGeneration(rfId, opts)`, `refineImage(rfId, opts)`, `getActivityList(opts)`, `uploadImage(file, projectId, nodeId?)`.
- Explicit return types on exported functions: `Promise<NodeDTO>`, `Promise<UploadResponse>`, etc. Internal helpers can rely on inference.

### Return Values

- Backend routes return SQLModel/Pydantic instances directly — FastAPI serializes. No wrapper envelopes (no `{data: ..., error: ...}`).
- Frontend API helpers return the parsed JSON typed as `Promise<T>`. Errors throw.
- Worker handlers return `(result_dict, error_or_None)` tuples — error string `None` = success.

## Module Design

### Exports

- Named exports only — `export function ...`, `export interface ...`, `export const ...`. No `export default` anywhere in `frontend/src/`.
- The single exception is React's own conventions (none in this repo because components are all named exports too).
- No explicit `__all__`. Public surface is everything not prefixed with `_`. Star imports avoided.

### Barrel Files

- Backend uses `__init__.py` as a barrel for the `flowboard.db` package — `from flowboard.db import get_session, init_db`.
- Frontend has no barrel files. Every consumer imports directly from the leaf module (`../store/board`, `../api/client`).

## Domain Patterns

### React components

- **Function components only**, no classes anywhere in `frontend/src/`. Hooks-first style.
- One component per file, named export matching the file name (`NodeCard.tsx` exports `NodeCard`).
- Component-internal helpers (e.g. `StatusStrip`, `BriefHint` in `frontend/src/canvas/NodeCard.tsx:30-54`) declared as plain functions in the same file, not exported.
- `React.StrictMode` wraps the app root — `frontend/src/main.tsx:8`.

### Zustand stores

- One slice per concern, all created via `create<State>((set, get) => ({ ... }))`. See `frontend/src/store/board.ts:237`, `chat.ts:30`, `generation.ts:105`, `pipeline.ts:17`, `references.ts:79`, `settings.ts:95`.
- State + action interface defined once, types match the closure shape.
- Every store with side-effecting actions exposes an `error: string | null` slot and a `clearError()` action so `Toaster.tsx` can pick it up.
- Selectors at use sites: `const x = useBoardStore((s) => s.x)` — never destructure the whole store (forces unnecessary re-renders).
- Cross-store reads use `useOtherStore.getState()` inside actions — see `collectUpstreamRefMediaIds` in `frontend/src/store/generation.ts:75`.

### FastAPI routes

- One `APIRouter` per resource file (`routes/boards.py`, `routes/nodes.py`, …). Each declares its own `prefix` and `tags`.
- All routers registered explicitly in `agent/flowboard/main.py:86-102` — adding a new route file requires editing this list.
- Pydantic request models declared at the top of the route file, suffixed by intent: `BoardCreate`, `BoardUpdate`, `NodeCreate`, `NodeUpdate`.
- Each handler opens its own `with get_session() as s:` block — no shared session across handlers, no FastAPI `Depends` for the session.

### SQLModel

- Schema lives in `agent/flowboard/db/models.py`. Tables use `Optional[int] = Field(default=None, primary_key=True)` for autoincrement IDs.
- JSON columns: `data: dict = Field(default_factory=dict, sa_column=Column(JSON))` — see `Node.data`, `Request.params`, `Request.result`.
- Timestamps: `created_at: datetime = Field(default_factory=_utcnow)` where `_utcnow` returns UTC-aware datetimes (`datetime.now(timezone.utc)`).

### Async

- Worker handlers are all `async def` and return `tuple[dict, Optional[str]]`.
- Route handlers are mostly **sync** (`def`, not `async def`) — FastAPI runs them in a thread pool. Use `async def` only when the handler awaits something (e.g. `/api/ext/callback`, `/api/llm/providers/{name}/test`).

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Frontend SPA entry | Bootstrap ReactFlow + Zustand stores | `frontend/src/main.tsx`, `frontend/src/App.tsx` |
| Board canvas | Render nodes + edges; handle drag / connect / drop | `frontend/src/canvas/Board.tsx` |
| NodeCard | Per-node UI (upload, preview, generate, brief, variant tiles) | `frontend/src/canvas/NodeCard.tsx` |
| VariantEdge | Bezier edge with `v{N}` chip for pinned-variant edges | `frontend/src/canvas/VariantEdge.tsx` |
| GenerationDialog | Compose prompt + dispatch image / video request | `frontend/src/components/GenerationDialog.tsx` |
| ResultViewer | Full-screen variant viewer + metadata + refine action | `frontend/src/components/ResultViewer.tsx` |
| Board store | Active board, nodes, edges, CRUD + persistence | `frontend/src/store/board.ts` |
| Generation store | Dispatch + poll generation requests | `frontend/src/store/generation.ts` |
| API client | All `/api/*` calls + error humanization | `frontend/src/api/client.ts` |
| FastAPI app | Lifespan: init DB, recover orphan requests, start worker + WS | `agent/flowboard/main.py` |
| REST routers | One module per resource under `agent/flowboard/routes/` | `agent/flowboard/routes/*.py` |
| WorkerController | Single-consumer asyncio queue, type-dispatched handlers | `agent/flowboard/worker/processor.py` |
| FlowSDK | Body assembly + endpoint URLs for every Flow call | `agent/flowboard/services/flow_sdk.py` |
| FlowClient bridge | WS singleton; request/callback future correlation | `agent/flowboard/services/flow_client.py` |
| WS server | Standalone `:9223` loopback for extension | `agent/flowboard/services/ws_server.py` |
| Media cache | URL ingest, on-disk cache, inline-bytes ingest | `agent/flowboard/services/media.py` |
| Media project sync | Cross-project re-upload + mapping cache | `agent/flowboard/services/media_project_sync.py` |
| Pipeline executor | Materialise Plan → Nodes/Edges, walk DAG, enqueue Requests | `agent/flowboard/services/pipeline_executor.py` |
| Prompt synth | Auto-prompt: walk upstream briefs → compose prompt via LLM | `agent/flowboard/services/prompt_synth.py` |
| Vision service | Image → short factual brief via LLM | `agent/flowboard/services/vision.py` |
| Planner service | Chat → plan-spec JSON via LLM (claude/gemini/openai) | `agent/flowboard/services/planner.py` |
| LLM registry | Feature → provider routing (auto_prompt / vision / planner) | `agent/flowboard/services/llm/registry.py` |
| Activity recorder | Wraps LLM / upload ops as Request rows for the feed | `agent/flowboard/services/activity.py` |
| DB models | All SQLModel tables in one module | `agent/flowboard/db/models.py` |
| Extension SW | Browser-context fetch proxy + token capture | `extension/background.js` |
| Extension content/injected | reCAPTCHA token harvest in MAIN world | `extension/content.js`, `extension/injected.js` |

## Pattern Overview

- Local-first / single-user: SQLite + on-disk media cache live under `storage/`; agent binds to `127.0.0.1` only.
- Bring-your-own-auth: the agent has no credentials — every Google Flow call is round-tripped through the Chrome extension which fetches inside the user's authenticated `labs.google` session.
- DAG-of-nodes domain model: a Board owns Nodes (character / image / video / prompt / note / visual_asset / Storyboard) connected by Edges; downstream nodes pull `mediaIds` from upstream as `IMAGE_INPUT_TYPE_REFERENCE` at dispatch time.
- Async work queue: every long-running operation (gen_image / gen_video / gen_video_omni / edit_image / proxy / create_project) is a `Request` row drained by a single asyncio-queue worker; the frontend polls `GET /api/requests/{id}` until terminal status.
- WebSocket request/callback split: agent sends `api_request` over WS to the extension (assigns a UUID), extension performs the fetch in browser context and POSTs the response to `/api/ext/callback` with an HMAC-compared secret — the agent resolves the pending `asyncio.Future` by id.

## Layers

- Purpose: render the board canvas + all dialogs/overlays/panels and own optimistic UI state.
- Location: `frontend/src/`
- Contains: ReactFlow canvas (`canvas/`), per-feature components (`components/`), Zustand stores (`store/`), API client (`api/`), pure helpers (`lib/`), enum tables (`constants/`).
- Depends on: `@xyflow/react`, `react`, `zustand` (only — see `frontend/package.json`).
- Used by: developers + end-user browser at `http://localhost:5173`.
- Purpose: typed surface for the frontend — boards, nodes, edges, requests, media bytes, uploads, references, plans, chat, LLM config, auth, activity, prompt synth, vision, projects.
- Location: `agent/flowboard/routes/`
- Contains: one router module per resource; each owns Pydantic models + handlers.
- Depends on: `db/` for persistence, `services/` for cross-cutting logic, `worker/` for enqueue.
- Used by: frontend `api/client.ts` (HTTP) + the extension's `/api/ext/callback` HTTP poster.
- Purpose: business logic that is too big or shared to live in a route module.
- Location: `agent/flowboard/services/`
- Contains: `flow_client` (WS bridge singleton), `flow_sdk` (Flow request bodies + endpoint URLs), `media` + `media_project_sync` (local cache + cross-project re-upload), `prompt_synth` / `vision` / `planner` (LLM-driven), `pipeline_executor` (Plan → run), `activity` (request-feed wrapper), `events` (per-board pub/sub), `llm/` (provider registry + Claude/Gemini/OpenAI implementations), `claude_cli` (subprocess wrapper), `ws_server` (extension socket).
- Depends on: `db/`, `config`, third-party (`httpx`, `websockets`).
- Used by: routes + worker handlers.
- Purpose: drain the `Request` queue with per-type handlers; persist `result` / `status` / `error` back to the DB; honour cancel mid-poll.
- Location: `agent/flowboard/worker/processor.py`
- Contains: `WorkerController` (single asyncio queue) + 6 handlers (`proxy`, `create_project`, `gen_image`, `gen_video`, `gen_video_omni`, `edit_image`).
- Depends on: `services/flow_sdk`, `services/flow_client`, `services/media`, `services/media_project_sync`, `db/`.
- Used by: routes call `get_worker().enqueue(rid)` after persisting a queued row.
- Purpose: persist boards, nodes, edges, requests, assets, references, chat, plans, pipeline runs, board↔flow_project bindings, cross-project media-id mappings.
- Location: `agent/flowboard/db/`
- Contains: `models.py` (every SQLModel table), `session.py` (engine + targeted migration + `get_session()` ctx).
- Depends on: `sqlmodel`, `sqlalchemy`.
- Used by: routes + services + worker.
- Purpose: be the only piece that holds a Google `labs.google` session — capture the Bearer token, solve reCAPTCHA in MAIN world, perform authenticated fetches against `aisandbox-pa.googleapis.com` + `labs.google` TRPC, POST results back over HTTP.
- Location: `extension/`
- Contains: `manifest.json` (MV3), `background.js` (WS client + fetch proxy), `content.js` (script injector + captcha message relay), `injected.js` (MAIN-world reCAPTCHA caller), `rules.json` (DNR), `popup.html` / `popup.js` (status UI).
- Depends on: Chrome extension APIs (`tabs`, `scripting`, `webRequest`, `declarativeNetRequest`, `storage`, `alarms`).
- Used by: the agent's `flow_client.api_request()` / `flow_client.trpc_request()`.

## Data Flow

### Primary Request Path — image generation (`kind="image"`)

### Video Generation Flow (Veo i2v + Omni Flash r2v)

### Board Bootstrap

### Chat → Plan → Pipeline (currently disabled in App.tsx but wired end-to-end)

- Frontend: Zustand stores in `frontend/src/store/` — one per concern (`board`, `generation`, `references`, `settings`, `chat`, `pipeline`).
- Backend: SQLite via SQLModel `get_session()` context manager (`agent/flowboard/db/session.py`). Session is opened per route handler / worker step; never long-lived. Long-running handlers explicitly release the session during the RPC and re-open afterwards to update the row.
- In-memory singletons: `FlowClient` (`flow_client`), `WorkerController` (`get_worker()`), `BoardBus` (`board_bus`) — all module-level.

## Key Abstractions

- Purpose: top-level container for one canvas; 1:1 with a Google Flow `project_id`.
- Examples: `agent/flowboard/db/models.py:12` (`Board`), `frontend/src/store/board.ts`
- Pattern: Each Board has a `BoardFlowProject` binding row (separate table so the Board schema doesn't change when Flow rotates the project id).
- Purpose: one of 7 typed cards on the canvas; `data` is a free-form JSON blob shallow-merged on PATCH.
- Examples: `agent/flowboard/db/models.py:18` (`Node`), `frontend/src/store/board.ts:31` (`FlowboardNodeData`).
- Pattern: Backend stores `type` as a string literal; frontend casts to `NodeType` union. Storyboard is a thin wrapper over `image` — same backend treatment, frontend uses `lib/storyboardPrompt.ts` to compose the prompt.
- Purpose: direct one upstream `mediaId` (or a specific variant) into a downstream node as `IMAGE_INPUT_TYPE_REFERENCE`.
- Examples: `agent/flowboard/db/models.py:32` (`Edge.source_variant_idx`), `frontend/src/canvas/VariantEdge.tsx`.
- Pattern: `source_variant_idx` is per-edge (not per-source) because each Flow API call binds one input — pinning lets the user route variant 2 to downstream A and variant 3 to downstream B with two clicks.
- Purpose: every async operation is a Request row; status transitions are the single contract between worker and UI poller.
- Examples: `agent/flowboard/db/models.py:52` (`Request`), `agent/flowboard/worker/processor.py:705` (`_process_one`).
- Pattern: Statuses are `queued | running | done | failed | timeout | canceled`. `timeout` is distinct from `failed` so the UI can render the 5-min video budget exhaustion differently. Cancellation is cooperative — long handlers re-check the row between polls.
- Purpose: per-media-id row tracking signed URL + local cache path.
- Examples: `agent/flowboard/db/models.py:64` (`Asset`), `agent/flowboard/services/media.py`.
- Pattern: Upsert on `uuid_media_id` (unique); cache files in `storage/media/{id}.{ext}` are owned by Asset and survive Reference deletes.
- Purpose: cross-board reusable media — snapshot of media_id + label + kind + ai_brief + aspect_ratio.
- Examples: `agent/flowboard/db/models.py:108` (`Reference`), `frontend/src/components/ReferencesPanel.tsx`.
- Pattern: Distinct from Asset (auto-managed) — references are user-curated CRUD, kinds = `image | character | visual_asset | storyboard_shot`.
- Purpose: planner's JSON spec (`nodes[]`, `edges[]`, `layout_hint`) that can be materialised onto the canvas + executed.
- Examples: `agent/flowboard/db/models.py:140` (`Plan`), `agent/flowboard/services/pipeline_executor.py`.
- Purpose: separation of *transport* (WS-pending-future correlation, callback secret) from *protocol* (request-body assembly, endpoint URLs).
- Examples: `agent/flowboard/services/flow_client.py:45` (`FlowClient`), `agent/flowboard/services/flow_sdk.py`.
- Purpose: feature-routed dispatch (`auto_prompt` / `vision` / `planner` → `claude` / `gemini` / `openai`).
- Examples: `agent/flowboard/services/llm/registry.py:49` (`run_llm`).

## Entry Points

- Location: `agent/flowboard/main.py:76` (`app = FastAPI(... lifespan=lifespan)`)
- Triggers: `uvicorn flowboard.main:app --reload --port 8101` (see `Makefile:agent`).
- Responsibilities: register CORS middleware + every router; lifespan opens DB / recovers orphan `running` requests / starts the WS server task + worker task.
- Location: `agent/flowboard/services/ws_server.py:50` (`run_ws_server`)
- Triggers: spawned as an asyncio task in the app lifespan; listens on `ws://127.0.0.1:9223`.
- Responsibilities: accept the single extension connection, send the callback secret on connect, route inbound messages through `flow_client.handle_message`.
- Location: `agent/flowboard/worker/processor.py:676` (`WorkerController.start`)
- Triggers: spawned as an asyncio task in the app lifespan.
- Responsibilities: drain `asyncio.Queue[int]` of request ids, dispatch to per-type handler, persist result.
- Location: `frontend/src/main.tsx`, mounted to `#root` from `frontend/index.html`.
- Triggers: `npm run dev` (Vite on `:5173`, proxies `/api` + `/media` + `/ws` to `:8101`).
- Responsibilities: render `<App />`, kick `loadInitialBoard` + `loadReferences` once.
- Location: `extension/background.js`
- Triggers: Chrome MV3 lifecycle (installed / startup); WS-connects to `ws://127.0.0.1:9223`.
- Responsibilities: token capture (webRequest), fetch proxy, callback POST.

## Architectural Constraints

- **Threading:** Single-threaded asyncio event loop on the agent. SQLAlchemy engine uses `check_same_thread=False` because the session is briefly threaded through worker handlers. SQLite serialises writes — no concurrent-write contention because the worker is single-consumer.
- **Loopback only:** `agent/flowboard/main.py:22` raises at boot if `FLOWBOARD_WS_HOST` is not `127.0.0.1` / `localhost` / `::1`. The extension WS is unauthenticated by design — making it network-reachable would leak the callback secret.
- **Callback secret:** Generated fresh per agent boot (`secrets.token_urlsafe(32)`), sent to the extension on WS connect, validated by HMAC compare on `/api/ext/callback`. Never logged.
- **Single extension assumption:** `flow_client.set_extension(ws)` overwrites any previous socket. Concurrent connections would silently displace each other.
- **Global state (singletons):** `flow_client` (`services/flow_client.py:389`), `_worker` (`worker/processor.py:792`), `board_bus` (`services/events.py:28`), `_PROVIDERS` (`services/llm/registry.py:32`). All module-level — reset between tests via fixtures in `agent/tests/conftest.py`.
- **No long-lived sessions:** Every DB access goes through `with get_session() as s:` — long-running RPC calls explicitly release the session before the network round-trip and reacquire it to update the row.
- **PATCH /api/nodes/{id} shallow-merge contract:** `data` field is shallow-merged into the existing JSON column (1-level deep, `null` is the delete sentinel). Wholesale replace was a regression source — see `routes/nodes.py:75` docstring.
- **Project-scoped media:** Flow scopes mediaIds to the project they were uploaded under. Cross-project refs require re-upload via `MediaProjectMapping` (`agent/flowboard/services/media_project_sync.py`).
- **Paygate tier failure is loud:** No silent default to `PAYGATE_TIER_ONE`. Handlers return `paygate_tier_unknown` so an Ultra user never gets dispatched at the Pro checkpoint (`agent/flowboard/worker/processor.py:92`).
- **URL allowlist for `proxy` handler:** Worker refuses any URL not prefixed with `https://aisandbox-pa.googleapis.com/` (`worker/processor.py:30`). Media cache enforces `https://flow-content.google/` (`services/media.py:36`).

## Anti-Patterns

### Wholesale replace of `node.data` JSON column

### Silent paygate-tier default

### `cd <current-directory>` before `git` / shell utilities

### Re-emitting `token_captured` on every outbound request

### Collapsing partial-batch failures to `failed`

## Error Handling

- Routes raise `HTTPException(status_code, detail=...)`; FastAPI serialises to JSON.
- Worker handlers return `(result_dict, error_or_None)` tuples — never raise. Exceptions caught by `_process_one` and stamped onto the row.
- `flow_client._send` returns `{"error": "..."}` rather than raising — keeps the protocol consistent across timeout / disconnect / explicit error.
- Special statuses: `timeout` (video poll exhaustion, distinct from `failed`), `canceled` (cooperative user-initiated cancel — late-arriving results don't overwrite it).
- Frontend caps consecutive poll failures at `MAX_NETWORK_RETRIES = 8` so a dead agent can't keep a poll alive forever.

## Cross-Cutting Concerns

- Frontend ↔ agent: none (localhost only).
- Agent ↔ extension: HMAC-compared `X-Callback-Secret` header on `/api/ext/callback` (`agent/flowboard/main.py:114`). WS server itself is unauthenticated (loopback-only guard at boot).
- Agent ↔ Flow: no creds; the extension holds the Google session and is the only thing that can fetch `aisandbox-pa.googleapis.com` / `labs.google` TRPC.
- LLM providers: per-provider API keys persisted via `agent/flowboard/services/llm/secrets.py`; written through `PUT /api/llm/providers/{name}` only, never echoed back.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
