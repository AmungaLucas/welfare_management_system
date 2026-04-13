import { NextRequest } from 'next/server';

export async function getSession(req: NextRequest) {
  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) return null;

  try {
    const { jwt } = await import('jsonwebtoken');
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(sessionToken, secret) as { sub?: string; id?: string; email?: string; role?: string; memberId?: string; memberStatus?: string };
    return {
      user: {
        id: (decoded.sub || decoded.id) as string,
        email: decoded.email || null,
        role: (decoded.role || 'MEMBER') as string,
        memberId: decoded.memberId || null,
        memberStatus: decoded.memberStatus || null,
      },
    };
  } catch {
    return null;
  }
}

export function isAdmin(session: { user: { role: string } } | null): boolean {
  return session?.user?.role === 'ADMIN';
}

export function isMember(session: { user: { role: string; memberId?: string | null } } | null): boolean {
  return session?.user?.role === 'MEMBER' && !!session?.user?.memberId;
}
