import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, amount, description } = body;

    if (!memberId || !amount) {
      return NextResponse.json(
        { error: 'Member ID and amount are required', details: { memberId: !memberId, amount: !amount } },
        { status: 400 }
      );
    }

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (creditAmount > 1000000) {
      return NextResponse.json({ error: 'Amount cannot exceed Ksh 1,000,000' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, walletBalance: true, status: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const balanceBefore = Number(member.walletBalance) || 0;
    const balanceAfter = balanceBefore + creditAmount;

    const transaction = await prisma.$transaction(async (tx) => {
      // Update member wallet balance
      const updated = await tx.member.update({
        where: { id: memberId },
        data: { walletBalance: balanceAfter },
        select: { id: true, firstName: true, lastName: true, walletBalance: true },
      });

      // Create wallet transaction record
      const walletTx = await tx.walletTransaction.create({
        data: {
          memberId,
          type: 'CREDIT',
          amount: creditAmount,
          balanceBefore,
          balanceAfter,
          description: description || `Manual credit by admin (${session.user.name || session.user.email})`,
          referenceType: 'MANUAL_CREDIT',
        },
      });

      return { member: updated, transaction: walletTx };
    });

    return NextResponse.json({
      message: `Ksh ${creditAmount.toLocaleString()} credited to ${member.firstName} ${member.lastName}`,
      newBalance: transaction.member.walletBalance,
      transaction: transaction.transaction,
    });
  } catch (error) {
    console.error('Credit wallet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
