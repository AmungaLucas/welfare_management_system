'use client';

import {
  createContext, useContext, useCallback, useEffect, ReactNode, useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SessionUser {
  id: string;
  email: string | null;
  role: string;
  memberId: string | null;
  memberStatus: string | null;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  session: Session | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginMember: (
    churchMembershipNo: string,
    phone: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => void;
}

/* ------------------------------------------------------------------ */
/*  Module-level session store                                         */
/*  (updates trigger useSyncExternalStore re-renders)                 */
/* ------------------------------------------------------------------ */

let storeSession: Session | null = null;
let storeStatus: AuthStatus = 'loading';
const storeListeners = new Set<() => void>();

function subscribeToStore(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => { storeListeners.delete(listener); };
}

/* Cached snapshot objects — mutated in-place only when store changes */
const clientSnapshot = { session: null as Session | null, status: 'loading' as AuthStatus };
const serverSnapshot = Object.freeze({ session: null as Session | null, status: 'loading' as AuthStatus });

function getStoreSnapshot() {
  return clientSnapshot;
}

function getServerSnapshot() {
  return serverSnapshot;
}

function notifyStore() {
  clientSnapshot.session = storeSession;
  clientSnapshot.status = storeStatus;
  storeListeners.forEach((l) => l());
}

/* ---- fetch session from /api/auth/session ------------------------- */
async function doFetchSession() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) {
      storeSession = null;
      storeStatus = 'unauthenticated';
    } else {
      const data: Record<string, unknown> = await res.json();
      if (data && typeof data === 'object' && 'user' in data && data.user) {
        storeSession = data as unknown as Session;
        storeStatus = 'authenticated';
      } else {
        storeSession = null;
        storeStatus = 'unauthenticated';
      }
    }
  } catch {
    storeSession = null;
    storeStatus = 'unauthenticated';
  }
  notifyStore();
}

/* ---- get CSRF token from NextAuth -------------------------------- */
async function getCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextType | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  /* Subscribe to the module-level store */
  const { session, status } = useSyncExternalStore(
    subscribeToStore,
    getStoreSnapshot,
    getServerSnapshot,
  );

  /* Initial fetch + re-fetch on window focus */
  useEffect(() => {
    doFetchSession();
    const onFocus = () => doFetchSession();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  /* ---- login (admin – email / password) ---------------------------- */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const csrfToken = await getCsrfToken();
        await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'include',
          body: new URLSearchParams({ email, password, csrfToken }),
        });
        await doFetchSession();
        return { ok: storeStatus === 'authenticated', error: storeStatus !== 'authenticated' ? 'Invalid email or password' : undefined };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [],
  );

  /* ---- login (member – churchMembershipNo / phone) ----------------- */
  const loginMember = useCallback(
    async (churchMembershipNo: string, phone: string) => {
      try {
        const csrfToken = await getCsrfToken();
        await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'include',
          body: new URLSearchParams({ churchMembershipNo, phone, csrfToken }),
        });
        await doFetchSession();
        return { ok: storeStatus === 'authenticated', error: storeStatus !== 'authenticated' ? 'Invalid membership number or phone' : undefined };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [],
  );

  /* ---- logout ----------------------------------------------------- */
  const logout = useCallback(async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body: new URLSearchParams({ csrfToken }),
      });
    } catch {
      // ignore – we clear state anyway
    }
    storeSession = null;
    storeStatus = 'unauthenticated';
    notifyStore();
    router.refresh();
  }, [router]);

  /* ---- render ----------------------------------------------------- */
  return (
    <AuthContext.Provider
      value={{ session, status, login, loginMember, logout, refresh: doFetchSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
