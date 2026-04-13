---
Task ID: 1
Agent: Main Agent
Task: Fix "Authenticating..." hang — rewrite auth system with simple useState+useEffect

Work Log:
- Diagnosed root cause: `useSyncExternalStore` had `getSnapshot = () => _listeners.size` which never changes when auth state changes, so React never re-rendered the component
- Completely rewrote `src/contexts/auth-context.tsx` — replaced `useSyncExternalStore` with simple `useState` + `useEffect` pattern
- Server and client both start with `status: 'loading'` — no hydration mismatch
- Client-side `useEffect` fetches `/api/auth/session` on mount, updates state to 'authenticated' or 'unauthenticated'
- Fixed login functions to properly verify session after POST (both branches were returning `{ ok: true }`)
- Removed `SessionProvider` from `next-auth/react` in `src/components/providers.tsx` — no longer needed
- Verified no client-side files still import from `next-auth/react` (only server-side auth config)
- All lint checks pass cleanly

Stage Summary:
- Auth system completely rewritten with simple, proven pattern
- `useSyncExternalStore` fully removed
- `SessionProvider` wrapper removed from providers
- Login properly checks session state after credentials POST
- Files changed: `src/contexts/auth-context.tsx`, `src/components/providers.tsx`
