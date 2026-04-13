import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (isAdmin(session)) {
      const [
        totalMembers,
        activeMembers,
        pendingMembers,
        suspendedMembers,
        activeCases,
        monthlyContributions,
        yearlyContributions,
        totalWalletBalance,
        totalArrears,
      ] = await Promise.all([
        prisma.member.count(),
        prisma.member.count({ where: { status: 'ACTIVE' } }),
        prisma.member.count({ where: { status: 'PENDING_APPROVAL' } }),
        prisma.member.count({ where: { status: 'SUSPENDED' } }),
        prisma.bereavementCase.count({ where: { status: 'ACTIVE' } }),
        prisma.contribution.aggregate({
          where: { year: currentYear, month: currentMonth, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.contribution.aggregate({
          where: { year: currentYear, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.member.aggregate({ _sum: { walletBalance: true } }),
        prisma.member.count({
          where: {
            status: 'ACTIVE',
            consecutiveArrears: { gte: 1 },
          },
        }),
      ]);

      // Members with arrears > 1
      const redAlertMembers = await prisma.member.count({
        where: { status: 'ACTIVE', consecutiveArrears: { gte: 2 } },
      });

      // Total case contributions collected
      const totalCaseContributions = await prisma.caseContribution.aggregate({
        _sum: { paidAmount: true },
      });

      // Total benefits disbursed
      const totalBenefits = await prisma.benefitDisbursement.aggregate({
        _sum: { amount: true },
      });

      return NextResponse.json({
        totalMembers,
        activeMembers,
        pendingMembers,
        suspendedMembers,
        activeCases,
        monthlyCollections: Number(monthlyContributions._sum.amount || 0),
        monthlyContributors: monthlyContributions._count || 0,
        yearlyCollections: Number(yearlyContributions._sum.amount || 0),
        yearlyContributors: yearlyContributions._count || 0,
        totalWalletBalance: Number(totalWalletBalance._sum.walletBalance || 0),
        membersWithArrears: totalArrears,
        redAlertMembers,
        totalCaseContributions: Number(totalCaseContributions._sum.paidAmount || 0),
        totalBenefitsDisbursed: Number(totalBenefits._sum.amount || 0),
        currentYear,
        currentMonth,
      });
    } else {
      // Member dashboard stats
      const memberId = session.user.memberId;
      if (!memberId) {
        return NextResponse.json({ error: 'No member profile' }, { status: 400 });
      }

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          walletBalance: true, status: true, consecutiveArrears: true,
          totalDefaultEvents: true,
          firstName: true, lastName: true, churchMembershipNo: true,
          welfareNo: true, churchDurationYears: true,
          dateJoinedWelfare: true, registrationFeePaid: true,
          joiningFeePaid: true, phone: true, email: true,
          district: { select: { name: true } },
        },
      });

      const [contributions, recentTransactions, activeCases, myCaseContributions] = await Promise.all([
        prisma.contribution.findMany({
          where: { memberId, year: currentYear },
          orderBy: { month: 'desc' },
          take: 12,
        }),
        prisma.walletTransaction.findMany({
          where: { memberId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.caseContribution.findMany({
          where: {
            memberId,
            status: 'PENDING',
            case: { status: { in: ['ACTIVE', 'CONTRIBUTIONS_CLOSED'] } },
          },
          include: { case: true },
        }),
        prisma.caseContribution.findMany({
          where: { memberId },
          include: { case: true },
          orderBy: { paidDate: 'desc' },
          take: 5,
        }),
      ]);

      // Check if current month paid
      const currentMonthPaid = contributions.some((c) => c.month === currentMonth);

      // Get renewal status
      const renewal = await prisma.annualRenewal.findUnique({
        where: { memberId_year: { memberId, year: currentYear } },
      });

      return NextResponse.json({
        member,
        walletBalance: Number(member?.walletBalance || 0),
        currentMonthPaid,
        contributions,
        recentTransactions,
        activeCasesRequiringPayment: activeCases,
        myCaseContributions,
        renewalStatus: renewal?.status || 'NONE',
        currentYear,
        currentMonth,
      });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
