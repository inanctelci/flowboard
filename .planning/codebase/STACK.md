# Technology Stack

**Analysis Date:** 2026-06-10

Flowboard is a three-tier local-only application: a Python FastAPI agent
(REST + WebSocket), a React/TypeScript frontend served by Vite, and a
Chrome MV3 extension that proxies authenticated Google Flow API calls
from inside the user's browser session. All three are versioned in
lockstep at `1.2.20`.

## Languages

**Primary:**
- Python 3.10+ — agent backend (`agent/flowboard/`); declared in `agent/pyproject.toml` (`requires-python = ">=3.10"`, `tool.ruff.target-version = "py310"`)
- TypeScript 5.6 — frontend (`frontend/src/`); strict mode enabled in `frontend/tsconfig.json`

**Secondary:**
- JavaScript (browser, no transpile) — Chrome extension (`extension/background.js`, `extension/content.js`, `extension/injected.js`, `extension/popup.js`)
- HTML — extension popup (`extension/popup.html`) and frontend shell (`frontend/index.html`)
- CSS — single global stylesheet at `frontend/src/styles.css`

## Runtime

**Environment:**
- Python interpreter: CPython 3.10+ (per `agent/pyproject.toml`)
- Node.js: implicit (Vite 5 requires Node 18+); no `.nvmrc` pin
- Chrome / Chromium with Manifest V3 support — service worker background page (`extension/manifest.json` → `"manifest_version": 3`)

**Package Manager:**
- Agent: `uv` (preferred) or stdlib `venv` + `pip` — branching lives in `Makefile` (`HAS_UV := $(shell command -v uv 2>/dev/null)`)
- Lockfile: `agent/uv.lock` (uv-managed)
- Frontend: `npm` — `frontend/package-lock.json` present (npm v3 lockfile)

## Frameworks

**Core (backend):**
- FastAPI ≥ 0.115 — HTTP API surface; routers registered in `agent/flowboard/main.py:86-102`
- Uvicorn ≥ 0.30 (`[standard]` extras) — ASGI server; launched via `make agent` → `uvicorn flowboard.main:app --reload --port 8101`
- SQLModel ≥ 0.0.22 — ORM (SQLAlchemy 2 + Pydantic) atop SQLite; models in `agent/flowboard/db/models.py`
- Pydantic ≥ 2.8 — request/response validation throughout `agent/flowboard/routes/`
- websockets ≥ 12.0 — dedicated WS server on port 9223 (`agent/flowboard/services/ws_server.py`) for the Chrome extension bridge
- python-multipart ≥ 0.0.9 — multipart upload parsing in `agent/flowboard/routes/upload.py`
- httpx ≥ 0.27 — outbound HTTP client for Google `/v1/credits`, OpenAI REST API, GCS signed-URL media fetches

**Core (frontend):**
- React 18.3.1 + react-dom 18.3.1 — UI runtime; `frontend/src/main.tsx` mounts via `createRoot` in StrictMode
- @xyflow/react ^12.3.5 — infinite canvas / node-graph engine for the board (`frontend/src/canvas/Board.tsx`)
- Zustand ^5.0.0 — lightweight state store; multiple slices in `frontend/src/store/` (board, chat, generation, pipeline, references, settings)

**Testing:**
- pytest ≥ 8.0 — agent unit/integration tests in `agent/tests/`
- pytest-asyncio ≥ 0.23 — async test support (FastAPI/websockets/httpx mocks)
- No frontend test framework configured; `package.json` has no test script

**Build/Dev:**
- Vite ^5.4.9 — frontend dev server (port 5173) + production bundler; config at `frontend/vite.config.ts` (proxies `/api`, `/media`, `/ws` to the agent on `localhost:8101`)
- @vitejs/plugin-react ^4.3.2 — React Fast Refresh + JSX transform
- TypeScript ^5.6.2 — type-check (`npm run lint` → `tsc -b --noEmit`) and emit (`npm run build` → `tsc -b && vite build`)
- ruff ≥ 0.6 (optional `[dev]` extra) — Python linter; `line-length = 100`, `target-version = "py310"`
- hatchling — Python build backend (`[build-system]` in `agent/pyproject.toml`)

