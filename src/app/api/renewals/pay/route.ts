import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !session.user.memberId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { year, paymentMethod, useWallet } = await req.json();
    const memberId = session.user.memberId;

    const renewal = await prisma.annualRenewal.findUnique({
      where: { memberId_year: { memberId, year } },
    });

    if (!renewal) {
      return NextResponse.json({ error: 'No renewal record found' }, { status: 404 });
    }

    if (renewal.status === 'PAID') {
      return NextResponse.json({ error: 'Renewal already paid' }, { status: 409 });
    }

    const amount = Number(renewal.amount);

    if (useWallet) {
      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member || Number(member.walletBalance) < amount) {
        return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
      }

      const balanceBefore = Number(member.walletBalance);
      const balanceAfter = balanceBefore - amount;

      await prisma.$transaction([
        prisma.member.update({
          where: { id: memberId },
          data: { walletBalance: balanceAfter },
        }),
        prisma.annualRenewal.update({
          where: { id: renewal.id },
          data: {
            status: 'PAID',
            paidDate: new Date(),
            paymentMethod: 'WALLET',
          },
        }),
        prisma.walletTransaction.create({
          data: {
            memberId,
            type: 'DEBIT',
            amount,
            balanceBefore,
            balanceAfter,
            description: `Annual renewal payment for ${year}`,
            referenceType: 'RENEWAL',
          },
        }),
      ]);

      return NextResponse.json({
        message: `Annual renewal of Ksh ${amount} paid from wallet`,
        newBalance: balanceAfter,
      });
    } else {
      const mpesaRef = `SBK${Date.now()}`;

      await prisma.annualRenewal.update({
        where: { id: renewal.id },
        data: {
          status: 'PAID',
          paidDate: new Date(),
          paymentMethod: paymentMethod || 'MPESA',
          mpesaRef,
        },
      });

      return NextResponse.json({
        message: `Annual renewal of Ksh ${amount} recorded`,
        mpesaRef,
      });
    }
  } catch (error) {
    console.error('Pay renewal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
