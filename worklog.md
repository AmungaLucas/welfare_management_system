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

---
Task ID: 2
Agent: Main Agent
Task: Connect to MySQL database (da25.host-ww.net)

Work Log:
- Changed Prisma schema datasource provider from `sqlite` to `mysql`
- Updated `.env` DATABASE_URL to MySQL connection string
- Discovered system-level DATABASE_URL env var (`file:/home/z/my-project/db/custom.db`) was overriding `.env` file
- Fixed `src/lib/prisma.ts` to force-read DATABASE_URL from `.env` file, bypassing system env override
- Ran `prisma db push --accept-data-loss` to create all 15 tables in MySQL
- Ran `prisma generate` to build MySQL-compatible Prisma client
- Ran `prisma/seed.ts` to seed: 9 districts, admin user, 5 sample members, user accounts, sample contributions
- Verified end-to-end: curl login → session with ADMIN role → members API returns MySQL data

Stage Summary:
- MySQL connected and all tables created
- Database seeded with admin user (admin@welfare.com / admin123) and sample data
- Files changed: `prisma/schema.prisma`, `.env`, `src/lib/prisma.ts`
- Verified: login, session, members API all work against MySQL
