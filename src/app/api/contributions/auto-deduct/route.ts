import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { year, month } = await req.json();
    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const settings = await prisma.settings.findFirst();
    const amount = Number(settings?.monthlyContributionAmount || 200);

    // Get all active members with wallet balance >= contribution amount
    const members = await prisma.member.findMany({
      where: {
        status: 'ACTIVE',
        walletBalance: { gte: amount },
      },
    });

    let deducted = 0;
    let skipped = 0;
    const results: { memberId: string; name: string; success: boolean; message: string }[] = [];

    for (const member of members) {
      // Check if already paid this month
      const existing = await prisma.contribution.findUnique({
        where: { memberId_year_month: { memberId: member.id, year, month } },
      });
      if (existing) {
        skipped++;
        results.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          success: false,
          message: 'Already paid this month',
        });
        continue;
      }

      const balanceBefore = Number(member.walletBalance);
      const balanceAfter = balanceBefore - amount;

      // Use transaction for atomicity
      try {
        await prisma.$transaction([
          // Deduct wallet
          prisma.member.update({
            where: { id: member.id },
            data: { walletBalance: balanceAfter },
          }),
          // Create contribution
          prisma.contribution.create({
            data: {
              memberId: member.id,
              year,
              month,
              amount,
              paymentMethod: 'WALLET',
              transactionRef: `WALLET_AUTO_${Date.now()}_${member.id.slice(-4)}`,
              status: 'COMPLETED',
              recordedBy: session.user.id,
              notes: 'Auto-deducted from wallet',
            },
          }),
          // Create wallet transaction
          prisma.walletTransaction.create({
            data: {
              memberId: member.id,
              type: 'DEBIT',
              amount,
              balanceBefore,
              balanceAfter,
              description: `Monthly contribution auto-deduction for ${month}/${year}`,
              referenceType: 'MONTHLY_DEDUCT',
            },
          }),
        ]);

        // Reset arrears
        if (member.consecutiveArrears > 0) {
          await prisma.member.update({
            where: { id: member.id },
            data: { consecutiveArrears: 0 },
          });
        }

        deducted++;
        results.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          success: true,
          message: `Ksh ${amount} deducted. New balance: Ksh ${balanceAfter}`,
        });
      } catch (err) {
        results.push({
          memberId: member.id,
          name: `${member.firstName} ${member.lastName}`,
          success: false,
          message: `Error: ${String(err)}`,
        });
      }
    }

    return NextResponse.json({ deducted, skipped, total: members.length, results });
  } catch (error) {
    console.error('Auto-deduct error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
