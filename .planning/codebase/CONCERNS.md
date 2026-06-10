# Codebase Concerns

**Analysis Date:** 2026-06-10

## Tech Debt

**Oversized monolithic React components:**
- Issue: Two flagship components have grown into 1000+ line monoliths that mix layout, state, network, and per-node-type branching. Same component is re-declaring inner subcomponents (`CharacterBody`, `ImageBody`, etc.) inline, which makes the file the de facto registry for every node type.
- Files:
  - `frontend/src/canvas/NodeCard.tsx` — 1577 lines, multiple inner components per node type, two separate `retryTimerRef` declarations (lines 336, 827) suggest unsplit subcomponents sharing identical logic.
  - `frontend/src/components/GenerationDialog.tsx` — 1365 lines, target type branching (image / video / prompt / storyboard) per-dispatch.
- Impact: High coupling between unrelated node types; bug fixes in one branch cascade across all (5 of the recent `fix(...)` commits touched these two files); Rules-of-Hooks violations are easy to introduce (see fix `05b0496`, `3ba29df`).
- Fix approach: Split per node type (`CharacterCard.tsx`, `ImageCard.tsx`, `VideoCard.tsx`, `PromptCard.tsx`, `StoryboardCard.tsx`) under `frontend/src/canvas/nodes/`. Extract `useRetryTimer` hook so the timer logic lives in one place instead of two. Apply the same split for `GenerationDialog` — each target type becomes its own dialog component sharing a base.

**Oversized Python service modules:**
- Issue: `flow_sdk.py` (1254 lines) holds Flow API contracts, endpoint constants, request body assembly for image/video/upload/poll, response extraction helpers, project-id validation, and module-level singleton — all in one file.
- Files: `agent/flowboard/services/flow_sdk.py`, `agent/flowboard/worker/processor.py` (799 lines), `agent/flowboard/services/prompt_synth.py` (620 lines).
- Impact: Reviewers can't load mental model of a single file; every Flow API contract drift forces edits scattered across this file; the singleton getter at line 1251 means tests have to monkey-patch a module global.
- Fix approach: Split `flow_sdk.py` into `flow_sdk/__init__.py` (public API), `flow_sdk/endpoints.py` (URL constants), `flow_sdk/image.py`, `flow_sdk/video.py`, `flow_sdk/upload.py`, `flow_sdk/poll.py`, `flow_sdk/extract.py` (response parsing). Same treatment for `processor.py` by handler type.

**Type-system escapes scattered across SQLModel queries:**
- Issue: Seven `# type: ignore[attr-defined]` / `[index]` comments cluster around SQLModel `Column.in_()` and nested dict access in Flow response payloads. None of them are wrong, but they indicate a missing typed wrapper.
- Files:
  - `agent/flowboard/routes/llm.py:86` (`provider.mode`)
  - `agent/flowboard/routes/plans.py:59` (`PipelineRun.status.in_(...)`)
  - `agent/flowboard/services/planner.py:80`
  - `agent/flowboard/services/pipeline_executor.py:162, 347, 355`
  - `agent/flowboard/services/flow_sdk.py:1005` (`data["result"]["data"]["json"]["result"]["projectId"]`)
- Impact: When SQLModel or Flow response shapes drift, mypy/pyright silently passes — the type-ignore eats the signal. The Flow projectId path is especially brittle (5 levels deep).
- Fix approach: Wrap the SQLModel `in_` cases behind a typed helper (`where_in(column, ids)`); replace deep dict indexing in `flow_sdk._extract_project_id` with a Pydantic model so the path becomes verified at runtime.

