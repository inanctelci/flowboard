# Coding Conventions

**Analysis Date:** 2026-06-10

Flowboard is a polyglot monorepo with three distinct surfaces, each with its own conventions:

| Surface | Language | Location |
|---------|----------|----------|
| Agent (backend) | Python 3.10+ | `agent/flowboard/` |
| Frontend (dashboard) | TypeScript + React 18 | `frontend/src/` |
| Browser extension | Vanilla JavaScript (MV3) | `extension/` |

This document captures conventions for each. Tooling configs intentionally minimal — the project has no ESLint, no Prettier, no Black; style is enforced by `tsc --strict` on the frontend and `ruff` on the backend.

## Naming Patterns

### Files

**Frontend (`frontend/src/`):**
- React components: `PascalCase.tsx` — e.g. `NodeCard.tsx`, `GenerationDialog.tsx`, `AccountPanel.tsx`, `ActivityBell.tsx`.
- Zustand stores: `lowercase.ts` (single noun) — e.g. `board.ts`, `chat.ts`, `generation.ts`, `pipeline.ts`, `references.ts`, `settings.ts`.
- API client + helpers: `camelCase.ts` — e.g. `client.ts`, `autoBrief.ts`, `github.ts`.
- Hooks / metadata helpers inside component folders: `camelCase.ts` — e.g. `useActivityFeed.ts`, `activity-meta.ts`.
- Constants: `camelCase.ts` — e.g. `constants/character.ts`.

**Backend (`agent/flowboard/`):**
- All modules `snake_case.py` — e.g. `flow_client.py`, `claude_cli.py`, `pipeline_executor.py`, `media_project_sync.py`.
- Test files: `test_<subject>.py` — e.g. `test_boards.py`, `test_llm_openai_dual_mode.py`.

**Extension (`extension/`):**
- Flat lowercase: `background.js`, `content.js`, `injected.js`, `popup.js`, `popup.html`, `manifest.json`, `rules.json`.

### Directories

- All lowercase, no separators: `frontend/src/canvas/`, `frontend/src/components/activity/`, `agent/flowboard/services/llm/`, `agent/flowboard/routes/`.
- Component sub-features are grouped: `components/activity/`, `components/settings/`. The parent folder hosts the top-level entry component; the sub-folder hosts pieces wired only from that entry.

### Functions

**Python:**
- `snake_case` for module-level functions and methods — e.g. `generate_unique_short_id`, `record_activity`, `read_active_providers`.
- Private helpers prefixed with single underscore — e.g. `_utcnow()`, `_extract_plan()`, `_handle_proxy()`, `_recover_orphan_running_requests()`.
- FastAPI route handlers named for the HTTP verb + resource — e.g. `list_boards()`, `create_board()`, `update_board()`, `delete_board()`.

**TypeScript:**
- `camelCase` for functions, methods, and store actions — e.g. `loadInitialBoard`, `dispatchGeneration`, `mapReferenceRow`, `humanizeBackendError`.
- React components: `PascalCase` — e.g. `Toaster`, `NodeCard`, `DropAddPopover`.

### Variables

**Python:**
- `snake_case` for locals, parameters, attributes.
- `_SCREAMING_SNAKE` for module-level constants (`_FLOW_API_KEY`, `_COORD_MIN`, `_TIER_REFRESH_MIN_INTERVAL_S`). Public constants without leading underscore (`MAX_UPLOAD_BYTES`, `ALLOWED_UPLOAD_MIMES`, `DEFAULT_TIMEOUT`).

**TypeScript:**
- `camelCase` for locals and props.
- `SCREAMING_SNAKE` for module-level constants — e.g. `OMNI_FLASH_CREDIT_COST`, `OMNI_FLASH_DURATIONS`, `IMAGE_ASPECT_RATIOS`, `REF_SOURCE_TYPES`, `ACCEPT_MIME`, `STATUS_COLOR`, `ICON`.

### Types

**Python:**
- `PascalCase` for classes (SQLModel rows, Pydantic models, error classes) — e.g. `Board`, `NodeCreate`, `BoardUpdate`, `LLMError`, `FlowClient`.
- `Literal["..."]` aliases for closed enums at module top — e.g. `NodeType = Literal["character", "image", "video", ...]`, `NodeStatus = Literal["idle", "queued", ...]`.

