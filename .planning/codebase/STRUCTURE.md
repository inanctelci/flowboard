# Codebase Structure

**Analysis Date:** 2026-06-10

## Directory Layout

```
flowboard/
├── agent/                          # Python FastAPI backend ("flowboard-agent")
│   ├── flowboard/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app + lifespan (DB init, worker, WS)
│   │   ├── config.py               # Env vars + storage paths
│   │   ├── short_id.py             # 4-char base36 unique-per-board id generator
│   │   ├── db/
│   │   │   ├── __init__.py         # re-exports get_session, init_db
│   │   │   ├── models.py           # All SQLModel tables (single file)
│   │   │   └── session.py          # SQLite engine + targeted migrations
│   │   ├── routes/                 # FastAPI routers — one per resource
│   │   │   ├── boards.py           # CRUD + cascade delete
│   │   │   ├── nodes.py            # CRUD + PATCH shallow-merge
│   │   │   ├── edges.py            # CRUD + variant-pin patch
│   │   │   ├── requests.py         # Enqueue + status + cancel
│   │   │   ├── media.py            # /media/{id} bytes + status
│   │   │   ├── upload.py           # User image upload to Flow
│   │   │   ├── references.py       # Cross-board reference library
│   │   │   ├── projects.py         # Board ↔ Flow project bootstrap
│   │   │   ├── flow_projects.py    # One-way local→Flow project sync
│   │   │   ├── chat.py             # Chat send + planner reply
│   │   │   ├── plans.py            # Plan run + pipeline-run status
│   │   │   ├── prompt.py           # Auto-prompt API
│   │   │   ├── vision.py           # Image → aiBrief
│   │   │   ├── llm.py              # Multi-LLM provider settings
│   │   │   ├── auth.py             # /api/auth/me (Google profile + tier)
│   │   │   └── activity.py         # Activity feed (read-only)
│   │   ├── services/               # Domain logic — too big or shared for routes
│   │   │   ├── flow_client.py      # WS bridge singleton + callback correlation
│   │   │   ├── flow_sdk.py         # Flow API body assembly + endpoint URLs
│   │   │   ├── ws_server.py        # Standalone :9223 WebSocket server
│   │   │   ├── media.py            # On-disk media cache + ingest
│   │   │   ├── media_project_sync.py # Cross-project media re-upload + mapping
│   │   │   ├── pipeline_executor.py # Plan → materialize + DAG walk
│   │   │   ├── prompt_synth.py     # Auto-prompt synthesizer
│   │   │   ├── vision.py           # AI-vision brief
│   │   │   ├── planner.py          # Chat planner
│   │   │   ├── activity.py         # record_activity context manager
│   │   │   ├── events.py           # BoardBus (per-board pub/sub)
│   │   │   ├── claude_cli.py       # Claude CLI subprocess wrapper
│   │   │   └── llm/                # LLM provider abstraction
│   │   │       ├── base.py         # LLMProvider abstract base
│   │   │       ├── registry.py     # Feature → provider routing
│   │   │       ├── claude.py       # ClaudeProvider (CLI-backed)
│   │   │       ├── gemini.py       # GeminiProvider (CLI-backed)
│   │   │       ├── openai.py       # OpenAIProvider (CLI-backed)
│   │   │       ├── cli_utils.py    # Shared subprocess helpers
│   │   │       └── secrets.py      # API-key persistence
│   │   └── worker/
│   │       ├── __init__.py
│   │       └── processor.py        # WorkerController + per-type handlers
│   ├── tests/                      # pytest test suite
│   │   ├── conftest.py             # Fixtures (engine override, mocks)
│   │   └── test_*.py               # ~25 modules — one per resource/service
│   ├── pyproject.toml              # name=flowboard-agent, version=1.2.20
│   ├── requirements.txt
│   └── uv.lock                     # uv-managed lockfile
│
├── frontend/                       # React + Vite SPA ("flowboard-frontend")
│   ├── src/
│   │   ├── main.tsx                # ReactDOM mount
│   │   ├── App.tsx                 # Layout: ProjectSidebar | canvas | overlays
│   │   ├── styles.css              # Global stylesheet
│   │   ├── canvas/                 # ReactFlow integration
│   │   │   ├── Board.tsx           # <ReactFlow> wrapper + drop-popover
│   │   │   ├── NodeCard.tsx        # Per-type node renderer (1577 lines)
│   │   │   ├── VariantEdge.tsx     # Bezier edge + variant-pin chip
│   │   │   └── AddNodePalette.tsx  # Floating "Add node" buttons
│   │   ├── components/             # Non-canvas UI
│   │   │   ├── GenerationDialog.tsx
│   │   │   ├── ResultViewer.tsx
│   │   │   ├── ProjectSidebar.tsx
│   │   │   ├── ReferencesPanel.tsx
│   │   │   ├── ChatSidebar.tsx     # currently commented out in App.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── AccountPanel.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   ├── Toaster.tsx
│   │   │   ├── ForcedSetupGate.tsx # Blocks app until an LLM provider is set
│   │   │   ├── SponsorDialog.tsx
│   │   │   ├── AiProviderBadge.tsx
│   │   │   ├── AiProviderDialog.tsx
│   │   │   ├── activity/           # Activity-feed components
│   │   │   │   ├── ActivityBell.tsx
│   │   │   │   ├── ActivityDropdown.tsx
│   │   │   │   ├── ActivityRow.tsx
│   │   │   │   ├── ActivityDetailModal.tsx
│   │   │   │   ├── ActivityIcon.tsx
│   │   │   │   ├── activity-meta.ts
│   │   │   │   └── useActivityFeed.ts
│   │   │   └── settings/           # AI-providers Settings subsection
│   │   │       ├── AiProvidersSection.tsx
│   │   │       ├── ProviderCard.tsx
│   │   │       └── ProviderSetupModal.tsx
│   │   ├── store/                  # Zustand stores (per concern)
│   │   │   ├── board.ts            # Active board + nodes + edges
│   │   │   ├── generation.ts       # Dispatch + poll generation
│   │   │   ├── references.ts       # Cross-board reference library
│   │   │   ├── settings.ts         # User prefs (model, video quality, etc.)
│   │   │   ├── chat.ts             # Chat panel state
│   │   │   └── pipeline.ts         # Pipeline-run polling
│   │   ├── api/                    # HTTP wrappers
│   │   │   ├── client.ts           # fetch wrapper + every /api/* method (914 lines)
│   │   │   ├── autoBrief.ts        # requestAutoBrief helper
│   │   │   └── github.ts           # Latest-release check for upgrade prompt
│   │   ├── lib/                    # Pure helpers
│   │   │   └── storyboardPrompt.ts # Storyboard grid layout + prompt template
│   │   └── constants/              # Enum-like lookup tables
│   │       └── character.ts        # Country / vibe / gender tags
│   ├── index.html                  # Vite entry; mounts #root
│   ├── vite.config.ts              # /api + /media + /ws proxied to :8101
│   ├── tsconfig.json
│   ├── package.json                # name=flowboard-frontend, version=1.2.20
│   └── package-lock.json
│
├── extension/                      # Chrome MV3 extension ("Flowboard Bridge")
│   ├── manifest.json               # MV3, host_permissions for labs.google + aisandbox-pa
│   ├── background.js               # Service worker — WS client + fetch proxy
│   ├── content.js                  # Script injector + captcha relay
│   ├── injected.js                 # MAIN-world reCAPTCHA caller
│   ├── rules.json                  # declarativeNetRequest rules
│   ├── popup.html / popup.js       # Browser-action popup (status UI)
│   ├── README.md                   # Extension dev docs
│   └── _metadata/                  # Chrome-generated indexed rulesets
│
├── docs/                           # Spec + design + migration scripts
│   ├── PLAN.md                     # Planner JSON-spec contract
│   ├── design/                     # Stitch / design phase notes
│   │   └── stitch-phase1/
│   ├── migrations/                 # SQLite cleanup scripts (raw .sql)
│   │   ├── backfill-node-prompts.sql
│   │   └── clear-polluted-paygate-tier.sql
│   ├── release-notes/
│   │   └── v1.1.0-facebook-post.md
│   └── assets/                     # Screenshots / diagrams
│
├── storage/                        # Runtime data (gitignored)
│   ├── flowboard.db                # SQLite database
│   └── media/                      # Cached image / video bytes by media_id
│
├── .planning/                      # GSD planning workspace
│   └── codebase/                   # This directory — ARCHITECTURE / STRUCTURE / ...
│
├── .omc/                           # OMC (other-tooling) plans + release rules
│   ├── plans/                      # Phase plans + archive
│   └── RELEASE_RULE.md
│
├── .github/                        # GitHub workflows (CI config)
├── Makefile                        # install / dev / agent / frontend / extension targets
├── README.md                       # Top-level docs (30 KB)
├── extension.crx / extension.pem   # Packaged extension build outputs (gitignored)
└── .gitignore
```

