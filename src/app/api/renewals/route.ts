import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const where: Record<string, unknown> = { year };

    if (!isAdmin(session)) {
      where.memberId = session.user.memberId;
    }

    const renewals = await prisma.annualRenewal.findMany({
      where,
      include: {
        member: { select: { firstName: true, lastName: true, churchMembershipNo: true, district: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ renewals });
  } catch (error) {
    console.error('Get renewals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { year, dueDate } = await req.json();
    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 });
    }

    const settings = await prisma.settings.findFirst();
    const amount = Number(settings?.annualRenewalFee || 200);

    // Get active members
    const activeMembers = await prisma.member.findMany({
      where: { status: 'ACTIVE' },
    });

    const due = dueDate ? new Date(dueDate) : new Date(year, 11, 31);

    let created = 0;
    for (const member of activeMembers) {
      const existing = await prisma.annualRenewal.findUnique({
        where: { memberId_year: { memberId: member.id, year } },
      });
      if (!existing) {
        await prisma.annualRenewal.create({
          data: {
            memberId: member.id,
            year,
            amount,
            status: 'PENDING',
            dueDate: due,
            initiatedBy: session.user.id,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      message: `${created} renewal records created for year ${year}`,
      created,
      totalMembers: activeMembers.length,
    });
  } catch (error) {
    console.error('Initiate renewals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
