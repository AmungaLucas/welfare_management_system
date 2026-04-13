import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { member: { include: { district: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id, email: user.email, role: user.role, phone: user.phone,
      member: user.member ? {
        id: user.member.id, churchMembershipNo: user.member.churchMembershipNo,
        firstName: user.member.firstName, lastName: user.member.lastName,
        phone: user.member.phone, status: user.member.status, district: user.member.district?.name,
        walletBalance: Number(user.member.walletBalance), dateJoinedWelfare: user.member.dateJoinedWelfare,
      } : null,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
