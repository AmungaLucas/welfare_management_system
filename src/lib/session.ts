import { NextRequest } from 'next/server';
import { verifyToken, type JwtPayload } from '@/lib/jwt';

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

/**
 * Extract session from request cookies.
 * Cookie name: "auth-token" (plain JWT signed with our secret).
 * This replaces the old NextAuth-based getSession().
 */
export function getSession(req: NextRequest): Session | null {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) return null;

  const payload: JwtPayload | null = verifyToken(token);
  if (!payload) return null;

  return {
    user: {
      id: payload.id,
      email: payload.email || null,
      role: payload.role || 'MEMBER',
      memberId: payload.memberId || null,
      memberStatus: payload.memberStatus || null,
    },
  };
}

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'ADMIN';
}

export function isMember(session: Session | null): boolean {
  return session?.user?.role === 'MEMBER' && !!session?.user?.memberId;
}
