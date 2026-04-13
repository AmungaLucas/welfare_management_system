import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const minArrears = parseInt(searchParams.get('minArrears') || '1');

    const members = await prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        consecutiveArrears: { gte: minArrears },
      },
      include: {
        district: true,
        contributions: {
          where: { status: 'COMPLETED' },
          orderBy: { paidDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { consecutiveArrears: 'desc' },
    });

    const arrearsData = members.map((m) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      churchMembershipNo: m.churchMembershipNo,
      district: m.district.name,
      phone: m.phone,
      consecutiveArrears: m.consecutiveArrears,
      totalDefaultEvents: m.totalDefaultEvents,
      lastPayment: m.contributions[0]?.paidDate || null,
      status:
        m.consecutiveArrears >= 2 ? 'RED_ALERT' :
        m.consecutiveArrears >= 1 ? 'WARNING' : 'OK',
    }));

    return NextResponse.json({
      members: arrearsData,
      total: arrearsData.length,
      redAlert: arrearsData.filter((m) => m.status === 'RED_ALERT').length,
      warning: arrearsData.filter((m) => m.status === 'WARNING').length,
    });
  } catch (error) {
    console.error('Dashboard arrears error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
