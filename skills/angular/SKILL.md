---
name: angular-standard
description: >-
  Use when writing, reviewing, or modifying Angular code. Enforces the Angular
  Coding Standard v2.0 — structure, error handling, logging and redaction, auth
  and secrets, money handling, design tokens and component architecture.
---

# Angular Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
Angular 17+: standalone components, signals, built-in control flow, functional interceptors.

## Never

- Put a token or any PII in `localStorage` / `sessionStorage`.
- Commit a secret, API key, or credential anywhere in the repo — including `environment.ts`. The bundle is public.
- Use `console.log` outside `core/logging/`. Use `LoggerService`.
- Do `number` arithmetic on money. See Money below.
- Use a raw colour, spacing, or font-size value in a component. Use tokens from `tokens.css`.
- Use `any`. Use `unknown` and narrow.
- Call `.subscribe()` without `takeUntilDestroyed()` or the async pipe. No nested subscribes.
- Use `HttpClient` in a `*.component.ts`. Components render; services decide.
- Use `::ng-deep`, `ViewEncapsulation.None`, `!important`, direct DOM access, `NgModule`, `*ngIf` / `*ngFor`.
- Call `bypassSecurityTrust*` without an `// APPROVED BYPASS` comment naming the input source.
- Use `catchError(() => of([]))` that hides a real failure as an empty list.
- Map `snake_case` to `camelCase` in a feature. Wire format is camelCase; a `snake_case` endpoint is a backend defect.
- Call functions in templates except signal reads. Precompute `.filter()` and `.sort()` in the class or a pure pipe.
- Track `@for` by `$index` on a list that can reorder, filter or delete. Track a stable id — `$index` reattaches component state to the wrong row.
- Put business logic in a constructor, or use `setTimeout` to paper over change detection. Use `inject()` and `ngOnInit`.
- Mutate an `@Input()`. Use `input()` and `output()`. A child that writes its inputs cannot be reused.
- Set `Authorization` outside the auth interceptor. A second header is a defect.
- Call a third party from the browser with a secret key (Stripe publishable / Mapbox public tokens excepted).
- Use AWS credentials or a public object URL for uploads.
- Treat a wallet submission as confirmed payment.
- Use `<div>` click handlers or `outline: none`.

## Always

- Feature-first structure: `core/`, `shared/`, `features/<name>/{pages,components,services,models}`.
- `ChangeDetectionStrategy.OnPush` on every component. `strict: true` in tsconfig.
- Typed reactive forms; validation in the form definition, not in a `(click)` handler.
- Four states on every async view: **loading, empty, error, success**.
- Environment values from `APP_CONFIG` (runtime `/config.json`), never `environment.prod.ts`.
- Tokens in memory only; session is an httpOnly cookie set by the backend.
- Show the correlation id on the error state.
- Browser calls our API; our API holds third-party secrets. Stripe publishable / Mapbox public tokens are the exception.
- Uploads: client size/type checks are UX; server returns a short-lived presigned PUT; browser uploads to S3; API verifies the object; bucket stays private.
- Wallets: submit the transaction hash; backend confirms sender, recipient, amount, and confirmation depth. Contract addresses and chain ids come from `APP_CONFIG`.
- Actions are `<button>`, navigation is `<a>`, every input has a `<label>`, every icon-only control has an `aria-label`, touch targets ≥ 44×44px.

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