**Multiple "# noqa: BLE001" broad exception suppressions:**
- Issue: 22+ sites swallow `Exception` to keep a worker / handler alive. Some log via `.exception(...)` (good), but several only log via `logger.warning(...)` with a truncated repr.
- Files (selection): `agent/flowboard/worker/processor.py` (8 occurrences: lines 140, 345, 364, 438, 615, 633, 775, 786), `agent/flowboard/services/flow_client.py:169, 293`, `agent/flowboard/services/llm/openai.py:113, 131, 277`.
- Impact: Real Flow contract drift or DB integrity errors get downgraded to a warning row in the log; user sees a generic "failed" badge with no actionable error.
- Fix approach: Replace `except Exception` with the narrowest concrete set per site (`httpx.HTTPError`, `sqlalchemy.exc.IntegrityError`, `KeyError`, etc.). Keep a single top-of-loop `except Exception` only at the worker drain boundary.

**Module-level singletons couple production to test setup:**
- Issue: `flow_client`, `_sdk` (in `flow_sdk.py:1251`), `_worker` (`processor.py:796`), `_available` cache in `claude_cli.py:35` are all module globals reset by ad-hoc `reset_*` helpers.
- Files: `agent/flowboard/services/flow_client.py`, `agent/flowboard/services/flow_sdk.py`, `agent/flowboard/worker/processor.py`, `agent/flowboard/services/claude_cli.py`, `agent/flowboard/services/llm/registry.py`.
- Impact: Test isolation is leaky — order matters. The "reset" hook in `claude_cli.reset_availability_cache()` exists only because of this.
- Fix approach: Move toward a DI-style provider passed via FastAPI `Depends`, or at least centralise lifecycle in `lifespan(app)` and pass instances down rather than reaching into module globals.

## Known Bugs

**Recurring "Rules of Hooks" violations after refactors:**
- Symptoms: Hooks declared inside an `if` branch or after an early `return`, breaking React's invariant. Caught only when the component crashes at runtime in dev.
- Files: `frontend/src/canvas/NodeCard.tsx:573` (comment explains the prior bug), `frontend/src/components/ResultViewer.tsx:91, 411`, `frontend/src/components/GenerationDialog.tsx` (fix `05b0496`).
- Trigger: Editing the giant `NodeCard.tsx` / `GenerationDialog.tsx` files without noticing that an inner subcomponent's hooks need to sit above its early-return.
- Workaround: A comment now warns future editors at each site. Not enforceable.
- Fix: Enable `eslint-plugin-react-hooks` (`react-hooks/rules-of-hooks` rule) in the build — currently there is **no ESLint config** in the frontend (`package.json` shows only `tsc -b --noEmit` for the `lint` script). Without the lint rule these will keep recurring.

**Orphaned "running" requests survive agent restarts only because of a sweep:**
- Symptoms: When the agent process dies mid-generation, the request row stays `status='running'` forever; the UI keeps polling.
- Files: `agent/flowboard/main.py:32-49` (`_recover_orphan_running_requests`).
- Trigger: SIGKILL during a video gen, OS crash, force-reload during dev.
- Workaround: At startup the lifespan handler scans all `running` rows and flips them to `failed` with `error="agent_restart_lost"`. Works, but the user sees a "failed" toast on the next reload instead of a "the agent restarted, retry?" affordance.
- Fix: Distinguish `agent_restart_lost` rows from real failures in the UI — render them as a soft "interrupted" badge with a one-click retry.

**FK-detach dance on node delete:**
- Symptoms: Deleting a node without first detaching its `Request` + `Asset` rows raises an integrity error (`fix d83eb92`); deleting a node from a board that was also referenced as a Flow upload across projects 404s on dispatch (`fix 9095b81`).
- Files: `agent/flowboard/routes/nodes.py:147-160`, `agent/flowboard/routes/boards.py:91-109`.
- Trigger: Drag a node off the canvas; delete an entire board with active in-flight requests.
- Workaround: Manual cascade — each delete handler lists every dependent table and clears it.
- Fix: Add `ondelete="CASCADE"` on the FK columns of `Request`, `Asset`, `Edge`, `PipelineRun`, `PlanRevision`, `BoardFlowProject`, `ChatMessage` — SQLite enforces it (FKs are PRAGMA-enabled at `db/session.py:18`). Re-test the cascade chain matches the manual deletes.

