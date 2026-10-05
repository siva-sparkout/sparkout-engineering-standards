---
name: angular-standard
description: Use when writing, reviewing, or modifying Angular code. Enforces the Angular Coding Standard v2.0 — structure, error handling, logging and redaction, auth and secrets, money handling, design tokens and component architecture.
---

# Angular Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
Angular 17+: standalone components, signals, built-in control flow, functional interceptors.

## Never

- `localStorage` / `sessionStorage` for a token or any PII.
- A secret, API key or credential anywhere in the repo — including `environment.ts`. The bundle is public.
- `console.log` outside `core/logging/`. Use `LoggerService`.
- `number` arithmetic on money. See Money below.
- A raw colour, spacing or font-size value in a component. Use tokens from `tokens.css`.
- `any`. Use `unknown` and narrow.
- `.subscribe()` without `takeUntilDestroyed()` or the async pipe. No nested subscribes.
- `HttpClient` in a `*.component.ts`. Components render; services decide.
- `::ng-deep`, `ViewEncapsulation.None`, `!important`, direct DOM access, `NgModule`, `*ngIf`/`*ngFor`.
- `bypassSecurityTrust*` without an `// APPROVED BYPASS` comment naming the input source.
- `catchError(() => of([]))` that hides a real failure as an empty list.
- Mapping `snake_case` to `camelCase` in a feature. Wire format is camelCase; a `snake_case` endpoint is a backend defect.

## Always

- Feature-first structure: `core/`, `shared/`, `features/<name>/{pages,components,services,models}`.
- `ChangeDetectionStrategy.OnPush` on every component. `strict: true` in tsconfig.
- Typed reactive forms; validation in the form definition, not in a `(click)` handler.
- Four states on every async view: **loading, empty, error, success**.
- Environment values from `APP_CONFIG` (runtime `/config.json`), never `environment.prod.ts`.
- Tokens in memory only; session is an httpOnly cookie set by the backend.
- Show the correlation id on the error state.

## Patterns to copy

**Error type — branch on `code`, never on `message`. Never show `message` to a user.**

```ts
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly correlationId: string | null,
    readonly details?: Record<string, string[]>,
  ) { super(code); this.name = 'ApiError'; }
}
```

**One refresh at a time.** Parallel 401s must share a single refresh, or rotation invalidates the rest and the user is logged out at random.

```ts
refreshAccessToken(): Observable<string> {
  if (this.refresh$) return this.refresh$;              // join the running refresh
  this.refresh$ = this.http.post<{accessToken: string}>(url, {}, {
    withCredentials: true, context: skipAuth(),         // or it 401s and recurses
  }).pipe(
    map(r => r.accessToken),
    tap(t => this.store.set(t)),
    finalize(() => { this.refresh$ = null; }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );
  return this.refresh$;
}
```

**Redaction is enforced in code, not in review.**

```ts
const DENY = [/^authorization$/i, /password/i, /token/i, /secret/i, /^otp$/i,
              /apikey/i, /privatekey/i, /mnemonic/i, /^cvv$/i, /cardnumber/i,
              /^aadhaar$/i, /^pan$/i, /^ssn$/i, /^email$/i, /^phone$/i];

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>))
    out[k] = DENY.some(rx => rx.test(k)) ? '[REDACTED]' : redact(v, depth + 1);
  return out;
}
```

**Canonical async view.**

```ts
type ViewState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string; correlationId: string | null }
  | { status: 'ready'; data: T };
```

**Guards are UX, not security.** Every guard has a matching server-side check. The real failure is IDOR — a valid token for user A with user B's id in the URL.

## Money

`number` is never used for an amount. Fiat: `string` in minor units. Tokens: `bigint` base units. Rates: integer basis points. Convert for display only, in a pure pipe. Totals and fees are calculated on the backend.

```ts
const total = parseFloat(a) + parseFloat(b);   // ❌
const fee = amount * 0.025;                    // ❌
```

## Components and UI

Three kinds, and the kind decides what it may contain:

| Kind | Lives in | May inject |
|---|---|---|
| Page | `features/<x>/pages/` | Services, router |
| Feature | `features/<x>/components/` | Nothing |
| Presentational | `shared/components/` | Nothing |

A presentational component that injects a service cannot be reused, tested in isolation, or survive a redesign.

Tailwind is the styling system. Hand-written CSS only in: `tokens.css`, the global layer, third-party overrides. A component never sets its own outer margin — the parent owns spacing via `gap`.

## Before you finish

1. No secret, token or PII in code, logs or the diff.
2. No `number` arithmetic on an amount.
3. Four states handled on every async view.
4. No raw colour/spacing value; tokens only.
5. Subscriptions cleaned up; no `any`.
6. Every new guard has a named server-side counterpart.

Full reasoning and the complete rule set: **Angular Coding Standard v2.0**.