## Directory Purposes

**`agent/`:**
- Purpose: Python FastAPI backend that owns the SQLite DB, the request worker, the extension bridge, and all Google Flow protocol logic.
- Contains: `pyproject.toml` (uv / pip), `requirements.txt`, the `flowboard/` package, and `tests/`.
- Key files: `agent/flowboard/main.py` (FastAPI app + lifespan), `agent/pyproject.toml`.

**`agent/flowboard/routes/`:**
- Purpose: HTTP surface — one router module per resource, mounted in `main.py` via `app.include_router(...)`.
- Contains: Pydantic request/response models + `@router.<verb>` handlers.
- Key files: `agent/flowboard/routes/requests.py` (the heart of the dispatch loop), `agent/flowboard/routes/media.py` (serves bytes to `<img src="/media/{id}">`), `agent/flowboard/routes/nodes.py` (PATCH shallow-merge contract).

**`agent/flowboard/services/`:**
- Purpose: Domain logic that is too big or too shared to live inside a route.
- Contains: 12 modules + the `llm/` subpackage.
- Key files: `agent/flowboard/services/flow_client.py` (the WS bridge singleton), `agent/flowboard/services/flow_sdk.py` (every Flow endpoint body assembly — 1254 lines), `agent/flowboard/services/media.py`, `agent/flowboard/services/pipeline_executor.py`.

