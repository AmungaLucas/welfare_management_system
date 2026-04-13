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
    const memberId = searchParams.get('memberId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (isAdmin(session)) {
      if (memberId) where.memberId = memberId;
    } else {
      where.memberId = session.user.memberId;
    }

    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);
    if (status) where.status = status;

    const [contributions, total] = await Promise.all([
      prisma.contribution.findMany({
        where,
        include: { member: { include: { district: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contribution.count({ where }),
    ]);

    return NextResponse.json({
      contributions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get contributions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { memberId, year, month, amount, paymentMethod, mpesaRef, notes } = body;

    const targetMemberId = isAdmin(session) ? memberId : session.user.memberId;

    if (!targetMemberId || !year || !month) {
      return NextResponse.json({ error: 'Member ID, year, and month are required' }, { status: 400 });
    }

    // Check if contribution already exists
    const existing = await prisma.contribution.findUnique({
      where: { memberId_year_month: { memberId: targetMemberId, year, month } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Contribution already recorded for this month' }, { status: 409 });
    }

    const settings = await prisma.settings.findFirst();
    const contributionAmount = amount || Number(settings?.monthlyContributionAmount || 200);

    const contribution = await prisma.contribution.create({
      data: {
        memberId: targetMemberId,
        year,
        month,
        amount: contributionAmount,
        paymentMethod: paymentMethod || 'CASH',
        mpesaRef,
        transactionRef: mpesaRef,
        status: 'COMPLETED',
        recordedBy: session.user.id,
        notes,
      },
      include: { member: { include: { district: true } } },
    });

    // Reset consecutive arrears on payment
    const member = await prisma.member.findUnique({ where: { id: targetMemberId } });
    if (member && member.consecutiveArrears > 0) {
      await prisma.member.update({
        where: { id: targetMemberId },
        data: { consecutiveArrears: 0 },
      });
    }

    // Create notification
    if (member?.phone) {
      await prisma.notification.create({
        data: {
          memberId: targetMemberId,
          type: 'PAYMENT_CONFIRMATION',
          channel: 'SMS',
          message: `Your welfare contribution of Ksh ${contributionAmount} for ${month}/${year} has been recorded. Thank you!`,
          recipientPhone: member.phone,
          status: 'PENDING',
        },
      });
    }

    return NextResponse.json({ contribution }, { status: 201 });
  } catch (error) {
    console.error('Create contribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
