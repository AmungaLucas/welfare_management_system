'use client';

import {
  createContext, useContext, useCallback, useEffect, useState, ReactNode,
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
  refresh: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextType | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider – simple useState + useEffect                             */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Both server and client start with 'loading' — no hydration mismatch
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  /* ---- Fetch session from our custom /api/auth/session ---- */
  const fetchSession = useCallback(async (): Promise<{
    session: Session | null;
    status: AuthStatus;
  }> => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setSession(data as Session);
          setStatus('authenticated');
          return { session: data as Session, status: 'authenticated' };
        }
      }
    } catch { /* ignore */ }
    setSession(null);
    setStatus('unauthenticated');
    return { session: null, status: 'unauthenticated' };
  }, []);

  /* ---- On mount: fetch session ---- */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            setSession(data as Session);
            setStatus('authenticated');
            return;
          }
        }
      } catch { /* ignore */ }
      setSession(null);
      setStatus('unauthenticated');
    };

    load();

    const onFocus = () => { void fetchSession(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  /* ---- Login (admin – email / password) ---- */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.ok) {
          // Cookie is set by the server; fetch session to confirm
          const result = await fetchSession();
          if (result.status === 'authenticated') {
            return { ok: true };
          }
        }

        return { ok: false, error: data.error || 'Invalid email or password' };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [fetchSession],
  );

  /* ---- Login (member – churchMembershipNo / phone) ---- */
  const loginMember = useCallback(
    async (churchMembershipNo: string, phone: string) => {
      try {
        const res = await fetch('/api/auth/member-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ churchMembershipNo, phone }),
        });

        const data = await res.json();
        if (data.ok) {
          const result = await fetchSession();
          if (result.status === 'authenticated') {
            return { ok: true };
          }
        }

        return { ok: false, error: data.error || 'Invalid membership number or phone' };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [fetchSession],
  );

  /* ---- Logout ---- */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore */ }
    setSession(null);
    setStatus('unauthenticated');
    router.refresh();
  }, [router]);

  /* ---- Render ---- */
  return (
    <AuthContext.Provider value={{ session, status, login, loginMember, logout, refresh: fetchSession }}>
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
