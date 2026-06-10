# Testing Patterns

**Analysis Date:** 2026-06-10

## Test Framework

**Runner:**
- `pytest >= 8.0` (Python) — declared in `agent/pyproject.toml` under `[project.optional-dependencies] dev`.
- `pytest-asyncio >= 0.23` for `@pytest.mark.asyncio` coroutine tests.
- No test runner on the frontend, no test runner on the extension. **Vitest / Jest / Playwright / Cypress are NOT present** in this repo.

**Config:**
- `agent/pyproject.toml` declares `pytest` as a dev dependency but holds **no `[tool.pytest.ini_options]` block** — pytest runs with defaults. Test discovery follows the implicit `tests/test_*.py` convention.
- No `pytest.ini`, no `conftest.py` at repo root. Only `agent/tests/conftest.py` (per-test DB reset + paygate-tier seed + `client` fixture).
- `asyncio_mode` is not pinned, so async tests must use the explicit `@pytest.mark.asyncio` decorator.

**Assertion Library:**
- Plain `assert` only — pytest rewrites them for rich diffs. No `unittest.TestCase`, no third-party assertion helper.

**Run Commands:**

```bash
# From repo root, after `make install-dev`:
cd agent && .venv/bin/pytest                    # Run all backend tests
cd agent && .venv/bin/pytest tests/test_boards.py    # Single file
cd agent && .venv/bin/pytest -k "test_create"        # Filter by name
cd agent && .venv/bin/pytest -v                      # Verbose
cd agent && .venv/bin/pytest -x                      # Stop on first failure

# Lint (separate):
cd agent && .venv/bin/ruff check flowboard
cd frontend && npm run lint     # tsc -b --noEmit
```

No `Makefile` targets for tests — invoke pytest directly. The agent venv must be activated (or use the `.venv/bin/pytest` path) so the in-tree `flowboard` package resolves.

## Test File Organization

**Location:**
- All backend tests live in a single flat directory: `agent/tests/`.
- **No co-located tests** (no `flowboard/services/test_planner.py` style). Tests are physically separated from source.

**Naming:**
- One file per subject module / route group: `test_<subject>.py`.
- Subject = either a service module (`test_planner.py`, `test_claude_cli.py`, `test_flow_client.py`, `test_flow_sdk.py`, `test_prompt_synth.py`, `test_pipeline.py`) or a route prefix (`test_boards.py`, `test_nodes.py`, `test_edges.py`, `test_chat.py`, `test_media.py`, `test_upload.py`, `test_references.py`, `test_requests.py`, `test_vision.py`, `test_activity_routes.py`, `test_llm_routes.py`, `test_auth.py`, `test_ext_callback.py`, `test_board_project.py`).
- Cross-cutting concerns get their own file: `test_validation.py` (Pydantic bounds), `test_project_id_validation.py`, `test_processor_tier_fallback.py`.
- The multi-LLM layer is split: `test_llm_registry.py`, `test_llm_secrets.py`, `test_llm_gemini.py`, `test_llm_openai_dual_mode.py`.

**Structure:**

```
agent/tests/
├── __init__.py                # empty
├── conftest.py                # shared fixtures (DB reset, client, paygate seed)
├── test_activity_routes.py    # 4 tests
├── test_auth.py               # 16 tests
├── test_board_project.py      # 7 tests
├── test_boards.py             # 6 tests
├── test_chat.py               # 9 tests
├── test_claude_cli.py         # 11 tests
├── test_edges.py              # 9 tests
├── test_ext_callback.py       # 6 tests
├── test_flow_client.py        # 8 tests
├── test_flow_sdk.py           # 37 tests
├── test_llm_gemini.py         # 19 tests
├── test_llm_openai_dual_mode.py  # 20 tests
├── test_llm_registry.py       # 10 tests
├── test_llm_routes.py         # 23 tests
├── test_llm_secrets.py        # 20 tests
├── test_media.py              # 13 tests
├── test_nodes.py              # 12 tests
├── test_pipeline.py           # 12 tests
├── test_planner.py            # 11 tests
├── test_processor_tier_fallback.py  # 7 tests
├── test_project_id_validation.py    # 3 tests
├── test_prompt_synth.py       # 28 tests
├── test_references.py         # 9 tests
├── test_requests.py           # 28 tests (982 lines — largest file)
├── test_upload.py             # 25 tests (519 lines)
├── test_validation.py         # 7 tests
└── test_vision.py             # 6 tests
```

