# FCP Performance Report

## Baseline

- FCP: 8.08s
- LCP: 0.64s
- TTFB: 0.41s
- Read: server response is fast; first paint was blocked by client/CSS work, not backend latency.

## Highest-impact fix

- Removed login splash overlay and `login-main-reveal` animation.
- Before: login page rendered real content behind a full-screen absolute overlay for a 4s animation, while main content stayed invisible/blurred until 70% of that animation.
- After: login form and hero content render immediately in server HTML.
- Expected FCP impact: large. This directly removes intentional delayed visibility from the above-the-fold path.

## Server Component conversions

- `components/app-nav.tsx`: removed `use client`, `usePathname`, active-route state, and nav hydration.
- `components/main-search.tsx`: removed `use client`, `useRouter`, and Zustand dependency; converted to normal server-rendered GET form.
- `app/products/page.tsx` + `features/products/products-table.tsx`: product search now reads `?q=` from the URL instead of global client state.

## Root layout reductions

- Removed root `ThemeProvider` wrapper from `app/layout.tsx`.
- Replaced `next-themes` with a tiny `beforeInteractive` theme init script and a small client-only toggle.
- Moved `sonner`, Vercel Analytics, Speed Insights, and service-worker registration behind idle loading in `components/client-effects.tsx`.
- Deleted unused root client files:
  - `components/theme-provider.tsx`
  - `components/pwa-register.tsx`
  - `hooks/use-app-store.ts`
- Removed unused dependencies:
  - `next-themes`
  - `zustand`

## Bundle/hydration notes

- Current `use client` count in source: 45.
- Remaining biggest hydration areas are feature-level CRUD screens:
  - `features/sales/sales-view.tsx`
  - `features/purchase-orders/purchase-orders-view.tsx`
  - `features/products/products-table.tsx`
  - `components/ui/data-table.tsx`
- These are interaction-heavy and reasonable as client islands, but next FCP pass should split create/edit forms with `next/dynamic` so tables paint before form logic.
- Largest current built JS chunks observed under `.next/static/chunks`: ~312 KB, 312 KB, 236 KB, 224 KB. Route-level chunk names are opaque in Turbopack output; next step is bundle analyzer if deeper attribution is needed.

## Font loading

- No remote web font found.
- App uses system font stack via CSS, so no blocking font request was causing FCP delay.
- Kept this path; no `next/font` fetch added.

## Middleware/proxy impact

- `proxy.ts` skips static assets and public routes, including `/login`, `/pricing`, `/reset-password`, `/_next/static`, `/_next/image`, and files.
- Authenticated app routes still call `supabase.auth.getUser()` in proxy, so TTFB for protected routes remains dependent on Supabase auth latency.
- Given baseline TTFB is 0.41s, proxy is not primary FCP bottleneck. Keep matcher exclusions as-is.

## Before / After Summary

| Area | Before | After | FCP effect |
| --- | --- | --- | --- |
| Login first paint | 4s overlay + hidden/blurred main content | Real content visible immediately | High |
| Root providers | Theme, toaster, analytics, speed insights, PWA all mounted at root | Only idle client effects + tiny theme toggle | Medium |
| Nav | Hydrated for active route state | Server-rendered static nav | Medium |
| Header search | Client router + Zustand | Server-rendered GET form | Low/medium |
| Dependencies | `next-themes`, `zustand` in graph | Removed | Low |

## Verification

- `PATH=/Users/ricardo/.nvm/versions/node/v22.3.0/bin:$PATH npm run build`: passed.
- `npm run lint`: passed with existing warnings in local skill folders and existing app warnings; no errors.