**Front-end `onNodesChange` historically didn't persist deletes:**
- Symptoms: Deleting a node via React-Flow's keyboard handler used to leave it in the DB (`fix d8f9644`).
- Files: `frontend/src/canvas/Board.tsx` (`onNodesChange` callback).
- Trigger: User hits Delete with a node selected (vs right-click → delete which routed through `onNodesDelete`).
- Workaround: Both callbacks now persist. The two code paths can drift again.
- Fix: Centralise persistence in a single `useReactFlowSyncToServer()` hook listening to the canonical node/edge arrays from Zustand, instead of forking on `onNodesChange` vs `onNodesDelete`.

## Security Considerations

**Chrome extension private key committed to repo root:**
- Risk: `extension.pem` is a real RSA private key (`-----BEGIN PRIVATE KEY-----` MIIEvQ…). Anyone with this key can sign and publish a malicious "Flowboard Bridge" update with the same extension ID. `.gitignore` does NOT exclude `*.pem` / `*.crx`.
- Files: `extension.pem`, `extension.crx` (both at repo root).
- Current mitigation: None. Files are untracked per `git status` but `.gitignore` does not protect against a future `git add .`.
- Recommendations:
  1. Add `extension.pem`, `extension.crx`, `*.pem`, `*.crx` to `.gitignore` immediately.
  2. Rotate the key — generate a fresh signing key and rebuild the extension. Treat the existing key as compromised since it lived in plaintext on a dev machine.
  3. Move signing into a release CI job that pulls the key from a secret store (GitHub Actions secret, 1Password, etc.).
  4. Audit `git log --all -- extension.pem` to confirm it was never committed in any branch; if it was, force-push a history rewrite.

**Hardcoded Google Flow public API key (intentional, but document risk):**
- Risk: `_FLOW_API_KEY = "AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY"` is embedded in `flow_client.py:36`. Comment correctly notes this key appears in every Flow web request, so it is not a secret in the cryptographic sense. But it WILL be flagged by every secret-scanner (GitGuardian, GitHub push protection, etc.) and may trigger automated PR blocks.
- Files: `agent/flowboard/services/flow_client.py:36`.
- Current mitigation: Inline comment explaining the rationale.
- Recommendations: Add to `.gitleaks.toml` / `.gitleaksignore` so CI scanners don't false-positive; consider moving the constant to `config.py` next to other Flow endpoint constants for grep-ability.

**CORS `allow_origins=["*"]` with `allow_credentials=True`:**
- Risk: This combination is rejected by the CORS spec and most browsers, but FastAPI passes it through. If a future build of the agent ever binds to a non-loopback interface, any website would be able to drive the local API with the user's session.
- Files: `agent/flowboard/main.py:78-84`.
- Current mitigation: The agent only binds to loopback. The WS server has a hard guard in `main.py:22` that refuses to boot on a non-loopback `WS_HOST`. **No equivalent guard exists for the HTTP server.**
- Recommendations:
  1. Add a matching loopback guard for the HTTP host (mirror the `WS_HOST` check).
  2. Replace `["*"]` with an explicit allowlist (`["http://localhost:5173", "http://127.0.0.1:5173"]`) and drop `allow_credentials=True` unless needed by a specific flow.

**Local API has no per-request auth:**
- Risk: Every route under `/api/*` (43 endpoints) is unauthenticated. The only auth in the codebase is the `X-Callback-Secret` header on `/api/ext/callback` (compared via `hmac.compare_digest`, good). Any process on the loopback interface — including a malicious browser tab via DNS rebinding — can read boards, mutate nodes, kick off generations, and read media bytes.
- Files: `agent/flowboard/routes/*.py` (no `Depends(verify_auth)` patterns anywhere).
- Current mitigation: Loopback-only binding. Acceptable for single-user local-only design (documented as such in `flow_client.py:23`), but worth flagging.
- Recommendations: Add a lightweight CSRF / origin check on mutating routes (POST/PATCH/DELETE), or require a session token issued on first launch and stored in `~/.flowboard/`. Especially important if the project ever ships a network-listening mode.