**Totals:** ~28 test files, ~410 test functions, ~8 138 lines.

## Test Structure

### Suite Organization

Tests are written as **flat module-level functions**, not classes. Pattern from `agent/tests/test_boards.py`:

```python
def test_create_list_get_board(client):
    r = client.post("/api/boards", json={"name": "Scene 01"})
    assert r.status_code == 200
    board = r.json()
    assert board["name"] == "Scene 01"
    assert isinstance(board["id"], int)

    r = client.get("/api/boards")
    assert r.status_code == 200
    listing = r.json()
    assert any(b["id"] == board["id"] for b in listing)


def test_get_missing_board_returns_404(client):
    r = client.get("/api/boards/999")
    assert r.status_code == 404
```

Conventions:
- Function name reads as a behavioural assertion — `test_<subject>_<expected outcome>`. E.g. `test_get_missing_board_returns_404`, `test_cancel_already_canceled_request_returns_409`, `test_node_type_enum_rejects_unknown`, `test_extract_plan_no_block_returns_none`.
- Each test is independent and self-contained. No shared state across tests within a file — the autouse `_fresh_db` fixture in `conftest.py:22` truncates + recreates the schema between every test.
- Section dividers via unicode box-drawing comments — see `agent/tests/test_llm_routes.py:35`, `agent/tests/test_pipeline.py:33`:

  ```python
  # ── auto_layout ───────────────────────────────────────────────────────────
  ```

### Local helpers

In-file helpers prefixed with `_` build the test fixture data without inventing a separate factory layer:

```python
def _board(client, name="T"):
    return client.post("/api/boards", json={"name": name}).json()

def _make_plan(board_id: int, spec: dict) -> int:
    with get_session() as s:
        plan = Plan(board_id=board_id, spec=spec, status="draft")
        s.add(plan); s.commit(); s.refresh(plan)
        return plan.id  # type: ignore[return-value]
```

See `agent/tests/test_requests.py:9`, `agent/tests/test_validation.py:4`, `agent/tests/test_pipeline.py:19-29`. These are intentionally per-file (sometimes duplicated) — there is no shared `factories.py`.

### Setup / Teardown

Both are handled by autouse fixtures in `agent/tests/conftest.py`:

```python
@pytest.fixture(autouse=True)
def _fresh_db():
    """Drop + recreate all tables before each test so state is isolated."""
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield

@pytest.fixture(autouse=True)
def _seed_default_paygate_tier():
    from flowboard.services.flow_client import flow_client
    flow_client._paygate_tier = "PAYGATE_TIER_ONE"
    yield
    flow_client._paygate_tier = None
```

Tests rarely write their own teardown; the autouse fixtures cover it. Per-test cache resets are local autouse fixtures inside individual test files (e.g. `_reset_provider_caches` in `test_llm_routes.py:25`, `_isolated_secrets` in `test_planner.py:22`).

### Assertion Patterns

- `assert r.status_code == 200, r.text` — append `r.text` for better failure output when status is wrong (see `test_boards.py:92`).
- Compare dicts directly: `assert r.json() == {"deleted": bid}`.
- Spot-check fields: `assert row["status"] == "queued"`, `assert "id" in row`.
- Use `pytest.raises(LLMError)` for expected exceptions.
- `pytest.raises(LLMError, match="No AI provider configured")` for partial message match.

## Mocking

### Framework

- `unittest.mock` — `patch`, `patch.object`, `AsyncMock`, `MagicMock`. No `pytest-mock`, no `mocker` fixture.
- `pytest.MonkeyPatch` (passed in as the `monkeypatch` fixture) used for env-var / attribute patching at module boundaries.

### Patterns

**Patching a module attribute via monkeypatch:**

```python
monkeypatch.setattr("flowboard.services.claude_cli.subprocess.run", _run)
monkeypatch.setattr(
    "flowboard.services.llm.openai.resolve_cli_binary",
    lambda *_a, **_kw: "/fake/bin/codex",
)
```

Seen in `agent/tests/test_claude_cli.py:59-60`, `agent/tests/test_llm_openai_dual_mode.py:49-70`.

**Patching with a stubbed subprocess result (dataclass):**

