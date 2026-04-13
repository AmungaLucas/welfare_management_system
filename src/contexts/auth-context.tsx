'use client';

import {
  createContext, useContext, useCallback, useEffect, useRef, useSyncExternalStore, ReactNode,
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
/*  External store (lives outside React component tree)                */
/* ------------------------------------------------------------------ */

let _session: Session | null = null;
let _status: AuthStatus = 'loading';
const _listeners = new Set<() => void>();

function _subscribe(fn: () => void) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

const _serverSnap = { session: null as Session | null, status: 'loading' as AuthStatus };

function _getSnap() { return { s: _session, t: _status }; }
function _getServerSnap() { return { s: null as Session | null, t: 'loading' as AuthStatus }; }

function _emit(s: Session | null, t: AuthStatus) {
  _session = s;
  _status = t;
  _listeners.forEach((fn) => fn());
}

async function fetchSessionFromServer(): Promise<{ session: Session | null; status: AuthStatus }> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return { session: null, status: 'unauthenticated' };
    const data: Record<string, unknown> = await res.json();
    if (data && typeof data === 'object' && 'user' in data && data.user) {
      return { session: data as unknown as Session, status: 'authenticated' };
    }
    return { session: null, status: 'unauthenticated' };
  } catch {
    return { session: null, status: 'unauthenticated' };
  }
}

async function getCsrf(): Promise<string> {
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

  // We only use the version number to know WHEN to read from the store
  const version = useSyncExternalStore(_subscribe, () => _listeners.size, () => 0);

  // Suppress unused — version triggers re-render when listeners fire
  void version;

  const session = _session;
  const status = _status;

  /* ---- initial mount + re-fetch on window focus -------------------- */
  useEffect(() => {
    fetchSessionFromServer().then(({ session: s, status: t }) => _emit(s, t));
    const onFocus = () => fetchSessionFromServer().then(({ session: s, status: t }) => _emit(s, t));
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  /* ---- login (admin – email / password) ---------------------------- */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const csrfToken = await getCsrf();
        await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'include',
          body: new URLSearchParams({ email, password, csrfToken }),
        });
        const { session: s, status: t } = await fetchSessionFromServer();
        _emit(s, t);
        return { ok: t === 'authenticated', error: t !== 'authenticated' ? 'Invalid email or password' : undefined };
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
        const csrfToken = await getCsrf();
        await fetch('/api/auth/callback/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'include',
          body: new URLSearchParams({ churchMembershipNo, phone, csrfToken }),
        });
        const { session: s, status: t } = await fetchSessionFromServer();
        _emit(s, t);
        return { ok: t === 'authenticated', error: t !== 'authenticated' ? 'Invalid membership number or phone' : undefined };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [],
  );

  /* ---- logout ----------------------------------------------------- */
  const logout = useCallback(async () => {
    try {
      const csrfToken = await getCsrf();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body: new URLSearchParams({ csrfToken }),
      });
    } catch {
      // ignore
    }
    _emit(null, 'unauthenticated');
    router.refresh();
  }, [router]);

  /* ---- render ----------------------------------------------------- */
  return (
    <AuthContext.Provider
      value={{ session, status, login, loginMember, logout, refresh: () => fetchSessionFromServer().then(({ session: s, status: t }) => _emit(s, t)) }}
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
