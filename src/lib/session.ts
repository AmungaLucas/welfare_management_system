import { NextRequest } from 'next/server';

export async function getSession(req: NextRequest) {
  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) return null;

  try {
    // NextAuth v4 encrypts JWTs by default — use its own decode
    const { decode } = await import('next-auth/jwt');
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const decoded = await decode({
      token: sessionToken,
      secret,
    });

    if (!decoded) return null;

    return {
      user: {
        id: (decoded.sub || decoded.id) as string,
        email: (decoded.email as string) || null,
        role: (decoded.role as string) || 'MEMBER',
        memberId: (decoded.memberId as string) || null,
        memberStatus: (decoded.memberStatus as string) || null,
      },
    };
  } catch (error) {
    console.error('Session decode error:', error);
    return null;
  }
}

export function isAdmin(session: { user: { role: string } } | null): boolean {
  return session?.user?.role === 'ADMIN';
}

export function isMember(session: { user: { role: string; memberId?: string | null } } | null): boolean {
  return session?.user?.role === 'MEMBER' && !!session?.user?.memberId;
}