**TypeScript:**
- `PascalCase` for `interface`/`type`/`class` — e.g. `FlowboardNodeData`, `NodeDTO`, `EdgeDTO`, `BoardDetail`, `ReferenceItem`.
- DTO suffix for wire types from the backend: `NodeDTO`, `EdgeDTO`, `ChatMessageDTO`, `PlanDTO`, `RequestDTO`, `PipelineRunDTO`.
- `*Key` suffix for string-union enums tied to backend tokens — e.g. `ImageModelKey`, `VideoQuality`, `VideoModelFamily`, `GenderKey`, `CountryKey`, `VibeKey`.
- `*Wire` suffix on internal snake_case row shapes used purely to convert to camelCase — e.g. `ReferenceRowWire` mapped to `ReferenceItem` via `mapReferenceRow`.

## Code Style

### Formatting

**Frontend:**
- No Prettier / no ESLint config in repo. Hand-formatted to ~80–100 columns. 2-space indent.
- Double-quoted strings (`"..."`) for everything — see `frontend/src/api/client.ts`, `frontend/src/canvas/Board.tsx`.
- Trailing commas in multi-line arrays / objects / JSX prop lists.
- Semicolons required.

**Backend:**
- `ruff` configured in `agent/pyproject.toml`:
  - `line-length = 100`
  - `target-version = "py310"`
  - No explicit rule selection — uses ruff defaults (E, F).
- 4-space indent. Double-quoted strings.

**Extension:**
- Vanilla JS, semicolons, double-quoted strings inside files, mixed indentation aligned for visual columns (`const AGENT_WS_URL  = '...'`).

### Linting

**Frontend:**
- TypeScript `tsc -b --noEmit` is the only lint pass. Configured strict in `frontend/tsconfig.json`:
  - `"strict": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
  - `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`
  - `"jsx": "react-jsx"` (no `import React` needed in `.tsx`)
  - `paths`: `{ "@/*": ["src/*"] }`
- Lint command: `npm run lint` → `tsc -b --noEmit`. Same check runs implicitly via `npm run build` → `tsc -b && vite build`.

**Backend:**
- `ruff` (configured in `agent/pyproject.toml`). Invoked manually (no pre-commit hook).
- `# noqa: BLE001` is the only suppression token in active use — broad `except Exception` blocks in the worker, e.g. `agent/flowboard/worker/processor.py:140`, `:345`, `:438`, `:615`, `:633`, `:775`. The annotation is intentional: the worker MUST catch everything so a single bad request doesn't kill the queue loop.
- `# noqa: E402` used in `agent/tests/conftest.py` for late imports that follow env-var setup.

## Import Organization

### TypeScript

Order observed in `frontend/src/canvas/Board.tsx`, `frontend/src/App.tsx`, `frontend/src/components/GenerationDialog.tsx`:

1. **React core** — `import { useEffect, useRef } from "react";`
2. **Third-party packages** — `import { ReactFlowProvider } from "@xyflow/react";`, `import { create } from "zustand";`
3. **Internal modules via relative paths** (`./`, `../`) — grouped roughly by concern:
   - Canvas / component siblings
   - Stores (`../store/*`)
   - API client (`../api/client`)
   - Lib helpers (`../lib/*`)
   - Constants (`../constants/*`)
4. Type-only re-exports inline via `type` keyword: `import { useBoardStore, type FlowNode, type NodeType } from "../store/board";`

**Path aliases:**
- `@/*` → `src/*` is declared in both `tsconfig.json` and `vite.config.ts`, but the code consistently uses **relative imports** (`../store/board`, `./NodeCard`). Treat the alias as available-but-unused; match the relative-import style when adding new code.

### Python

Order observed in `agent/flowboard/main.py`, `agent/flowboard/routes/boards.py`, `agent/flowboard/services/planner.py`:

1. `from __future__ import annotations` (services + tests only; not used in routes/main).
2. Standard library — alphabetical, grouped.
3. Third-party packages — `fastapi`, `pydantic`, `sqlmodel`, `httpx`, `pytest`.
4. First-party `flowboard.*` — grouped by depth (`flowboard.db`, `flowboard.db.models`, `flowboard.routes`, `flowboard.services.*`).

No blank line between groups in most files (e.g. `routes/nodes.py`); blank lines between groups in service modules with many imports (e.g. `services/planner.py`).