**Server-Side Request Forgery surface on `/api/upload-url`:**
- Risk: The route fetches an arbitrary user-supplied URL server-side. It validates against `_is_public_host`, but the implementation of that helper determines whether private IPs / `169.254.169.254` (cloud metadata) / `localhost` get blocked.
- Files: `agent/flowboard/routes/upload.py:280-342` (`upload_image_from_url`).
- Current mitigation: `_is_public_host` host check + http(s)-only scheme + 15 s timeout + 200-only response + magic-byte sniff. Good defence-in-depth.
- Recommendations: Confirm `_is_public_host` rejects `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`, `fe80::/10`. Disable `follow_redirects` OR re-validate the post-redirect host (the current 302 chain can dodge the initial host check).

**Bearer token cached in extension `chrome.storage.local`:**
- Risk: `chrome.storage.local.set({ flowKey, ... })` writes the Google OAuth Bearer token to plaintext extension storage. Documented limitation: any other extension on the profile with the `storage` permission can read this.
- Files: `extension/background.js:98, 73`.
- Current mitigation: Comment at `background.js:66-71` acknowledges PII concern for `userInfo` (correctly not persisted), but the token itself is persisted for reconnect convenience.
- Recommendations: Drop the persisted `flowKey` entirely — the extension can re-capture on the next `webRequest` hit. Trades a few seconds of reconnect latency for a real isolation win.

## Performance Bottlenecks

**N+1 query in upstream-edge walk:**
- Problem: For each upstream node feeding a target, the loop calls `session.get(Node, uid)` plus a fresh `select(Edge).where(target_id == uid)` for every grand-parent lookup. A 6-panel storyboard with 4 character references issues ~30 round-trips to SQLite per dispatch.
- Files: `agent/flowboard/services/prompt_synth.py:268-317`.
- Cause: Loop body does per-iteration ORM gets instead of one batched `select(Node).where(Node.id.in_(upstream_ids))`.
- Improvement path: Replace the `for uid in upstream_ids: n = s.get(Node, uid)` with a single bulk fetch; same for the grandparent-edge probe. Expected: ~25× reduction in SQLite round-trips for storyboards.

**No React memoization on hot canvas components:**
- Problem: Ratio of `useMemo`/`useCallback`/`React.memo` to `useState`/`useEffect` is 27 : 170 ≈ 1:6. `NodeCard.tsx` (1577 lines, rendered once per node, often 20+ nodes on a board) does not appear to be wrapped in `React.memo`, and its inner components rebuild every render of the parent canvas.
- Files: `frontend/src/canvas/NodeCard.tsx`, `frontend/src/canvas/Board.tsx`.
- Cause: Zustand re-emits the entire `nodes` array on any node update; each `NodeCard` re-renders even when its own data didn't change.
- Improvement path:
  1. Wrap `NodeCard` in `React.memo` with a custom comparator that diffs `data` + `selected` only.
  2. In `Board.tsx`, ensure `nodeTypes` and the node array selector use stable references (`useShallow` from Zustand).
  3. Hoist `STATUS_COLOR` / `ICON` tables out of the module (already done — good) and ensure inline-defined inner components like `BriefHint` aren't recreated per render.

**Fixed-interval video polling with no exponential backoff:**
- Problem: Worker polls `batchCheckAsyncVideoGenerationStatus` every 10 s for up to 30 cycles (5-min budget) regardless of how long ops typically take. A 4-clip Veo batch with a slow tier fires 30 × 4 = 120 polls.
- Files: `agent/flowboard/worker/processor.py:151-152, 230-249, 534-545`.
- Cause: `VIDEO_POLL_INTERVAL_S = 10.0`, no backoff.
- Improvement path: Switch to exponential backoff starting at 5 s and capped at 30 s; same hard 5-min wall-clock deadline. Reduces poll volume ~60 % on average while keeping P50 completion latency unchanged.

