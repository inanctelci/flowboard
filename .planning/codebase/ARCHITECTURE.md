<!-- refreshed: 2026-06-10 -->
# Architecture

**Analysis Date:** 2026-06-10

## System Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite SPA :5173)                       │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────┐ │
│  │   Board      │ │ NodeCard     │ │ Generation   │ │ ResultViewer  │ │
│  │ (React-Flow) │ │ (per-node UI)│ │ Dialog       │ │ (overlay)     │ │
│  │ `Board.tsx`  │ │`NodeCard.tsx`│ │              │ │               │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────┬───────┘ │
│         │                │                 │                  │         │
│         └────────────────┴─────────────────┴──────────────────┘         │
│                                  │                                      │
│                          ┌───────▼────────┐                             │
│                          │ Zustand stores │ board / generation /        │
│                          │                │ references / settings /     │
│                          │ `src/store/`   │ chat / pipeline             │
│                          └───────┬────────┘                             │
│                                  │                                      │
│                          ┌───────▼────────┐                             │
│                          │  api/client.ts │  fetch wrapper (/api/*)     │
│                          └───────┬────────┘                             │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │ HTTP (proxied through Vite in dev)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      AGENT (FastAPI :8101) — Python                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  routes/  → REST surface (boards, nodes, edges, requests,       │  │
│  │              media, upload, references, plans, chat, llm,       │  │
│  │              auth, activity, prompt, vision, projects,          │  │
│  │              flow_projects)                                     │  │
│  └────────────────────┬────────────────────────────────────────────┘  │
│                       │ enqueue                                         │
│              ┌────────▼─────────┐                                       │
│              │  WorkerController│  single-consumer asyncio.Queue        │
│              │ `worker/         │  per-type handlers: gen_image /       │
│              │  processor.py`   │  gen_video / gen_video_omni /         │
│              └────────┬─────────┘  edit_image / create_project / proxy │
│                       │ handler call                                    │
│              ┌────────▼─────────┐                                       │
│              │  services/       │  flow_sdk, flow_client, media,        │
│              │                  │  media_project_sync, prompt_synth,    │
│              │                  │  vision, planner, pipeline_executor,  │
│              │                  │  activity, events, llm/, claude_cli   │
│              └────────┬─────────┘                                       │
│                       │ FlowClient.api_request / trpc_request           │
│              ┌────────▼─────────┐                                       │
│              │  flow_client     │  ws_server (asyncio.Future-keyed      │
│              │ (singleton)      │  pending dict, resolved by HTTP       │
│              │                  │  callback `/api/ext/callback`)        │
│              └────────┬─────────┘                                       │
│                       │                                                 │
│              ┌────────▼─────────┐         ┌─────────────────────┐      │
│              │  ws_server :9223 │         │ db/ (SQLModel +     │      │
│              │ (loopback only)  │         │ SQLite)             │      │
│              └────────┬─────────┘         │ storage/flowboard.db│      │
│                       │ WS                └─────────────────────┘      │
└───────────────────────┼─────────────────────────────────────────────────┘
                        │ WebSocket (extension is the WS client)
                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                CHROME MV3 EXTENSION (background service worker)         │
│                                                                         │
│  background.js — WS client → :9223 + HTTP callback poster               │
│  content.js / injected.js — reCAPTCHA solver (MAIN world, labs.google)  │
│  Captures Bearer token via webRequest / declarativeNetRequest           │
│  Proxies fetch() in browser session → aisandbox-pa / labs.google TRPC   │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │ authenticated fetch (user's labs.google session)
                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                GOOGLE FLOW (labs.google + aisandbox-pa.googleapis.com)  │
│  REST: /v1/video:batchAsyncGenerateVideoStartImage                      │
│        /v1/video:batchAsyncGenerateVideoReferenceImages  (Omni Flash)   │
│        /v1/video:batchCheckAsyncVideoGenerationStatus                   │
│        /v1/flow/uploadImage    /v1/media/{id}    /v1/credits            │
│  TRPC: project.createProject   project.searchUserProjects               │
│  CDN:  https://flow-content.google/  (signed fifeUrl images / videos)   │
└────────────────────────────────────────────────────────────────────────┘
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

**Overall:** Three-tier polyglot monorepo with a browser-extension bridge.

**Key Characteristics:**
- Local-first / single-user: SQLite + on-disk media cache live under `storage/`; agent binds to `127.0.0.1` only.
- Bring-your-own-auth: the agent has no credentials — every Google Flow call is round-tripped through the Chrome extension which fetches inside the user's authenticated `labs.google` session.
- DAG-of-nodes domain model: a Board owns Nodes (character / image / video / prompt / note / visual_asset / Storyboard) connected by Edges; downstream nodes pull `mediaIds` from upstream as `IMAGE_INPUT_TYPE_REFERENCE` at dispatch time.
- Async work queue: every long-running operation (gen_image / gen_video / gen_video_omni / edit_image / proxy / create_project) is a `Request` row drained by a single asyncio-queue worker; the frontend polls `GET /api/requests/{id}` until terminal status.
- WebSocket request/callback split: agent sends `api_request` over WS to the extension (assigns a UUID), extension performs the fetch in browser context and POSTs the response to `/api/ext/callback` with an HMAC-compared secret — the agent resolves the pending `asyncio.Future` by id.

## Layers

**Presentation (Frontend SPA):**
- Purpose: render the board canvas + all dialogs/overlays/panels and own optimistic UI state.
- Location: `frontend/src/`
- Contains: ReactFlow canvas (`canvas/`), per-feature components (`components/`), Zustand stores (`store/`), API client (`api/`), pure helpers (`lib/`), enum tables (`constants/`).
- Depends on: `@xyflow/react`, `react`, `zustand` (only — see `frontend/package.json`).
- Used by: developers + end-user browser at `http://localhost:5173`.

**REST API (FastAPI routers):**
- Purpose: typed surface for the frontend — boards, nodes, edges, requests, media bytes, uploads, references, plans, chat, LLM config, auth, activity, prompt synth, vision, projects.
- Location: `agent/flowboard/routes/`
- Contains: one router module per resource; each owns Pydantic models + handlers.
- Depends on: `db/` for persistence, `services/` for cross-cutting logic, `worker/` for enqueue.
- Used by: frontend `api/client.ts` (HTTP) + the extension's `/api/ext/callback` HTTP poster.

**Domain services:**
- Purpose: business logic that is too big or shared to live in a route module.
- Location: `agent/flowboard/services/`
- Contains: `flow_client` (WS bridge singleton), `flow_sdk` (Flow request bodies + endpoint URLs), `media` + `media_project_sync` (local cache + cross-project re-upload), `prompt_synth` / `vision` / `planner` (LLM-driven), `pipeline_executor` (Plan → run), `activity` (request-feed wrapper), `events` (per-board pub/sub), `llm/` (provider registry + Claude/Gemini/OpenAI implementations), `claude_cli` (subprocess wrapper), `ws_server` (extension socket).
- Depends on: `db/`, `config`, third-party (`httpx`, `websockets`).
- Used by: routes + worker handlers.

**Worker:**
- Purpose: drain the `Request` queue with per-type handlers; persist `result` / `status` / `error` back to the DB; honour cancel mid-poll.
- Location: `agent/flowboard/worker/processor.py`
- Contains: `WorkerController` (single asyncio queue) + 6 handlers (`proxy`, `create_project`, `gen_image`, `gen_video`, `gen_video_omni`, `edit_image`).
- Depends on: `services/flow_sdk`, `services/flow_client`, `services/media`, `services/media_project_sync`, `db/`.
- Used by: routes call `get_worker().enqueue(rid)` after persisting a queued row.

**Data:**
- Purpose: persist boards, nodes, edges, requests, assets, references, chat, plans, pipeline runs, board↔flow_project bindings, cross-project media-id mappings.
- Location: `agent/flowboard/db/`
- Contains: `models.py` (every SQLModel table), `session.py` (engine + targeted migration + `get_session()` ctx).
- Depends on: `sqlmodel`, `sqlalchemy`.
- Used by: routes + services + worker.

**Extension bridge:**
- Purpose: be the only piece that holds a Google `labs.google` session — capture the Bearer token, solve reCAPTCHA in MAIN world, perform authenticated fetches against `aisandbox-pa.googleapis.com` + `labs.google` TRPC, POST results back over HTTP.
- Location: `extension/`
- Contains: `manifest.json` (MV3), `background.js` (WS client + fetch proxy), `content.js` (script injector + captcha message relay), `injected.js` (MAIN-world reCAPTCHA caller), `rules.json` (DNR), `popup.html` / `popup.js` (status UI).
- Depends on: Chrome extension APIs (`tabs`, `scripting`, `webRequest`, `declarativeNetRequest`, `storage`, `alarms`).
- Used by: the agent's `flow_client.api_request()` / `flow_client.trpc_request()`.

## Data Flow

### Primary Request Path — image generation (`kind="image"`)

1. User clicks Generate in the dialog (`frontend/src/components/GenerationDialog.tsx`).
2. Store dispatches `dispatchGeneration(rfId, {prompt, ...})` (`frontend/src/store/generation.ts:147`).
3. Store walks upstream edges to collect ref `mediaIds` via `collectUpstreamRefMediaIds` (`frontend/src/store/generation.ts:74`) — honouring `edge.data.sourceVariantIdx` pins.
4. Store calls `createRequest({type: "gen_image", node_id, params: {prompt, project_id, aspect_ratio, paygate_tier, variant_count, ref_media_ids, prompts?, image_model}})` (`frontend/src/api/client.ts`).
5. `POST /api/requests` writes a `Request(status="queued")` row and calls `get_worker().enqueue(rid)` (`agent/flowboard/routes/requests.py:20`).
6. WorkerController pops the rid, flips status → `running`, dispatches to `_handle_gen_image` (`agent/flowboard/worker/processor.py:705`).
7. Handler calls `FlowSDK.gen_image(...)` which assembles the body and calls `flow_client.api_request(url, ...captchaAction=IMAGE_GENERATION)` (`agent/flowboard/services/flow_sdk.py`).
8. `FlowClient._send` assigns a UUID, registers an `asyncio.Future` in `_pending`, sends `{id, method:"api_request", params}` over WS to the extension (`agent/flowboard/services/flow_client.py:297`).
9. Extension `background.js` performs `fetch(url, Authorization: Bearer <token>)` in browser context (after solving reCAPTCHA via `content.js`→`injected.js`), then `POST /api/ext/callback` with `X-Callback-Secret` and `{id, status, body}`.
10. `ext_callback` validates the secret (HMAC compare), calls `flow_client.resolve_callback(payload)` which resolves the pending future (`agent/flowboard/main.py:114`).
11. Handler reads response, ingests any `fifeUrl` entries into the local cache via `media_service.ingest_urls(...)`, returns `(result_dict, None)`.
12. Worker writes `result`, `status="done"`, `finished_at` to the row (`agent/flowboard/worker/processor.py:749`).
13. Frontend `scheduleNextPoll` (1.5 s interval) sees `status="done"`, extracts `media_ids[]`, calls `updateNodeData(rfId, {mediaId, mediaIds, ...})` and PATCHes the node (`frontend/src/store/generation.ts:317`).
14. NodeCard re-renders; `<img src={mediaUrl(mediaId)}>` triggers `GET /media/{mediaId}` which serves from `storage/media/{id}.{ext}` or one-shot-fetches the signed GCS URL on cache miss (`agent/flowboard/routes/media.py:22`).

### Video Generation Flow (Veo i2v + Omni Flash r2v)

1. Same dispatch path as image, but `type="gen_video"` (Veo) or `type="gen_video_omni"` (`frontend/src/store/generation.ts:202`).
2. Worker handler issues the dispatch then **polls** Flow's `batchCheckAsync` endpoint every 10 s for up to 30 cycles (5 min budget) via `FlowSDK.check_async(op_names, workflows=...)` (`agent/flowboard/worker/processor.py:244`).
3. Per-op resolution: each operation in the batch resolves independently (success / content-filter rejection / timeout) — partial successes are preserved rather than collapsing the whole row to `failed`.
4. Workflow-mode (low-priority queue) deliveries arrive as inline base64 MP4 on `/v1/media/{id}` — ingested via `media_service.ingest_inline_bytes` (`agent/flowboard/worker/processor.py:358`).
5. Omni Flash additionally calls `ensure_media_ids_in_project()` to re-upload any cross-project refs (and cache the mapping in the `MediaProjectMapping` table) before dispatch (`agent/flowboard/services/media_project_sync.py`).
6. Between polls handler calls `_is_request_canceled(rid)` so the user-cancel endpoint can break the loop (`agent/flowboard/worker/processor.py:155`).

### Board Bootstrap

1. `App.tsx:useEffect` calls `loadInitialBoard()` once on mount.
2. Store hits `GET /api/boards`; if empty, `POST /api/boards` creates "Untitled".
3. `GET /api/boards/{id}` returns `{board, nodes, edges}`; store maps to ReactFlow shape (`frontend/src/store/board.ts`).
4. On first generation, `ensureProjectId()` → `POST /api/boards/{id}/project` → `FlowSDK.create_project(name)` over TRPC, persists `BoardFlowProject(board_id, flow_project_id)` (`agent/flowboard/routes/projects.py:34`).

### Chat → Plan → Pipeline (currently disabled in App.tsx but wired end-to-end)

1. `POST /api/chat` persists user message, calls `generate_plan_reply()` which routes to the configured Planner provider via `run_llm("planner", ...)` (`agent/flowboard/routes/chat.py:25`).
2. Reply may include a JSON plan-spec → persisted as a `Plan(status="draft")` row.
3. `POST /api/plans/{id}/run` → `materialize_plan` writes Node + Edge rows with auto-layout, `run_pipeline` walks the DAG topologically and enqueues a Request per node, threading upstream media ids forward (`agent/flowboard/services/pipeline_executor.py`).

**State Management:**
- Frontend: Zustand stores in `frontend/src/store/` — one per concern (`board`, `generation`, `references`, `settings`, `chat`, `pipeline`).
- Backend: SQLite via SQLModel `get_session()` context manager (`agent/flowboard/db/session.py`). Session is opened per route handler / worker step; never long-lived. Long-running handlers explicitly release the session during the RPC and re-open afterwards to update the row.
- In-memory singletons: `FlowClient` (`flow_client`), `WorkerController` (`get_worker()`), `BoardBus` (`board_bus`) — all module-level.

## Key Abstractions

**Board:**
- Purpose: top-level container for one canvas; 1:1 with a Google Flow `project_id`.
- Examples: `agent/flowboard/db/models.py:12` (`Board`), `frontend/src/store/board.ts`
- Pattern: Each Board has a `BoardFlowProject` binding row (separate table so the Board schema doesn't change when Flow rotates the project id).

**Node (DAG vertex):**
- Purpose: one of 7 typed cards on the canvas; `data` is a free-form JSON blob shallow-merged on PATCH.
- Examples: `agent/flowboard/db/models.py:18` (`Node`), `frontend/src/store/board.ts:31` (`FlowboardNodeData`).
- Pattern: Backend stores `type` as a string literal; frontend casts to `NodeType` union. Storyboard is a thin wrapper over `image` — same backend treatment, frontend uses `lib/storyboardPrompt.ts` to compose the prompt.

**Edge (DAG arrow) with variant pin:**
- Purpose: direct one upstream `mediaId` (or a specific variant) into a downstream node as `IMAGE_INPUT_TYPE_REFERENCE`.
- Examples: `agent/flowboard/db/models.py:32` (`Edge.source_variant_idx`), `frontend/src/canvas/VariantEdge.tsx`.
- Pattern: `source_variant_idx` is per-edge (not per-source) because each Flow API call binds one input — pinning lets the user route variant 2 to downstream A and variant 3 to downstream B with two clicks.

**Request (work unit):**
- Purpose: every async operation is a Request row; status transitions are the single contract between worker and UI poller.
- Examples: `agent/flowboard/db/models.py:52` (`Request`), `agent/flowboard/worker/processor.py:705` (`_process_one`).
- Pattern: Statuses are `queued | running | done | failed | timeout | canceled`. `timeout` is distinct from `failed` so the UI can render the 5-min video budget exhaustion differently. Cancellation is cooperative — long handlers re-check the row between polls.

**Asset (cache index):**
- Purpose: per-media-id row tracking signed URL + local cache path.
- Examples: `agent/flowboard/db/models.py:64` (`Asset`), `agent/flowboard/services/media.py`.
- Pattern: Upsert on `uuid_media_id` (unique); cache files in `storage/media/{id}.{ext}` are owned by Asset and survive Reference deletes.

**Reference (user-curated saved media):**
- Purpose: cross-board reusable media — snapshot of media_id + label + kind + ai_brief + aspect_ratio.
- Examples: `agent/flowboard/db/models.py:108` (`Reference`), `frontend/src/components/ReferencesPanel.tsx`.
- Pattern: Distinct from Asset (auto-managed) — references are user-curated CRUD, kinds = `image | character | visual_asset | storyboard_shot`.

**Plan (chat-proposed pipeline):**
- Purpose: planner's JSON spec (`nodes[]`, `edges[]`, `layout_hint`) that can be materialised onto the canvas + executed.
- Examples: `agent/flowboard/db/models.py:140` (`Plan`), `agent/flowboard/services/pipeline_executor.py`.

**FlowClient + FlowSDK split:**
- Purpose: separation of *transport* (WS-pending-future correlation, callback secret) from *protocol* (request-body assembly, endpoint URLs).
- Examples: `agent/flowboard/services/flow_client.py:45` (`FlowClient`), `agent/flowboard/services/flow_sdk.py`.

**LLM provider registry:**
- Purpose: feature-routed dispatch (`auto_prompt` / `vision` / `planner` → `claude` / `gemini` / `openai`).
- Examples: `agent/flowboard/services/llm/registry.py:49` (`run_llm`).

## Entry Points

**Agent FastAPI app:**
- Location: `agent/flowboard/main.py:76` (`app = FastAPI(... lifespan=lifespan)`)
- Triggers: `uvicorn flowboard.main:app --reload --port 8101` (see `Makefile:agent`).
- Responsibilities: register CORS middleware + every router; lifespan opens DB / recovers orphan `running` requests / starts the WS server task + worker task.

**WS server (extension bridge):**
- Location: `agent/flowboard/services/ws_server.py:50` (`run_ws_server`)
- Triggers: spawned as an asyncio task in the app lifespan; listens on `ws://127.0.0.1:9223`.
- Responsibilities: accept the single extension connection, send the callback secret on connect, route inbound messages through `flow_client.handle_message`.

**Worker:**
- Location: `agent/flowboard/worker/processor.py:676` (`WorkerController.start`)
- Triggers: spawned as an asyncio task in the app lifespan.
- Responsibilities: drain `asyncio.Queue[int]` of request ids, dispatch to per-type handler, persist result.

**Frontend SPA:**
- Location: `frontend/src/main.tsx`, mounted to `#root` from `frontend/index.html`.
- Triggers: `npm run dev` (Vite on `:5173`, proxies `/api` + `/media` + `/ws` to `:8101`).
- Responsibilities: render `<App />`, kick `loadInitialBoard` + `loadReferences` once.

**Chrome extension service worker:**
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

**What happens:** Earlier code patched `node.data` by sending the full object on every update, dropping any sibling field the caller forgot to list (`aspectRatio`, `aiBrief`).
**Why it's wrong:** Caused a real data-loss regression — auto-brief patches wiped `aspectRatio` on every image gen.
**Do this instead:** PATCH only deltas; backend shallow-merges (`agent/flowboard/routes/nodes.py:75`). Use `null` as the explicit delete sentinel — `undefined` gets dropped by `JSON.stringify` and leaves the stale value in place.

### Silent paygate-tier default

**What happens:** Worker used to default missing tier to `PAYGATE_TIER_ONE`. The wrong value then got stamped into `request.params`, polluting the DB; the next `/api/auth/me` read the polluted row and reported Pro forever — even for Ultra users.
**Why it's wrong:** Ultra users got dispatched at the Pro checkpoint; the bug was self-reinforcing once a wrong tier landed in any row.
**Do this instead:** Fail loud with `paygate_tier_unknown` (`agent/flowboard/worker/processor.py:92`). Frontend pre-flights tier and surfaces an "Open Flow once" banner instead of dispatching (`frontend/src/store/generation.ts:167`).

### `cd <current-directory>` before `git` / shell utilities

**What happens:** Long bash chains prepending a `cd` to a `git` command.
**Why it's wrong:** Triggers an unnecessary permission prompt; `git` already operates on the cwd.
**Do this instead:** Use absolute paths and let the harness manage cwd.

### Re-emitting `token_captured` on every outbound request

**What happens:** Old extension versions emit `token_captured` on every aisandbox-pa request, triggering one `/v1/credits` fetch per emit (dozens per minute during video gen).
**Why it's wrong:** Spams Google's credits endpoint and burns the rate-limit budget.
**Do this instead:** Agent dedupes via `_last_tier_fetch_at` with a 60 s minimum interval (`agent/flowboard/services/flow_client.py:213`). Newer extensions only emit on rotation.

### Collapsing partial-batch failures to `failed`

**What happens:** Earlier video poll broke the whole loop on the first per-op error, turning a 4-variant gen into a hard failure even when 3/4 clips rendered successfully.
**Why it's wrong:** Lost user value — succeeded variants were thrown away.
**Do this instead:** Per-op resolution — each op terminates independently, results aggregated as positional `media_ids` + `slot_errors[]` so the UI can render filter reasons on blocked tiles (`agent/flowboard/worker/processor.py:269`).

## Error Handling

**Strategy:** Errors surface as either an `HTTPException` from a route, a string error code on a Request row (`error` field), or a humanised banner from the frontend's `humanizeBackendError()` translator (`frontend/src/api/client.ts:18`).

**Patterns:**
- Routes raise `HTTPException(status_code, detail=...)`; FastAPI serialises to JSON.
- Worker handlers return `(result_dict, error_or_None)` tuples — never raise. Exceptions caught by `_process_one` and stamped onto the row.
- `flow_client._send` returns `{"error": "..."}` rather than raising — keeps the protocol consistent across timeout / disconnect / explicit error.
- Special statuses: `timeout` (video poll exhaustion, distinct from `failed`), `canceled` (cooperative user-initiated cancel — late-arriving results don't overwrite it).
- Frontend caps consecutive poll failures at `MAX_NETWORK_RETRIES = 8` so a dead agent can't keep a poll alive forever.

## Cross-Cutting Concerns

**Logging:** stdlib `logging` with format `%(asctime)s [%(levelname)s] %(name)s: %(message)s`, level INFO. Configured once in `agent/flowboard/main.py:29`. Never logs Bearer tokens or callback secret values.

**Validation:** Pydantic models per route (`BaseModel` + `Field` constraints). Defence-in-depth allowlists in `worker/processor.py:30` (`_ALLOWED_URL_PREFIXES`) and `services/media.py:36` (`_ALLOWED_URL_PREFIXES`). `is_valid_project_id`, `is_valid_media_id` regex gates in `services/flow_sdk.py` / `services/media.py`.

**Authentication:**
- Frontend ↔ agent: none (localhost only).
- Agent ↔ extension: HMAC-compared `X-Callback-Secret` header on `/api/ext/callback` (`agent/flowboard/main.py:114`). WS server itself is unauthenticated (loopback-only guard at boot).
- Agent ↔ Flow: no creds; the extension holds the Google session and is the only thing that can fetch `aisandbox-pa.googleapis.com` / `labs.google` TRPC.
- LLM providers: per-provider API keys persisted via `agent/flowboard/services/llm/secrets.py`; written through `PUT /api/llm/providers/{name}` only, never echoed back.

**Activity feed:** Every LLM call + upload + worker request is a `Request` row. Worker rows are written directly; LLM / upload paths wrap their op in `async with record_activity(...)` (`agent/flowboard/services/activity.py`). `GET /api/activity` is a read-only projection.

**Event bus:** `BoardBus` (`agent/flowboard/services/events.py`) is a per-board asyncio.Queue fan-out — used for live updates, though most surfaces still poll today.

---

*Architecture analysis: 2026-06-10*