Late imports inside functions are used deliberately to break cycles or defer subprocess work — e.g. `from flowboard.services.flow_sdk import is_valid_project_id` inside `_handle_gen_image` in `agent/flowboard/worker/processor.py`. Document the reason inline when adding more.

## Error Handling

### Backend (FastAPI)

- All user-visible errors raise `HTTPException(status_code, detail)`. Standard codes:
  - `400` — malformed body / bad input
  - `401` — auth (only `/api/ext/callback`)
  - `404` — missing row
  - `409` — terminal-state conflict (e.g. cancel an already-canceled request — `agent/flowboard/routes/requests.py`)
  - `422` — Pydantic validation (automatic via FastAPI)
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
  - `logger.info(...)` — lifecycle, successful dispatch, recovery (`main.py:57,61,73`).
  - `logger.warning(...)` — recoverable failures (probe timeouts, poll errors).
  - `logger.error(...)` — unexpected disk/IO failure (`routes/upload.py:208`).
- **NEVER log secrets**: bearer tokens, API keys, callback secrets must not appear in any logger call. See the explicit "NOT logged anywhere — see fetch_paygate_tier() for the only consumer" comment in `agent/flowboard/services/flow_client.py:61`.

### Frontend

- `console.warn` for non-fatal background failures with engineer context — `frontend/src/canvas/Board.tsx:161`, `frontend/src/store/pipeline.ts:71`, `frontend/src/components/activity/ActivityBell.tsx:40`, `frontend/src/store/generation.ts:651`.
- `console.error` for unexpected exceptions inside try/catch — `frontend/src/store/board.ts:481`.
- All user-facing failures must route through a store's `error` slot for `Toaster.tsx` to render — never `console.*` alone.

### Extension

- Console-only. The popup re-renders the last 50 entries from an in-memory `requestLog` ring buffer (`extension/background.js:36-49`).

## Comments

### When to Comment

The codebase uses comments aggressively to capture **rationale** — *why* a choice was made — and warns about non-obvious failure modes. Examples:

- `frontend/src/api/client.ts:196-219` — multi-paragraph docblock on `DataPatch` explaining the shallow-merge contract and the data-loss bug it prevents.
- `agent/flowboard/services/flow_client.py:33-43` — explains why the Google Flow API key appears verbatim and why the tier-refresh interval is 60 s.
- `agent/tests/test_claude_cli.py:1-15` — explains why the CLI is invoked via stdin instead of `-p <prompt>` (Windows cmd.exe argv re-parser bug).
- `agent/flowboard/services/llm/registry.py:29-32` — explains why providers are module-level singletons (probe caching).

**Comment style:** Full sentences. Refer to other files by relative path when guiding the reader. Prefer multi-line block comments over inline trailing `# foo` for any explanation longer than a clause.

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

**Python:**
- Use keyword-only arguments (`*,`) for anything beyond the primary 1–2 inputs — see `LLMProvider.run(self, user_prompt, *, system_prompt=None, attachments=None, timeout=90.0)` in `agent/flowboard/services/llm/base.py:34`.
- Default to `Optional[T] = None` over mutable defaults.
- Pydantic `BaseModel` for every request body — `NodeCreate`, `BoardUpdate`, `_ApiKeyBody`, `_ConfigBody`. Range constraints via `Field(ge=..., le=..., gt=...)`.

**TypeScript:**
- Options-bag object for >2 parameters — see `dispatchGeneration(rfId, opts)`, `refineImage(rfId, opts)`, `getActivityList(opts)`, `uploadImage(file, projectId, nodeId?)`.
- Explicit return types on exported functions: `Promise<NodeDTO>`, `Promise<UploadResponse>`, etc. Internal helpers can rely on inference.

### Return Values

- Backend routes return SQLModel/Pydantic instances directly — FastAPI serializes. No wrapper envelopes (no `{data: ..., error: ...}`).
- Frontend API helpers return the parsed JSON typed as `Promise<T>`. Errors throw.
- Worker handlers return `(result_dict, error_or_None)` tuples — error string `None` = success.

## Module Design

### Exports

**TypeScript:**
- Named exports only — `export function ...`, `export interface ...`, `export const ...`. No `export default` anywhere in `frontend/src/`.
- The single exception is React's own conventions (none in this repo because components are all named exports too).

**Python:**
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

---

*Convention analysis: 2026-06-10*