**Per-request token-rotation refetch (already mitigated, watch for regression):**
- Problem: Older versions of the extension emitted `token_captured` on every outbound aisandbox-pa request (dozens per minute during video gen), each one triggering a `/v1/credits` round-trip on the agent side.
- Files: `agent/flowboard/services/flow_client.py:62-67` (60 s dedupe window), `extension/background.js` (`fix d296cb3`).
- Current mitigation: Two layers — extension dedupes on rotation, agent dedupes within 60 s. Good defence-in-depth.
- Risk: A future refactor of either layer can re-introduce the storm; add an integration test that asserts `<=1 credits fetch / 60s` under simulated rotation.

## Fragile Areas

**Storyboard pipeline:**
- Files: `frontend/src/lib/storyboardPrompt.ts`, `agent/flowboard/routes/nodes.py` (Storyboard NodeType literal), `agent/flowboard/services/prompt_synth.py`.
- Why fragile: 8 of the last 50 commits are `fix(storyboard): ...` — template vocabulary leaking medium hints, grid mapping, FE/BE NodeType literal mismatch, double-click handlers, refs not preserved on retry, refs preserved on board reload (`fix 91ac949`). The feature has no end-to-end test that exercises a storyboard from creation → dispatch → retry → board reload.
- Safe modification: Always run a manual storyboard regression after any change to `Node.data` mapping in `boards.py` or `nodes.py`.
- Test coverage: No tests under `agent/tests/` named `test_storyboard_*`. Gaps include grid normalisation, retry refs, NodeType literal acceptance, and JSON-shape stability across the FE/BE boundary.

**Omni Flash video model:**
- Files: `agent/flowboard/services/flow_sdk.py` (`OMNI_FLASH_*`, `gen_video_omni`), `agent/flowboard/worker/processor.py:617+` (workflow-mode polling).
- Why fragile: 4 of the last 50 commits are `fix(omni): ...` — ingredient collection from all upstream edges (`fix 02fdcd6`), inline MP4 byte caching in workflow-mode poll (`fix ddb1c81`), cross-project re-upload before dispatch (`fix 9095b81`), variable duration picker (`fix 85c8958`).
- Safe modification: Run `test_processor_tier_fallback.py`, `test_flow_sdk.py` first; manually validate a multi-ref Omni dispatch with refs from another board.
- Test coverage: Tier fallback covered; cross-project re-upload + workflow-mode poll byte caching are NOT covered.

**LLM CLI subprocess wrappers:**
- Files: `agent/flowboard/services/claude_cli.py`, `agent/flowboard/services/llm/gemini.py`, `agent/flowboard/services/llm/openai.py`, `agent/flowboard/services/llm/cli_utils.py`.
- Why fragile: Recent commits show repeated Windows-vs-POSIX argv parsing surprises (`fix 807efaa` — pipe via stdin), CLI flag drift (`fix d813561` — drop `--system`), timeout calibration (`fix 9697d35`, `f09ee47`, `6f54056`). The CLI surface is not stable across upstream releases.
- Safe modification: When bumping any CLI flag, run on macOS AND Windows. Probe `--help` output before assuming a flag exists (the OpenAI provider does this at `openai.py:120-139`; the Gemini provider should too).
- Test coverage: `test_claude_cli.py`, `test_llm_gemini.py`, `test_llm_openai_dual_mode.py` cover the happy path. No test for "CLI flag absent → fall back gracefully" on Claude.

**Pipeline executor session boundary:**
- Files: `agent/flowboard/services/pipeline_executor.py:330-360`.
- Why fragile: Multi-step pattern of "pull all rows we need before releasing the session" — works only as long as no downstream call needs to lazy-load a relationship. SQLModel detached-instance errors are silent until they aren't.
- Safe modification: Don't reach into `node.data` for related-table fields after the `with s:` block exits.
- Test coverage: `test_pipeline.py` exists but no specific test for detached-instance access patterns.