## Key Dependencies

**Critical (agent):**
- `fastapi` — entire HTTP surface depends on it; route registration in `agent/flowboard/main.py`
- `sqlmodel` / `sqlalchemy` — SQLite ORM; engine in `agent/flowboard/db/session.py` enables `PRAGMA foreign_keys=ON` via a connect-event listener
- `httpx` — bidirectional traffic with `aisandbox-pa.googleapis.com`, `api.openai.com`, and `flow-content.google` (media CDN)
- `websockets` — extension bridge transport on `ws://127.0.0.1:9223`

**Critical (frontend):**
- `@xyflow/react` — the whole board UI; its default stylesheet is imported in `frontend/src/main.tsx` (`import "@xyflow/react/dist/style.css"`)
- `zustand` — every UI state slice; no Redux / Context-only fallback

**Infrastructure (agent):**
- `uvicorn[standard]` — pulls in `uvloop`, `httptools`, `watchfiles` for the `--reload` dev experience

**External CLI dependencies (probed at runtime, not on requirements lists):**
- `claude` (Anthropic Claude CLI) — auto-discovered by `agent/flowboard/services/claude_cli.py`
- `gemini` (Google Gemini CLI) — `agent/flowboard/services/llm/gemini.py`, pinned to `gemini-2.5-flash` model
- `codex` (OpenAI Codex CLI, `@openai/codex`) — `agent/flowboard/services/llm/openai.py`; falls back to REST API when CLI lacks vision flag

## Configuration

**Environment:**
- All agent config lives in `agent/flowboard/config.py`, read from env vars at import time:
  - `FLOWBOARD_STORAGE` → storage dir (default: `<repo>/storage`)
  - `FLOWBOARD_DB` → SQLite path (default: `<storage>/flowboard.db`)
  - `FLOWBOARD_HTTP_PORT` → REST port (default `8101`)
  - `FLOWBOARD_WS_HOST` → WS bind address (default `127.0.0.1`; non-loopback raises `RuntimeError` at boot per `main.py:22-26`)
  - `FLOWBOARD_EXT_WS_PORT` → extension WS port (default `9223`)
  - `FLOWBOARD_PLANNER_MODEL` → default `claude-sonnet-4-6`
  - `FLOWBOARD_PLANNER_BACKEND` → `cli` | `mock` | `auto` (default `auto`)
  - `FLOWBOARD_GEMINI_MODEL` → override Gemini model (default `gemini-2.5-flash`)
  - `FLOWBOARD_SECRETS_PATH` → test-only override for the secrets file (`agent/flowboard/services/llm/secrets.py:47`)
- No `.env` / `.env.example` files in the repo; `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` defensively
- No `.nvmrc` / `.python-version` pin

**Build:**
- `frontend/vite.config.ts` — Vite config, `@` path alias → `src/`
- `frontend/tsconfig.json` — strict TS, ES2022 target, `react-jsx`, `@/*` paths
- `agent/pyproject.toml` — project metadata, deps, ruff config
- `extension/manifest.json` — Chrome MV3 manifest (permissions, host permissions, service worker, content scripts, DNR rules)
- `Makefile` — orchestrates install/dev/agent/frontend/extension/clean targets

## Platform Requirements

**Development:**
- macOS, Linux, or Windows (Windows-specific npm-shim resolution in `agent/flowboard/services/llm/cli_utils.py:get_windows_npm_paths`)
- Python ≥ 3.10
- Node.js 18+ implied by Vite 5
- Chrome / Chromium for the unpacked extension (`load unpacked` from `./extension/`)
- Optional: `uv` (Astral) for ~10× faster Python installs
- At least one LLM CLI installed (`claude` / `gemini` / `codex`) OR an OpenAI API key configured via the Settings panel

**Production:**
- Local single-user desktop app — no production deployment target. The agent refuses to bind WS to a non-loopback host (`main.py:22-26`) and CORS allows `*` because the only intended client is `http://localhost:5173`.
- Storage is on-disk SQLite + a media cache folder; no remote DB, no cloud sync, no auth boundary beyond OS file permissions on `~/.flowboard/secrets.json` (chmod `0o600`).

---

*Stack analysis: 2026-06-10*
