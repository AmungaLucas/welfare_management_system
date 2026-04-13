import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session || !session.user.memberId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const { paymentMethod, useWallet } = await req.json();

    const caseData = await prisma.bereavementCase.findUnique({
      where: { id },
      include: {
        caseContributions: { where: { memberId: session.user.memberId } },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (caseData.status !== 'ACTIVE' && caseData.status !== 'CONTRIBUTIONS_CLOSED') {
      return NextResponse.json({ error: 'Contributions are no longer being accepted for this case' }, { status: 400 });
    }

    const contribution = caseData.caseContributions[0];
    if (!contribution) {
      return NextResponse.json({ error: 'No contribution record found for this case' }, { status: 404 });
    }

    if (contribution.status === 'PAID') {
      return NextResponse.json({ error: 'Contribution already paid' }, { status: 409 });
    }

    const expectedAmount = Number(contribution.expectedAmount);

    if (useWallet) {
      const member = await prisma.member.findUnique({ where: { id: session.user.memberId } });
      if (!member || Number(member.walletBalance) < expectedAmount) {
        return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
      }

      const balanceBefore = Number(member.walletBalance);
      const balanceAfter = balanceBefore - expectedAmount;

      await prisma.$transaction([
        prisma.member.update({
          where: { id: session.user.memberId },
          data: { walletBalance: balanceAfter },
        }),
        prisma.caseContribution.update({
          where: { id: contribution.id },
          data: {
            paidAmount: expectedAmount,
            paymentMethod: 'WALLET',
            status: 'PAID',
            paidDate: new Date(),
          },
        }),
        prisma.walletTransaction.create({
          data: {
            memberId: session.user.memberId,
            type: 'DEBIT',
            amount: expectedAmount,
            balanceBefore,
            balanceAfter,
            description: `Bereavement contribution for ${caseData.deceasedName}`,
            referenceId: contribution.id,
            referenceType: 'CASE_CONTRIBUTION',
          },
        }),
        // Update case total collected
        prisma.bereavementCase.update({
          where: { id },
          data: {
            totalCollected: { increment: expectedAmount },
          },
        }),
      ]);

      return NextResponse.json({
        message: `Ksh ${expectedAmount} deducted from wallet for ${caseData.deceasedName}`,
        newBalance: balanceAfter,
      });
    } else {
      // M-Pesa or other payment method (record as paid)
      const mpesaRef = `SBK${Date.now()}`;

      await prisma.$transaction([
        prisma.caseContribution.update({
          where: { id: contribution.id },
          data: {
            paidAmount: expectedAmount,
            paymentMethod: paymentMethod || 'MPESA',
            mpesaRef,
            status: 'PAID',
            paidDate: new Date(),
          },
        }),
        prisma.bereavementCase.update({
          where: { id },
          data: { totalCollected: { increment: expectedAmount } },
        }),
      ]);

      return NextResponse.json({
        message: `Ksh ${expectedAmount} contribution recorded for ${caseData.deceasedName}`,
        mpesaRef,
      });
    }
  } catch (error) {
    console.error('Contribute to bereavement case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
