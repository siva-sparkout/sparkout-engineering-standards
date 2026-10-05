---
name: nodejs-standard
description: Use when writing, reviewing, or modifying Node.js backend code (Express or NestJS). Enforces the Node.js Coding Standard v2.0 — error contract, correlation IDs, alerting, IDOR prevention, transactions, idempotency, money handling, Web3 verification.
---

# Node.js Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.

## Never

- `findById(id)` on a user-owned record. Scope the query to the caller — see IDOR below.
- A secret with a default fallback. `process.env.X ?? 'dev-secret'` reaches production and nobody notices.
- `process.env` outside `src/config/`. Config is read and validated once at startup; the app fails fast at boot.
- `console.log` outside scripts. It bypasses levels, redaction and log shipping.
- `number` arithmetic on money.
- An empty `catch`, or a `catch` that only logs and continues.
- A floating promise. Every async call is awaited or has a rejection handler.
- Multi-step writes without a transaction.
- A transaction held open across an external API call. The connection is held for the whole remote timeout and the pool drains.
- A service that constructs its own database connection. It leaks, and the failure shows up as unrelated timeouts elsewhere.
- A retried write without an idempotency key. A retried transfer is not a harmless retry.
- Trusting a client-supplied identity, amount, price, role, status or transaction hash.
- Internal error detail, stack traces or driver messages returned to a client.
- HTTP 200 with `{success: false}`.
- Business logic in a controller.

## Always

- Feature-first: `src/modules/<feature>/{controller,service,repository,dto,test}`.
- Controllers do HTTP. Services decide. Repositories touch the database.
- Validate every external input at the boundary with a schema — body, params, query, headers, webhooks.
- One global error handler. Services throw typed errors and never send responses.
- Correlation id on every request, every log line, every outbound call to our own services, and returned on a 500.
- Wire format is camelCase in both directions.
- Verify every inbound webhook signature **before** processing the payload. The URL is not a credential.

## Patterns to copy

**Error contract.** Two kinds of invalid deserve two statuses: 400 malformed, 409 conflicts with current state.

```ts
export class AppError extends Error {
  constructor(readonly code: string, readonly status: number, message: string,
              readonly details?: Record<string, string[]>, readonly cause?: unknown) {
    super(message); this.name = 'AppError';
  }
}
```

**IDOR — the fix is in how you query, not a check you remember to add.**

```ts
const loan = await loanRepository.findById(id);                       // ❌ anyone's loan
const loan = await loanRepository.findByIdForOwner(id, user.id);      // ✅
if (!loan) throw NotFound('LOAN_NOT_FOUND', 'Loan not found');        // 404, not 403
```

Return 404, not 403 — a 403 confirms the record exists.

**Correlation id via AsyncLocalStorage, on every log line for free.**

```ts
const als = new AsyncLocalStorage<{ correlationId: string }>();
export const correlationMiddleware: RequestHandler = (req, res, next) => {
  const id = (req.header('X-Correlation-Id') ?? randomUUID()).slice(0, 64);
  res.setHeader('X-Correlation-Id', id);
  als.run({ correlationId: id }, () => next());
};

export const logger = pino({
  redact: { paths: ['req.headers.authorization', '*.password', '*.token', '*.accessToken',
                    '*.apiKey', '*.secret', '*.privateKey', '*.mnemonic', '*.otp',
                    '*.cvv', '*.cardNumber', '*.aadhaar', '*.pan', '*.ssn', '*.email'],
            censor: '[REDACTED]' },
  mixin: () => ({ correlationId: als.getStore()?.correlationId ?? null }),
});
```

**A log file is not an alert.** Nobody reads log files daily, so an error that only reaches one is an error nobody knows about until a client reports it. These must alert: unhandled exception or crash, failed background/cron job, failed third-party or webhook processing, failed on-chain transaction or stopped listener, database connection loss, auth or payment failures above a threshold. Alerts carry environment, service, correlation id, error code and a short message, are separated by environment, and are rate-limited.

**Transaction and idempotency — the key is written in the same transaction as the work.** Written afterwards, a crash in between leaves the work done and the key missing.

```ts
const existing = await idempotency.find(key);
if (existing) return existing.result;

const result = await db.transaction(async (tx) => {
  const r = await performTransfer(tx, dto);
  await tx.idempotency.create({ data: { key, result: r } });
  return r;
});
```

**Web3 — the chain is the source of truth.** A client can submit someone else's hash, an unconfirmed one, or a fabricated success. Re-fetch from chain and verify sender, recipient, amount and confirmation depth before any state changes.

## Money

`number` is never used for an amount.

| Kind | Type |
|---|---|
| Fiat | `bigint` minor units, serialised as a **string** |
| Token | `bigint` base units, serialised as a string |
| Rates | integer basis points (`250` = 2.5%) |

`JSON.stringify` cannot serialise a `bigint` and `JSON.parse` loses precision on large numbers silently — money crosses the wire as a string. Database columns are `NUMERIC` or an integer type, never `float`. **Rounding direction is decided once, written down, applied in one place** — two developers rounding independently is how a ledger stops balancing.

```ts
const total = parseFloat(a) + parseFloat(b);   // ❌
const fee = amount * 0.025;                    // ❌
const paise = Math.round(rupees * 100);        // ❌ rounds a float that is already wrong
```

## Before you finish

1. Ownership scoped into the query on every user-owned record.
2. No secret with a default; no `process.env` outside `config/`.
3. Multi-step writes in a transaction; no transaction around a remote call.
4. Retryable operations carry an idempotency key.
5. No `number` arithmetic on an amount.
6. Correlation id flows through; nothing sensitive in a log.
7. Does this change need a new alert, and is it wired?

Full reasoning and the complete rule set: **Node.js Coding Standard v2.0**.
