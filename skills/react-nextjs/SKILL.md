---
name: nextjs-react-standard
description: Use when writing, reviewing, or modifying React or Next.js code. Enforces the React / Next.js Coding Standard v2.0 — the 'use client' boundary, server-only secrets, Route Handler limits, TanStack Query, logging and redaction, money handling, design tokens.
---

# React / Next.js Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
Next.js App Router. Fixed choices: **TanStack Query** for client server-state, **Tailwind**, **Zod**, **react-hook-form**, **Sentry**.

## Never

- `'use client'` on a `layout.tsx`, or on a `page.tsx` by default. It marks a boundary: everything imported below it becomes client code.
- A server-only module imported anywhere reachable from a client component. Its contents get inlined into the browser bundle.
- A secret in `NEXT_PUBLIC_*`. Anything so prefixed is public — treat it as printed on the homepage.
- `localStorage` / `sessionStorage` for a token or PII.
- `window`, `document` or `localStorage` read in a render body. They do not exist during server rendering.
- Business logic in a Route Handler or Server Action. They are a proxy, not a second backend.
- An authenticated server-side fetch without `cache: 'no-store'`. A cached per-user response served to another user is a breach.
- `QueryClient` at module scope. It is shared between server requests and leaks across users.
- `useEffect` to fetch data. That is a query.
- `fetch` or `axios` outside `lib/`. Everything goes through the API client.
- `number` arithmetic on money.
- A raw colour, spacing or font-size value. Use tokens from `tokens.css`.
- `any`; array index as a `key` in a reorderable list; `dangerouslySetInnerHTML` with anything a user influences.

## Always

- Server Component is the default. `'use client'` goes as far down the tree as possible.
- Providers in one client file, imported by the root layout, so the layout stays a Server Component.
- `import 'server-only'` as the first line of every file in `lib/server/`. It turns a silent leak into a build error.
- `app/` is routing only. A `page.tsx` reads params, checks access, renders a component from `features/`.
- `error.tsx` per route segment, `global-error.tsx` at the root. Show `error.digest` — it correlates the screen to the server log.
- Zod validation at every API boundary; types come from `z.infer`, never a parallel hand-written interface.
- Four states on every async view: **loading, empty, error, success**.
- Session is an httpOnly cookie. It is also what lets a Server Component fetch on the user's behalf via `cookies()`.

## Patterns to copy

**The `'use client'` boundary.**

```tsx
// ❌ the whole page and every child become client code
'use client';
export default function LoansPage() { const [f, setF] = useState(''); ... }

// ✅ the page stays on the server; only the interactive part crosses
export default function LoansPage() {
  return (<div><PageHeader title="Loans" /><LoanBrowser /></div>);
}
```

**Server-only guard.**

```ts
// src/lib/server/config.ts
import 'server-only';
export const serverConfig = { apiKey: process.env.THIRD_PARTY_API_KEY! };

/** The allowlist. A value reaches the browser because someone put it here. */
export function publicConfig(): PublicConfig {
  return { environment: process.env.APP_ENV!, sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN };
}
```

**One refresh at a time.** Parallel 401s share one promise, or token rotation logs the user out at random.

```ts
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try { /* POST /auth/refresh with credentials: 'include' */ }
    finally { refreshPromise = null; }
  })();
  return refreshPromise;
}
```

**Query keys defined once per feature. Never inline.** A mutation invalidating `['loans']` while a query registered `['loan','list']` silently does nothing, and it reads as a stale UI rather than a typo.

```ts
export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (f: LoanFilters) => [...loanKeys.lists(), f] as const,
  detail: (id: string) => [...loanKeys.all, 'detail', id] as const,
};
```

**Query client defaults.** Mutations never retry — a retried POST creates two records. Queries never retry 4xx — the request was wrong, not unlucky.

```ts
retry: (count, error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return count < 2;
},
mutations: { retry: false },
```

**Route Handler — proxy only.**

```ts
// ✅ hides a key
export async function GET(request: Request) { /* fetch third party with serverConfig.key */ }

// ❌ a backend endpoint that escaped review
export async function POST(request: Request) {
  const interest = amount * 0.025;     // business rule in the frontend repo
  await db.loan.update({ ... });       // direct database access
}
```

## Money

`number` is never used for an amount. Fiat: `string` in minor units. Tokens: `bigint` base units. Rates: integer basis points. Zod types money as `z.string()`, never `z.number()`. Totals and fees come from the backend.

## Components and UI

| Kind | Lives in | May use |
|---|---|---|
| Page | `features/<x>/` | Queries, router |
| Feature | `features/<x>/components/` | Nothing |
| Presentational | `components/` | Nothing |

A presentational component that fetches cannot be reused or survive a redesign. Tailwind is the styling system; hand-written CSS only in `tokens.css`, the global layer and third-party overrides. Repeated utility strings mean extract a component, not start a stylesheet. Use `twMerge` for a `className` prop. A component never sets its own outer margin.

## Before you finish

1. `'use client'` as low as it can be; not on a layout or page.
2. Nothing from `lib/server/` reachable from client code.
3. No secret in a `NEXT_PUBLIC_*` variable.
4. `cache: 'no-store'` on authenticated server fetches.
5. Mutation invalidates what it changed; query keys from the factory.
6. No `number` arithmetic on an amount.
7. Four states handled; Zod at the boundary.

Full reasoning and the complete rule set: **React / Next.js Coding Standard v2.0**. Appendix C covers plain React on Vite.
