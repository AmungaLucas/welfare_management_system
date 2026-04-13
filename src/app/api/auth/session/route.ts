import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json({});
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({});
  }

  return NextResponse.json({
    user: {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      memberId: payload.memberId,
      memberStatus: payload.memberStatus,
    },
  });
}
