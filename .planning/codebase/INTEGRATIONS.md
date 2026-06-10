# External Integrations

**Analysis Date:** 2026-06-10

Flowboard is local-first; almost every "external integration" runs through
either the user's own browser session (Chrome extension bridge to Google
Flow) or through subprocess CLIs / a single REST fallback (LLM providers).
There is no managed backend, no cloud auth, no telemetry.

## APIs & External Services

**Google Flow (labs.google) — primary generation backend:**
- Service: Google Flow (`labs.google/fx/tools/flow`) / `aisandbox-pa.googleapis.com`
  - SDK/Client: in-house wrapper `agent/flowboard/services/flow_sdk.py` (FlowSDK) atop `agent/flowboard/services/flow_client.py` (FlowClient WS bridge)
  - Auth: Bearer token captured passively by the Chrome extension from the user's signed-in `labs.google` session; never stored in the agent's DB. Hardcoded public API key `AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY` is appended as `?key=` for `/v1/credits` (`flow_client.py:36`).
  - Auth surface: `Authorization: Bearer <token>` injected per-request by the extension (`extension/background.js`), with `Origin` + `Referer` forced to `https://labs.google` via the DNR ruleset (`extension/rules.json`).
  - Endpoints called (all defined in `agent/flowboard/services/flow_sdk.py`):
    - `POST {base}/v1/projects/{project_id}/flowMedia:batchGenerateImages` — image generation + refine (`gen_image`, `edit_image`)
    - `POST {base}/v1/video:batchAsyncGenerateVideoStartImage` — Veo i2v video (`gen_video`)
    - `POST {base}/v1/video:batchAsyncGenerateVideoReferenceImages` — Omni Flash r2v video (`gen_video_omni`)
    - `POST {base}/v1/video:batchCheckAsyncVideoGenerationStatus` — async op polling (`check_async`)
    - `GET  {base}/v1/media/<media_id>?clientContext.tool=PINHOLE` — workflow-mode (Low Priority) media polling
    - `POST {base}/v1/flow/uploadImage` — user-provided image upload (`upload_image`)
    - `GET  {base}/v1/credits` — paygate tier + SKU + credits resolution; **the only call made server-side from the agent**, all others go through the extension proxy
  - TRPC surface (separate transport, also extension-proxied):
    - `POST https://labs.google/fx/api/trpc/project.createProject`
    - `GET  https://labs.google/fx/api/trpc/project.searchUserProjects`
  - reCAPTCHA: solved inside the Flow tab by the extension before image/video dispatch (`captcha_action: "IMAGE_GENERATION"` / `"VIDEO_GENERATION"`); token injected into `clientContext.recaptchaContext.token`.

**LLM providers (user-selectable, single-provider invariant):**
- Anthropic Claude — `agent/flowboard/services/llm/claude.py` + `agent/flowboard/services/claude_cli.py`
  - Transport: local `claude` CLI subprocess (`--output-format json`); no REST fallback
  - Auth: relies on the user's existing Claude subscription session known to the CLI
- Google Gemini — `agent/flowboard/services/llm/gemini.py`
  - Transport: local `gemini` CLI subprocess (`-p` stdin, `-o json`); pinned to `gemini-2.5-flash`
  - Auth: relies on `gemini login`
  - Concurrency: serialised behind an `asyncio.Semaphore(1)` to avoid 429 `MODEL_CAPACITY_EXHAUSTED`
- OpenAI Codex / GPT — `agent/flowboard/services/llm/openai.py`
  - Dual-mode: prefers `codex` CLI (ChatGPT subscription OAuth); falls back to REST `POST https://api.openai.com/v1/chat/completions` when the CLI is text-only and vision attachments are needed
  - Auth (REST): `Authorization: Bearer <api_key>` read from `~/.flowboard/secrets.json`
  - Default models: `gpt-5` (text), `gpt-4o` (vision); 5 MB attachment cap

**GitHub (release lookup only):**
- Service: GitHub REST API (`api.github.com`)
  - SDK/Client: bare `fetch` in `frontend/src/api/github.ts`
  - Auth: none (unauthenticated public endpoint, 60 req/hr quota)
  - Endpoint: `GET https://api.github.com/repos/crisng95/flowboard/releases/latest`
  - Cache: `sessionStorage` (`flowboard.github.latestRelease.v1`, 1-hour TTL)
  - Used by the in-app "new version available" badge

**Google CDN (media fetch):**
- Service: Google Flow content CDN (`flow-content.google`)
  - Client: agent-side `httpx` (`agent/flowboard/services/media.py`)
  - Auth: none — URLs are GCS signed URLs (signature + expiry in query string) returned by Flow's `batchGenerateImages` / `batchCheckAsync` responses
  - Allowlist: `_ALLOWED_URL_PREFIXES = ("https://flow-content.google/",)` enforced before fetch

**Google OAuth userinfo (extension only):**
- Service: `https://www.googleapis.com/oauth2/v2/userinfo` (or similar)
  - Caller: Chrome extension `background.js` (after capturing a Bearer token, fetches profile)
  - Auth: Bearer token already captured from the Flow tab
  - Output: pushed to the agent over WebSocket as `{type: "user_info", userInfo: {...}}`; agent whitelists fields to `email`, `name`, `picture`, `verified_email` on intake (`flow_client.py:234`)

## Data Storage

