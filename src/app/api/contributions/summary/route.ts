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

    // Monthly totals for the year
    const monthlyTotals = await prisma.contribution.groupBy({
      by: ['month'],
      where: { year, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const found = monthlyTotals.find((m) => m.month === i + 1);
      return {
        month: i + 1,
        monthName: new Date(year, i).toLocaleString('default', { month: 'short' }),
        total: Number(found?._sum.amount || 0),
        count: found?._count || 0,
      };
    });

    // Overall stats
    const yearContributions = await prisma.contribution.findMany({
      where: { year, status: 'COMPLETED' },
      select: { amount: true, memberId: true },
    });

    const totalAmount = yearContributions.reduce((sum, c) => sum + Number(c.amount), 0);
    const uniqueMembers = new Set(yearContributions.map((c) => c.memberId)).size;
    const expectedMonthly = Number((await prisma.settings.findFirst())?.monthlyContributionAmount || 200);
    const activeMembers = await prisma.member.count({ where: { status: 'ACTIVE' } });
    const expectedYearly = activeMembers * expectedMonthly * 12;

    // Payment method breakdown
    const methodBreakdown = await prisma.contribution.groupBy({
      by: ['paymentMethod'],
      where: { year, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    // District breakdown
    const districtBreakdown = await prisma.contribution.findMany({
      where: { year, status: 'COMPLETED' },
      include: { member: { select: { districtId: true, district: { select: { name: true } } } } },
    });

    const districtTotals = new Map<string, { total: number; count: number }>();
    for (const c of districtBreakdown) {
      const dName = c.member.district?.name || 'Unknown';
      const current = districtTotals.get(dName) || { total: 0, count: 0 };
      current.total += Number(c.amount);
      current.count += 1;
      districtTotals.set(dName, current);
    }

    return NextResponse.json({
      year,
      monthlyData,
      total: totalAmount,
      uniqueMembers,
      activeMembers,
      expectedYearly,
      collectionRate: expectedYearly > 0 ? Math.round((totalAmount / expectedYearly) * 100) : 0,
      methodBreakdown: methodBreakdown.map((m) => ({
        method: m.paymentMethod,
        total: Number(m._sum.amount || 0),
        count: m._count,
      })),
      districtBreakdown: Array.from(districtTotals.entries()).map(([name, data]) => ({
        district: name,
        ...data,
      })),
    });
  } catch (error) {
    console.error('Get contribution summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
