---
name: python-fastapi-standard
description: Use when writing, reviewing, or modifying Python backend code (FastAPI, SQLModel/SQLAlchemy, Pydantic v2). Enforces the Python Coding Standard v2.0 — async correctness, session lifetime, IDOR prevention, wire format, logging and alerting, money handling.
---

# Python Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
FastAPI · SQLModel/SQLAlchemy · Alembic · Pydantic v2 · Ruff · mypy.

## Never

- **A blocking call inside an `async def`.** It stops the entire event loop — every concurrent request on that worker waits. It does not error and does not log; it shows up as latency nobody can attribute.
- `repo.find_by_id(id)` on a user-owned record. Scope the query to the caller — see IDOR below.
- `os.getenv()` or a hardcoded secret in application code. Everything flows through `app/env.py`.
- A secret with a default fallback. It gets shipped and then forgotten.
- `float` anywhere near money.
- `print()` for diagnostics.
- A bare `except:` or an `except Exception` that swallows the error and returns 200.
- A session or engine constructed inside a service.
- Writing log files from the application. Logs go to stdout; in a container a file disappears on restart.
- Multi-step writes without a transaction; a transaction held open across an external API call.
- A new error JSON shape outside `AppException`.
- A schema inheriting `BaseModel` directly — it emits `snake_case` and breaks the wire contract.
- HTTP 200 with `{"success": false}`.
- Business logic or SQL in a route.

## Always

- Feature-first: `app/modules/<feature>/{route,service,repository,models,schemas,test}`.
- Routes do HTTP. Services decide. Repositories touch the database.
- Validate every external input at the boundary with Pydantic.
- Exception handlers wired once in `main.py`. No raw FastAPI validation detail reaches a client.
- Correlation id via `contextvars`, on every log line, forwarded on outbound calls, returned on a 500.
- `db` injected via `Depends(get_session)`; one session for the whole request.
- Alembic is the only path for schema changes.

## Patterns to copy

**Wire format — Python converts, because its internal convention differs from the wire.**

```python
class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

class LoanResponse(ApiModel):
    principal_minor: str      # serialises as "principalMinor"
```

Every request and response schema inherits `ApiModel`.

**Async correctness — the most common and least visible defect in a FastAPI service.**

```python
# ❌ each of these blocks the loop for every request on this worker
data = requests.get(url).json()          # blocking HTTP
rows = pd.read_csv(path)                 # blocking file IO
time.sleep(2)                            # blocking sleep
hashed = bcrypt.hashpw(pw, salt)         # CPU-bound

# ✅ async libraries where they exist
async with httpx.AsyncClient() as client:
    data = (await client.get(url, timeout=10)).json()

# ✅ a threadpool where they do not
hashed = await run_in_threadpool(bcrypt.hashpw, pw, salt)
```

A route declared `def` rather than `async def` is run in a threadpool by FastAPI automatically. For an unavoidably blocking handler, `def` is correct and safer than an `async def` full of blocking calls. Use `asyncpg` with async routes — a synchronous driver blocks the loop on every query.

**IDOR — the fix is in how you query.**

```python
loan = await repo.find_by_id(loan_id)                          # ❌
loan = await repo.find_by_id_for_owner(loan_id, user.id)       # ✅
if loan is None:
    raise AppException(AppError.LOAN_NOT_FOUND, f"Loan {loan_id} not found")   # 404, not 403
```

**Session lifetime — the route owns it, the service receives it.**

```python
async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session            # closed on the way out, even on an exception

@router.post("/loans/{loan_id}/settle")
async def settle(loan_id: str, db: Annotated[AsyncSession, Depends(get_session)], ...):
    return await LoanService(db).settle(loan_id, current_user)
```

**Redaction enforced in code.**

```python
DENY = {"authorization", "password", "secret", "token", "access_token", "refresh_token",
        "api_key", "private_key", "mnemonic", "otp", "pin", "cvv", "card_number",
        "aadhaar", "pan", "ssn", "email", "phone"}

def redact(value, depth=0):
    if depth > 6: return "[TRUNCATED]"
    if isinstance(value, dict):
        return {k: ("[REDACTED]" if k.lower() in DENY else redact(v, depth+1)) for k, v in value.items()}
    if isinstance(value, (list, tuple)): return [redact(v, depth+1) for v in value]
    return value
```

**Config fails fast at boot, not at 2 a.m. on a code path nobody exercised.**

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="forbid")   # a typo fails at boot
    DATABASE_URL: PostgresDsn
    JWT_SECRET: str = Field(min_length=32)      # no default
```

**A log line is not an alert.** These must alert: unhandled exception, failed background or scheduled job, failed third-party or webhook processing, database connection loss or pool exhaustion, auth or payment failures above a threshold. Alerts carry environment, service, correlation id and error code, are separated by environment, and are rate-limited.

## Money

`float` never touches an amount.

| Kind | Type |
|---|---|
| Fiat | `int` minor units, serialised as `str` |
| Token | `int` base units, serialised as `str` |
| Rates | integer basis points |
| Division | `Decimal` with an explicit context |

```python
def apply_bps(amount: int, bps: int) -> int:
    return amount * bps // 10_000          # integer arithmetic throughout
```

Pydantic types money as `str`, never `float`. Columns are `NUMERIC` or `BIGINT`. **Rounding direction is decided once and applied in one place.**

## Testing

Unit tests required for: money and amount calculations, date and schedule logic, state-transition rules, shared utilities. Repository tests run against PostgreSQL via Testcontainers, not SQLite — SQLite accepts queries Postgres rejects, so a green SQLite test proves nothing.

## Before you finish

1. No blocking call in an `async def`.
2. Ownership scoped into the query on every user-owned record.
3. Schema inherits `ApiModel`; wire stays camelCase.
4. `db` injected, not constructed; one session per request.
5. No `float` near an amount.
6. Model change ships with an Alembic migration and a rollback plan.
7. Nothing sensitive in a log; `settings.X` used, never `os.getenv()`.

Full reasoning and the complete rule set: **Python Coding Standard v2.0**.
