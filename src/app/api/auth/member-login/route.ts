import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { churchMembershipNo, phone } = body;

    if (!churchMembershipNo || !phone) {
      return NextResponse.json(
        { ok: false, error: 'Membership number and phone are required' },
        { status: 400 },
      );
    }

    // Find member by church membership number
    const member = await prisma.member.findUnique({
      where: { churchMembershipNo: churchMembershipNo },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, error: 'Invalid membership number or phone' },
        { status: 401 },
      );
    }

    // Verify phone matches
    if (member.phone !== phone) {
      return NextResponse.json(
        { ok: false, error: 'Invalid membership number or phone' },
        { status: 401 },
      );
    }

    // Check member has an active user account
    if (!member.user || !member.user.isActive) {
      return NextResponse.json(
        { ok: false, error: 'No active account found. Please contact the administrator.' },
        { status: 403 },
      );
    }

    // Create JWT using the user account
    const token = signToken({
      id: member.user.id,
      email: member.user.email,
      role: member.user.role,
      memberId: member.id,
      memberStatus: member.status,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: member.user.id,
        email: member.user.email,
        role: member.user.role,
        memberId: member.id,
        memberStatus: member.status,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Member login error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