**Flow API extraction helpers (deeply nested JSON):**
- Files: `agent/flowboard/services/flow_sdk.py:1001-1007` (`_extract_project_id`), `flow_sdk.py:1013+` (`_extract_uploaded_media_id`).
- Why fragile: `data["result"]["data"]["json"]["result"]["projectId"]` — 5-level deep dict access. Each level is a contract point with Google. Google can (and does) drift these silently.
- Safe modification: Run against a fresh Flow account before shipping any update; the test fixtures in `test_flow_sdk.py` will go stale.
- Test coverage: Schema validation tests exist but use frozen fixtures — they won't catch a Google-side rename.

## Scaling Limits

**SQLite single-writer lock:**
- Current capacity: Single-user local agent; not designed for concurrent writers.
- Limit: A second `flowboard agent` process pointed at the same `storage/flowboard.db` will collide on writes (`database is locked`). The DB connection has `check_same_thread=False` so the FastAPI workers + the background generation worker can share the connection, but they still serialize on writes.
- Scaling path: For multi-user the path is Postgres + per-user FK isolation. Project is explicitly single-user (see `flow_client.py:23`), so this is on the "won't fix" side of the line.

**Worker concurrency:**
- Current capacity: Single in-process worker loop (`worker/processor.py`, `get_worker()` singleton at line 796).
- Limit: One generation handler runs at a time per type? Need to check `_process_one` semantics — if it awaits sequentially, a slow Veo poll blocks image gens.
- Scaling path: Per-type queues + per-type concurrency caps. Currently not parameterised.

**Frontend node count:**
- Current capacity: React-Flow scales to hundreds of nodes; Zustand store emits full-array updates on every node change.
- Limit: With the memoization gap noted above, ~50+ nodes on a board will start showing re-render lag during drag.
- Scaling path: Memoize `NodeCard` + use shallow-equality selectors before optimising further.

## Dependencies at Risk

**Pinned floor versions only, no upper bound:**
- Risk: Both `agent/pyproject.toml` (`fastapi>=0.115`, `pydantic>=2.8`, `sqlmodel>=0.0.22`) and `frontend/package.json` (`@xyflow/react: ^12.3.5`, `react: ^18.3.1`, `zustand: ^5.0.0`) use floor-only pins. A `pip install` / `npm install` on a fresh machine 6 months from now may resolve to incompatible majors.
- Impact: Reproducible-build failures, semver-major bugs.
- Migration plan: Either pin upper bounds (`fastapi>=0.115,<0.120`) or rely on the lockfiles (`uv.lock` exists for agent ✓, `package-lock.json` exists for frontend ✓). The lockfiles are present so this is mostly cosmetic, but document the `uv sync` / `npm ci` requirement in CONTRIBUTING.

**SQLModel pre-1.0:**
- Risk: `sqlmodel>=0.0.22` — still 0.0.x, no stable API guarantee. The many `# type: ignore[attr-defined]` for `.in_(...)` calls are exactly the kind of breakage a 0.1.0 bump could introduce.
- Impact: Forced rewrite of every query helper.
- Migration plan: Drop SQLModel for raw SQLAlchemy 2.x (typed `select()`, `mapped_column`) when the type-ignore pile becomes unbearable. The project is small enough (~6 model classes per `db/models.py`) that the rewrite is hours, not days.

**React-Flow major-version exposure:**
- Risk: `@xyflow/react: ^12.3.5` is the namespace rename of react-flow-renderer; v12 → v13 will likely change props on `Node`, `Edge`, callbacks.
- Impact: `Board.tsx`, `NodeCard.tsx`, every callback in the canvas would need adjusting.
- Migration plan: Subscribe to xyflow release notes; the canvas layer is small enough (~600 LOC in `canvas/`) that a contained adapter wrapper is feasible.

## Missing Critical Features

**No linter on the frontend:**
- Problem: `frontend/package.json` defines `"lint": "tsc -b --noEmit"` — that's a type-check, not a linter. There is no ESLint config anywhere in the project (`.eslintrc*`, `eslint.config.*` absent).
- Blocks: Catching Rules-of-Hooks violations at build time, enforcing import order, banning `console.log` in committed code, enforcing exhaustive-deps for `useEffect`. All four of these issues are visible in the recent commit log.