**Databases:**
- SQLite (single file) — `storage/flowboard.db`
  - Connection: `agent/flowboard/db/session.py`; `sqlite:///<DB_PATH>` with `check_same_thread=False` and `PRAGMA foreign_keys=ON` enforced via SQLAlchemy connect listener
  - Client/ORM: SQLModel (SQLAlchemy 2 underneath)
  - Path config: `FLOWBOARD_DB` env var → defaults to `<FLOWBOARD_STORAGE>/flowboard.db`
  - Tables (`agent/flowboard/db/models.py`): `Board`, `Node`, `Edge`, `Request`, `Asset`, `MediaProjectMapping`, `Reference`, `ChatMessage`, `Plan`, `PlanRevision`, `PipelineRun`, `BoardFlowProject`
  - Migrations: hand-rolled minimal ALTERs in `db/session.py:init_db()` (`Asset.url` add, `Edge.source_variant_idx` add); otherwise `SQLModel.metadata.create_all`. No Alembic.

**File Storage:**
- Local filesystem only — media cache directory at `<FLOWBOARD_STORAGE>/media/` (`agent/flowboard/services/media.py:MEDIA_CACHE_DIR`)
- Files keyed by `<media_uuid>.<ext>` (mime sniffed from response)
- No cloud object storage

**Caching:**
- In-memory only:
  - `FlowClient` singleton caches Bearer token, paygate tier, SKU, credits, userinfo (`agent/flowboard/services/flow_client.py`)
  - CLI provider `is_available()` probes are TTL-cached (~60 s)
  - Frontend `sessionStorage` for GitHub release lookup
- No Redis / Memcached

## Authentication & Identity

**Auth Provider:**
- Implicit, via the Chrome extension — Flowboard never asks the user to sign in. The extension lives inside the user's authenticated `labs.google` tab and proxies API calls using the in-flight Bearer token. The agent never sees Google credentials beyond a transient cached Bearer used for the `/v1/credits` paygate fetch (cleared on extension disconnect).
- Local LLM API keys are stored at `~/.flowboard/secrets.json` (chmod `0o600`), managed by `agent/flowboard/services/llm/secrets.py` with atomic `tmp + replace` writes.
- A shared `callback_secret` (32 bytes from `secrets.token_urlsafe`) is generated per-agent-process and handed to the extension over WS on connect (`agent/flowboard/services/ws_server.py:25-30`); the extension echoes it in `X-Callback-Secret` on every `/api/ext/callback` POST. Verified with `hmac.compare_digest` in `agent/flowboard/main.py:120`.

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, no Bugsnag, no telemetry SDK
- Errors surfaced inline in the UI via `humanizeBackendError` (`frontend/src/api/client.ts:18`) and logged to the agent's stdout

**Logs:**
- Python `logging` with `INFO` default level — `logging.basicConfig` in `agent/flowboard/main.py:29`
- No structured-log shipping; output goes to the user's terminal (`make agent`)
- Browser DevTools for the frontend and extension service worker

## CI/CD & Deployment

**Hosting:**
- None — Flowboard is a desktop app the user runs locally with `make agent` + `make frontend`. No production server. No deploy target.

**CI Pipeline:**
- No GitHub Actions / CircleCI / GitLab CI workflows configured. `.github/` contains only `FUNDING.yml` (Ko-fi link to `crisnguyen95`).
- Tests run locally via `pytest` from the `agent/` venv.

## Environment Configuration

**Required env vars:**
- None are required — every `os.getenv` in `agent/flowboard/config.py` has a working default. Overrides (`FLOWBOARD_*`) are documented in `STACK.md`.

**Secrets location:**
- LLM API keys: `~/.flowboard/secrets.json` (mode `0o600`, atomic write)
- Google Flow Bearer token: held only in-memory by `FlowClient` (`agent/flowboard/services/flow_client.py:61`); never persisted, never logged in full (only `len()` is logged), wiped on extension WS disconnect
- Extension callback secret: in-memory only, regenerated per agent process; mirrored to `chrome.storage.local` on the extension side (`extension/background.js:13`)
- A `.gitignore` entry at the repo root excludes a local-only `video_model*.md` evidence file that contains raw OAuth Bearer tokens (lines 47-49); these never enter version control.

## Webhooks & Callbacks

**Incoming (to the agent):**
- `POST /api/ext/callback` — sole inbound callback. The Chrome extension POSTs Flow API responses here after performing the authenticated `fetch` inside the browser session. Authenticated by HMAC-compared `X-Callback-Secret` header (`agent/flowboard/main.py:114-134`).
- WebSocket inbound on `ws://127.0.0.1:9223` (`agent/flowboard/services/ws_server.py`) — messages from the extension: `extension_ready`, `token_captured`, `user_info`, `pong`, plus legacy in-band response delivery.

**Outgoing (from the agent):**
- WebSocket → extension: `callback_secret` (handshake), `api_request` (proxied Flow call), `trpc_request` (proxied TRPC call), `logout` notification.
- HTTP → external:
  - `GET https://aisandbox-pa.googleapis.com/v1/credits?key=…` (server-side, paygate tier resolution)
  - `POST https://api.openai.com/v1/chat/completions` (OpenAI REST fallback when CLI is text-only)
  - `GET https://flow-content.google/...` (signed-URL media downloads into the cache)
- No outbound webhooks to third-party services.

---

*Integration audit: 2026-06-10*
