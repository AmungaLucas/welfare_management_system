import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { member: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { ok: false, error: 'Account is deactivated' },
        { status: 403 },
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // Create JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      memberId: user.member?.id || null,
      memberStatus: user.member?.status || null,
    });

    // Set cookie
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        memberId: user.member?.id || null,
        memberStatus: user.member?.status || null,
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
    console.error('Login error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