```python
@dataclass
class _FakeResult:
    returncode: int = 0
    stdout: bytes = b""
    stderr: bytes = b""

def _envelope(result_text: str, is_error: bool = False) -> bytes:
    return json.dumps({"type":"result","result":result_text,"duration_ms":10}).encode()
```

`_FakeResult` and `_envelope` helpers reappear across `test_claude_cli.py`, `test_llm_openai_dual_mode.py`, `test_llm_gemini.py` — copy-paste rather than shared because their shape is provider-specific.

**Async mocking (`AsyncMock`):**

```python
m.return_value.create_project = AsyncMock(side_effect=fake_create)

with patch(
    "flowboard.services.planner.run_llm",
    new=AsyncMock(return_value=provider_response),
):
    ...
```

Seen in `agent/tests/test_board_project.py:22,52,66,85,102`, `agent/tests/test_planner.py:105,145`, `agent/tests/test_llm_routes.py:41-47`.

**Fake collaborators (no library):**

```python
class FakeWs:
    def __init__(self) -> None:
        self.sent: list[dict] = []
    async def send(self, raw: str) -> None:
        self.sent.append(json.loads(raw))

ws = FakeWs()
client.set_extension(ws)
```

See `agent/tests/test_flow_client.py:16-22`. Used when the surface is small enough that a hand-rolled fake is clearer than `MagicMock`.

**Resolve callback futures manually** (no network round-trip):

```python
asyncio.create_task(later_resolve())
result = await client.api_request(url="https://aisandbox-pa.googleapis.com/v1/ping")
```

See `agent/tests/test_flow_client.py:24-49`.

### What to Mock

- **Always mock**: `subprocess.run` (LLM CLIs), `httpx` calls (`httpx.AsyncClient`), the Chrome extension WebSocket, `flow_client.api_request` and any other call that talks to Google Flow / aisandbox-pa.
- **Always mock the planner backend**: `conftest.py:13` forces `FLOWBOARD_PLANNER_BACKEND=mock` globally so no test ever spawns a real `claude` subprocess. Tests that exercise the CLI path patch `claude_cli.subprocess.run` instead.
- **Always isolate secrets**: tests that touch `flowboard.services.llm.secrets` set `FLOWBOARD_SECRETS_PATH=<tmp_path>/secrets.json` via `monkeypatch.setenv` — see `agent/tests/test_llm_openai_dual_mode.py:33-36`, `test_planner.py:22-27`.

### What NOT to Mock

- **Don't mock SQLModel / the DB.** Tests run against a real SQLite file in an isolated temp dir (`FLOWBOARD_STORAGE`, `FLOWBOARD_DB` env vars set in `conftest.py:9-10`). The `_fresh_db` autouse fixture drops + recreates the schema between tests so isolation is structural, not behavioural.
- **Don't mock FastAPI's `TestClient`.** Every route test uses the real `client` fixture (`conftest.py:49`) and exercises the full middleware → router → SQLModel chain.
- **Don't mock Pydantic validation.** Bounds and enum tests in `test_validation.py` assert real `422` responses from FastAPI's automatic validation.

## Fixtures and Factories

### Test Data

No `tests/factories.py` and no `tests/fixtures/` directory. Each test inlines what it needs:

```python
def _make_board(client, name="P") -> dict:
    return client.post("/api/boards", json={"name": name}).json()

b = _make_board(client)
n = client.post("/api/nodes", json={"board_id": b["id"], "type": "image"}).json()
```

Larger setup (e.g. `test_delete_board_cascades_children` in `agent/tests/test_boards.py:42-111`) drops into `with get_session() as s:` and inserts ORM rows directly when going through the HTTP API would be noisy.

### Fixtures

Shared (in `agent/tests/conftest.py`):
- `_fresh_db` — autouse, drops + recreates schema.
- `_seed_default_paygate_tier` — autouse, seeds `flow_client._paygate_tier = "PAYGATE_TIER_ONE"`.
- `client` — `fastapi.testclient.TestClient(app)`.

Per-file fixtures (define inline at top of the test file):
- `tmp_secrets_path` — points `FLOWBOARD_SECRETS_PATH` at `tmp_path / "secrets.json"`. Repeated in `test_llm_routes.py`, `test_llm_openai_dual_mode.py`, `test_llm_gemini.py`, `test_planner.py` (slight variations).
- `_reset_provider_caches` — autouse in `test_llm_routes.py:25`, clears module-level probe singletons.