**`agent/flowboard/services/llm/`:**
- Purpose: Multi-provider LLM abstraction. Features (`auto_prompt`, `vision`, `planner`) route to one of three CLI-backed providers (`claude`, `gemini`, `openai`).
- Key files: `agent/flowboard/services/llm/registry.py` (the `run_llm()` entry point), `agent/flowboard/services/llm/base.py` (`LLMProvider` ABC), `agent/flowboard/services/llm/secrets.py` (API-key persistence).

**`agent/flowboard/worker/`:**
- Purpose: Async work queue draining `Request` rows.
- Key files: `agent/flowboard/worker/processor.py` (`WorkerController` + 6 handlers).

**`agent/flowboard/db/`:**
- Purpose: SQLite persistence (SQLModel ORM).
- Key files: `agent/flowboard/db/models.py` (every table in one module — Board, Node, Edge, Request, Asset, MediaProjectMapping, Reference, ChatMessage, Plan, PlanRevision, PipelineRun, BoardFlowProject), `agent/flowboard/db/session.py` (engine + `get_session()` ctx manager + targeted migrations).

**`agent/tests/`:**
- Purpose: pytest suite — one `test_<resource>.py` per route/service.
- Contains: `conftest.py` (fixtures), 25 test modules.
- Key files: `agent/tests/conftest.py`, `agent/tests/test_processor_tier_fallback.py` (regression for the paygate-tier silent default bug).

**`frontend/`:**
- Purpose: Vite + React SPA. All UI lives here.
- Contains: `src/` package, Vite config, TypeScript config, `package.json` (3 runtime deps: `@xyflow/react`, `react`, `zustand`).
- Key files: `frontend/vite.config.ts` (proxies `/api`, `/media`, `/ws` → `:8101`), `frontend/package.json`.

