'use client';

import {
  createContext, useContext, useCallback, useEffect, useState, useRef, ReactNode,
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

  // Both server and client start with 'loading' → no hydration mismatch
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  /* ---- Fetch session from NextAuth API ---- */
  const fetchSession = useCallback(async (): Promise<{
    session: Session | null;
    status: AuthStatus;
  }> => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        const result = { session: null, status: 'unauthenticated' as AuthStatus };
        setSession(null);
        setStatus('unauthenticated');
        return result;
      }
      const data: Record<string, unknown> = await res.json();
      if (data && typeof data === 'object' && 'user' in data && data.user) {
        const s = data as unknown as Session;
        setSession(s);
        setStatus('authenticated');
        return { session: s, status: 'authenticated' };
      } else {
        setSession(null);
        setStatus('unauthenticated');
        return { session: null, status: 'unauthenticated' };
      }
    } catch {
      setSession(null);
      setStatus('unauthenticated');
      return { session: null, status: 'unauthenticated' };
    }
  }, []);

  /* ---- On mount: fetch session ---- */
  useEffect(() => {
    // Fetch session on mount and on window focus
    const load = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data: Record<string, unknown> = await res.json();
          if (data && typeof data === 'object' && 'user' in data && data.user) {
            setSession(data as unknown as Session);
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

  /* ---- Get CSRF token ---- */
  const getCsrf = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    const data = await res.json();
    return data.csrfToken;
  }, []);

  /* ---- Login (admin – email / password) ---- */
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
        // Always verify by checking the session after login attempt
        const result = await fetchSession();
        if (result.status === 'authenticated') {
          return { ok: true };
        }
        return { ok: false, error: 'Invalid email or password' };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [getCsrf, fetchSession],
  );

  /* ---- Login (member – churchMembershipNo / phone) ---- */
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
        // Always verify by checking the session after login attempt
        const result = await fetchSession();
        if (result.status === 'authenticated') {
          return { ok: true };
        }
        return { ok: false, error: 'Invalid membership number or phone' };
      } catch {
        return { ok: false, error: 'Network error – please try again' };
      }
    },
    [getCsrf, fetchSession],
  );

  /* ---- Logout ---- */
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
      // ignore network errors on logout
    }
    setSession(null);
    setStatus('unauthenticated');
    router.refresh();
  }, [getCsrf, router]);

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