**No frontend test suite:**
- Problem: No `*.test.*` or `*.spec.*` files anywhere under `frontend/src`. Backend has 28 test modules under `agent/tests/`.
- Blocks: Catching regressions in `NodeCard` / `GenerationDialog` / `Board` before they ship. Every fix in the storyboard / dialog / viewer is currently caught only by the developer's manual smoke test.

**No CI workflow visible to gate commits:**
- Problem: `.github/` directory exists but its contents weren't inspected — verify a workflow runs `pytest` + `tsc` on every PR. If absent, the test suite buys nothing because failures land on `main`.
- Blocks: Confidence that `main` is green at any given commit.

**No structured error taxonomy returned to the FE:**
- Problem: `frontend/src/api/client.ts:18-56` (`humanizeBackendError`) translates a fixed list of backend error tokens to user-facing strings via substring matching. The backend has no typed error contract — it returns `{error: "string"}` and the FE pattern-matches.
- Blocks: Adding a new error condition requires touching both layers and remembering to add the FE mapping; missing mappings show raw `paygate_tier_unknown` to the user.

## Test Coverage Gaps

**Frontend coverage: 0 %.**
- What's not tested: All ~25 components, the Zustand stores, the API client, the storyboard prompt builder, the React-Flow canvas wiring.
- Files: Everything under `frontend/src/`.
- Risk: Every UI fix in the last 50 commits could have been caught by a unit test (storyboard grid normalisation, hooks ordering, retry refs preservation).
- Priority: **High** — install Vitest + React Testing Library, target the two monolith components first (`NodeCard`, `GenerationDialog`).

**Storyboard backend logic:**
- What's not tested: NodeType "Storyboard" literal acceptance (introduced `fix a91090b`), storyboard grid mapping in `prompt_synth.py`, refs preservation on retry.
- Files: `agent/flowboard/services/prompt_synth.py`, `agent/flowboard/routes/nodes.py`.
- Risk: 8 recent fixes in this area imply this is the most-edited surface with the least coverage.
- Priority: **High**.

**Omni Flash workflow-mode polling:**
- What's not tested: Inline MP4 byte caching (`fix ddb1c81`), cross-project ref re-upload (`fix 9095b81`).
- Files: `agent/flowboard/worker/processor.py:617+`, `agent/flowboard/services/flow_sdk.py` (omni handlers).
- Risk: Both bugs reached production; both are silent failures (no MP4, or 404 on dispatch) that the user has to report.
- Priority: **High**.

**FK cascade behaviour:**
- What's not tested: Node delete → orphan Request + Asset cleanup (`fix d83eb92`), board delete with active in-flight requests.
- Files: `agent/flowboard/routes/nodes.py`, `agent/flowboard/routes/boards.py`.
- Risk: Integrity errors silently log and leave the DB in an inconsistent state.
- Priority: **Medium** — add a parametrised test that creates a board with each node type + in-flight request, then deletes it.

**LLM CLI fallback paths:**
- What's not tested: Behaviour when the CLI binary is present but a flag is missing; behaviour when `--help` parsing fails.
- Files: `agent/flowboard/services/llm/openai.py:101-139`, `claude_cli.py:42-61`.
- Risk: Silent fallback to a degraded mode without telling the user.
- Priority: **Medium**.

**Extension ⇄ agent handshake:**
- What's not tested: WS reconnect with stale callback secret, token rotation under load, behaviour when the extension's stored `callbackSecret` no longer matches the agent's regenerated one.
- Files: `agent/flowboard/services/flow_client.py` (callback secret), `agent/flowboard/services/ws_server.py`, `extension/background.js`.
- Risk: Silent auth failures look like generic "failed" requests.
- Priority: **Medium**.

---

*Concerns audit: 2026-06-10*