**`frontend/src/canvas/`:**
- Purpose: ReactFlow integration — board + nodes + edges + drop popover.
- Key files: `frontend/src/canvas/Board.tsx` (the `<ReactFlow>` host), `frontend/src/canvas/NodeCard.tsx` (every node type renders through this single component, 1577 lines — split if it grows).

**`frontend/src/components/`:**
- Purpose: Non-canvas UI — dialogs, panels, overlays, toolbars.
- Subdirectories: `activity/` (activity bell + dropdown + detail modal), `settings/` (AI-provider settings subsection).
- Key files: `frontend/src/components/GenerationDialog.tsx` (1365 lines — the primary dispatch entry point), `frontend/src/components/ResultViewer.tsx` (739 lines — variant viewer + metadata).

**`frontend/src/store/`:**
- Purpose: Zustand stores — one per concern.
- Key files: `frontend/src/store/board.ts`, `frontend/src/store/generation.ts`.

**`frontend/src/api/`:**
- Purpose: HTTP client wrappers.
- Key files: `frontend/src/api/client.ts` (914 lines — every `/api/*` method + DTO types + error humanization).

**`frontend/src/lib/`:**
- Purpose: Pure helpers (no I/O, no React).
- Key files: `frontend/src/lib/storyboardPrompt.ts` (storyboard grid normaliser + prompt template builder).

**`frontend/src/constants/`:**
- Purpose: Enum-like lookup tables.
- Key files: `frontend/src/constants/character.ts` (CHARACTER_COUNTRIES, CHARACTER_VIBES, CHARACTER_GENDERS).

**`extension/`:**
- Purpose: Chrome MV3 extension that holds the user's `labs.google` session and proxies fetches on the agent's behalf.
- Key files: `extension/manifest.json` (MV3 + host_permissions), `extension/background.js` (WS client + fetch proxy + token capture), `extension/injected.js` (MAIN-world reCAPTCHA).