### Location

- All fixtures: either in `agent/tests/conftest.py` (truly shared) or inline at the top of the consuming test file. Copy-paste over abstraction is the explicit choice.

## Coverage

**Requirements:** None enforced. No `coverage` / `pytest-cov` in `pyproject.toml`, no coverage gate in CI.

**View Coverage:**

```bash
# Not installed — to enable manually:
cd agent && .venv/bin/pip install pytest-cov
cd agent && .venv/bin/pytest --cov=flowboard --cov-report=term-missing
```

Most modules are extensively covered de facto — `services/flow_sdk.py` has 37 tests, `routes/requests.py` has 28, `routes/upload.py` has 25 — but the absence of coverage tooling means there's no machine check.

## Test Types

### Unit Tests

- Single-file unit tests for pure functions and small classes — `test_validation.py` (Pydantic bounds), `test_project_id_validation.py`, `test_planner.py::test_extract_plan_*`, `test_pipeline.py::test_auto_layout_*`.
- LLM provider tests are unit-level — they stub `subprocess.run` and `httpx` so no real CLI / network is touched (`test_claude_cli.py`, `test_llm_gemini.py`, `test_llm_openai_dual_mode.py`).

### Integration Tests

- Most route tests are integration-flavoured: real `TestClient`, real SQLite (temp dir), real FastAPI dependency-injection chain — only the outbound `flow_client.api_request` / `FlowSDK` calls are stubbed.
- `test_pipeline.py` end-to-end-tests the plan → materialize → run → poll loop with the worker's outbound calls stubbed via `AsyncMock` on the SDK.

### E2E Tests

**None.** No Playwright, no Cypress, no browser automation. The frontend has zero automated tests; the Chrome extension has zero automated tests. End-to-end validation is manual:

- `make agent` + `make frontend` + load `extension/` as unpacked in Chrome.
- Manual flow: open dashboard → create board → drop image node → run gen → confirm result viewer.

This is the single largest test-coverage gap (see `.planning/codebase/CONCERNS.md` once written).

## Common Patterns

### Async Testing

```python
import pytest

@pytest.mark.asyncio
async def test_worker_skips_canceled_request(client):
    row = client.post("/api/requests", json={...}).json()
    canceled = client.post(f"/api/requests/{row['id']}/cancel").json()
    assert canceled["status"] == "canceled"

    handler_calls: list[dict] = []
    # ... use asyncio primitives directly
    await asyncio.sleep(0)
```

- Use `@pytest.mark.asyncio` on each coroutine test (pytest-asyncio mode is not set to `auto`).
- `await asyncio.sleep(0)` is the idiom for "yield once so background tasks register" — see `test_flow_client.py:32,71`.

### Error Testing

```python
def test_extract_plan_malformed_json_returns_none():
    raw = "```json\n{not valid json\n```"
    reply, plan = planner._extract_plan(raw)
    assert plan is None
    assert "not valid json" in reply

def test_dispatch_raises_when_unconfigured(tmp_secrets_path):
    with pytest.raises(LLMError, match="No AI provider configured"):
        await run_llm("planner", "hi")
```

- Test the **return value or status code**, not the implementation — most error tests assert `r.status_code == 4xx` from the route, or check that the parsed result is `None` / has the expected error field.
- `pytest.raises(SomeError)` for low-level functions; HTTP routes assert via `TestClient` response status.

### Provider availability shims

Tests routinely patch provider `is_available()` to control the auto-fallback branch:

```python
with patch.object(registry._PROVIDERS["claude"], "is_available", return_value=False):
    resp = client.get("/api/llm/providers")
```

Direct dict access on `registry._PROVIDERS` is the documented backdoor — see `test_llm_routes.py:42-47`.

## CI

**None.** There is no `.github/workflows/` directory. The only GitHub config in the repo is `.github/FUNDING.yml` (sponsor links).

The project relies on manual local runs:
- `cd agent && .venv/bin/pytest` before pushing
- `cd frontend && npm run lint` (which is `tsc -b --noEmit`) before pushing
- `cd frontend && npm run build` to catch Vite build regressions

Adding CI is a real concern — every contributor must remember to run both check chains by hand.

---

*Testing analysis: 2026-06-10*