**`docs/`:**
- Purpose: Spec / design / migration artifacts. Not user-facing docs (that's `README.md`).
- Key files: `docs/PLAN.md` (planner spec contract), `docs/migrations/*.sql` (one-off DB cleanup scripts).

**`storage/`:**
- Purpose: Runtime data — gitignored.
- Contains: `flowboard.db` (SQLite), `media/` (cached image / video bytes by `{media_id}.{ext}`).
- Path overridable via `FLOWBOARD_STORAGE` env var (`agent/flowboard/config.py:5`).

**`.planning/codebase/`:**
- Purpose: GSD codebase-mapping documents (this file lives here).

**`.omc/plans/`:**
- Purpose: OMC phase plans and their archive. Read by other tooling.

## Key File Locations

**Entry Points:**
- `agent/flowboard/main.py`: FastAPI app + lifespan (DB init, WS server task, worker task).
- `agent/flowboard/services/ws_server.py`: Standalone WS server on `:9223`.
- `frontend/src/main.tsx`: ReactDOM mount.
- `frontend/index.html`: Vite HTML entry; loads `src/main.tsx`.
- `extension/background.js`: Chrome MV3 service worker.

**Configuration:**
- `agent/flowboard/config.py`: All env vars (`FLOWBOARD_STORAGE`, `FLOWBOARD_DB`, `FLOWBOARD_HTTP_PORT`, `FLOWBOARD_WS_HOST`, `FLOWBOARD_EXT_WS_PORT`, `FLOWBOARD_PLANNER_MODEL`, `FLOWBOARD_PLANNER_BACKEND`).
- `agent/pyproject.toml`: Python deps + ruff config (`line-length=100`, `target-version=py310`).
- `frontend/vite.config.ts`: Dev server port + `/api` + `/media` + `/ws` proxies.
- `frontend/tsconfig.json`: TypeScript config.
- `extension/manifest.json`: MV3 manifest + host permissions + DNR rules.
- `Makefile`: All dev workflows.

**Core Logic:**
- `agent/flowboard/db/models.py`: Every SQLModel table.
- `agent/flowboard/worker/processor.py`: The work queue + all generation handlers.
- `agent/flowboard/services/flow_client.py`: WS bridge + callback-secret + future correlation.
- `agent/flowboard/services/flow_sdk.py`: Every Google Flow API request body + endpoint URL.
- `frontend/src/store/board.ts`: Active board + node/edge CRUD.
- `frontend/src/store/generation.ts`: Dispatch + poll generation requests.
- `frontend/src/canvas/NodeCard.tsx`: Per-type node UI (every node renders through this).
- `frontend/src/api/client.ts`: Every backend call + DTO types.

**Testing:**
- `agent/tests/conftest.py`: pytest fixtures (engine override, mocks).
- `agent/tests/test_*.py`: ~25 test modules, one per resource/service.
- (No frontend tests yet.)

## Naming Conventions

**Files:**
- Python: `snake_case.py`. Modules named after the resource they own (e.g. `boards.py` → `BoardRouter`; `media.py` → media service).
- TypeScript components: `PascalCase.tsx` (e.g. `GenerationDialog.tsx`, `NodeCard.tsx`).
- TypeScript non-component: `camelCase.ts` (e.g. `client.ts`, `storyboardPrompt.ts`, `autoBrief.ts`).
- Tests: `test_<resource>.py` mirroring the route or service module name.

**Directories:**
- Python: `snake_case` (`flowboard/`, `routes/`, `services/`, `worker/`).
- Frontend: lowercase singular (`src/canvas/`, `src/store/`, `src/api/`, `src/lib/`). Component subdirectories use lowercase plural for grouping (`components/activity/`, `components/settings/`).

**Symbols:**
- Python classes: `PascalCase` (`WorkerController`, `FlowClient`, `BoardBus`).
- Python functions / modules / vars: `snake_case` (`get_session`, `flow_client`, `_handle_gen_image`).
- TypeScript types / interfaces: `PascalCase` (`FlowboardNodeData`, `EdgeDTO`).
- TypeScript functions / vars / store keys: `camelCase` (`dispatchGeneration`, `loadInitialBoard`, `useBoardStore`).
- TS enum-like constant tables: `SCREAMING_SNAKE_CASE` (`CHARACTER_COUNTRIES`, `OMNI_FLASH_DURATIONS`, `STORYBOARD_GRIDS`).
- Database table names: lowercase singular (`board`, `node`, `edge`, `request`, `asset`, `reference`, `chatmessage`, `plan`, `pipelinerun`, `boardflowproject`, `mediaprojectmapping`) — SQLModel default.

**REST URL prefixes:** All routes live under `/api/<resource>` (boards, nodes, edges, requests, media, references, chat, plans, llm, auth, activity). Two exceptions: `/media/{id}` (binary bytes — short URL for `<img src>`) and `/api/ext/callback` (extension callback).

## Where to Add New Code

**New backend route (e.g. a new resource):**
- File: `agent/flowboard/routes/<resource>.py`.
- Pattern: define `router = APIRouter(prefix="/api/<resource>", tags=["<resource>"])`, Pydantic models, `@router.<verb>(...)` handlers.
- Register: `app.include_router(<resource>.router)` in `agent/flowboard/main.py:86-103`.
- Tests: `agent/tests/test_<resource>.py`.

**New SQLModel table:**
- File: add the class to `agent/flowboard/db/models.py` (single file by convention).
- Migration: `SQLModel.metadata.create_all(engine)` is called from `init_db()` at lifespan-startup — net-new tables are picked up automatically. For schema changes to existing tables, add a targeted `ALTER TABLE` in `agent/flowboard/db/session.py:init_db()` (see the `Edge.source_variant_idx` precedent).

**New worker request type:**
- File: add an `async def _handle_<type>(params)` function in `agent/flowboard/worker/processor.py`.
- Register: add to `_DEFAULT_HANDLERS` dict at the bottom of `processor.py`.
- Contract: return `(result_dict, error_or_None)` — never raise.
- Frontend dispatch: build params in `frontend/src/store/generation.ts` and call `createRequest({type: "<type>", node_id, params})` from `frontend/src/api/client.ts`.

**New domain service (cross-cutting logic):**
- File: `agent/flowboard/services/<service>.py`. One module per concern.
- If it's an LLM-routed feature: add a new `Feature` literal to `agent/flowboard/services/llm/registry.py` and call `run_llm("<feature>", ...)`.

**New frontend component:**
- Reusable UI: `frontend/src/components/<Name>.tsx`.
- Canvas-bound (node, edge, palette): `frontend/src/canvas/<Name>.tsx`.
- Feature subdirectory if growing >3 files: `frontend/src/components/<feature>/<Name>.tsx` (see `activity/`, `settings/` precedent).

**New Zustand store:**
- File: `frontend/src/store/<concern>.ts`.
- Pattern: `export const use<Concern>Store = create<<Concern>State>((set, get) => ({ ... }))`.

**New API method (frontend):**
- File: `frontend/src/api/client.ts` (append-only — every method lives in one module).
- Pattern: export `function <verb><Resource>(...): Promise<DTO>` using the shared `api<T>()` fetch wrapper.

**New helper / pure function:**
- File: `frontend/src/lib/<topic>.ts`. No I/O, no React. Used by both components and stores.

**New enum-like table (frontend):**
- File: `frontend/src/constants/<topic>.ts`. SCREAMING_SNAKE_CASE arrays.

**New test:**
- File: `agent/tests/test_<resource>.py`.
- Pattern: use fixtures from `conftest.py` (engine override for isolation, mocked `flow_client` / `flow_sdk` where the route would hit the network).

**Migration script (one-off DB cleanup):**
- File: `docs/migrations/<purpose>.sql`. Raw SQL — manually applied with `sqlite3 storage/flowboard.db < docs/migrations/<file>.sql`.

**New Flow API endpoint usage:**
- Add the URL constant + body assembly to `agent/flowboard/services/flow_sdk.py`.
- Call from a worker handler (`agent/flowboard/worker/processor.py`) via `flow_client.api_request(...)` for `aisandbox-pa` (with optional `captchaAction`) or `flow_client.trpc_request(...)` for `labs.google` TRPC.

## Special Directories

**`storage/`:**
- Purpose: SQLite database + cached media bytes.
- Generated: Yes — `flowboard.db` is created at first lifespan startup (`init_db()`); `storage/media/{id}.{ext}` files are cached on demand by `media_service.fetch_and_cache(...)`.
- Committed: No (gitignored).
- Path overridable: `FLOWBOARD_STORAGE`, `FLOWBOARD_DB` env vars.

**`frontend/dist/` and `frontend/node_modules/`:**
- Generated: Yes (`vite build` and `npm install` respectively).
- Committed: No.

**`agent/.venv/`:**
- Generated: Yes (`make install`).
- Committed: No.

**`agent/__pycache__/` (and nested):**
- Generated: Yes (Python bytecode).
- Committed: No.

**`agent/.pytest_cache/`:**
- Generated: Yes.
- Committed: No.

**`extension/_metadata/`:**
- Purpose: Chrome-generated indexed rulesets for `declarativeNetRequest`.
- Generated: Yes — Chrome regenerates these from `rules.json`.
- Committed: Currently yes (the repo tracks the generated indices).

**`.planning/codebase/`:**
- Purpose: GSD codebase-mapping outputs (ARCHITECTURE.md, STRUCTURE.md, etc.).
- Generated: Yes — by `/gsd-map-codebase` runs.
- Committed: Project-policy dependent.

**`.omc/plans/`:**
- Purpose: External-tool phase plans + their archive.
- Committed: Yes.

**`extension.crx` / `extension.pem`:**
- Purpose: Packaged Chrome extension build outputs (`make extension`).
- Generated: Yes.
- Committed: No (in `.gitignore`).

---

*Structure analysis: 2026-06-10*
