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

    // Contribution trends - monthly
    const contributionTrends = await prisma.contribution.groupBy({
      by: ['month'],
      where: { year, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const found = contributionTrends.find((c) => c.month === i + 1);
      return {
        month: new Date(year, i).toLocaleString('default', { month: 'short' }),
        amount: Number(found?._sum.amount || 0),
        count: found?._count || 0,
      };
    });

    // Member distribution by district
    const districtDistribution = await prisma.member.groupBy({
      by: ['districtId'],
      _count: true,
    });

    const districtData = await Promise.all(
      districtDistribution.map(async (d) => {
        const district = await prisma.district.findUnique({ where: { id: d.districtId } });
        return {
          district: district?.name || 'Unknown',
          count: d._count,
        };
      })
    );

    // Case statistics
    const casesByCategory = await prisma.bereavementCase.groupBy({
      by: ['category'],
      _count: true,
    });

    const casesByStatus = await prisma.bereavementCase.groupBy({
      by: ['status'],
      _count: true,
    });

    // Monthly member registrations
    const newMembers = await prisma.member.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      _count: true,
    });

    // Arrears by district
    const arrearsByDistrict = await prisma.member.findMany({
      where: { status: 'ACTIVE', consecutiveArrears: { gte: 1 } },
      include: { district: true },
    });

    const arrearsDistrictMap = new Map<string, number>();
    for (const m of arrearsByDistrict) {
      const dName = m.district.name;
      arrearsDistrictMap.set(dName, (arrearsDistrictMap.get(dName) || 0) + 1);
    }

    return NextResponse.json({
      contributionTrends: monthlyData,
      districtDistribution: districtData.sort((a, b) => b.count - a.count),
      casesByCategory: casesByCategory.map((c) => ({ category: c.category, count: c._count })),
      casesByStatus: casesByStatus.map((c) => ({ status: c.status, count: c._count })),
      arrearsByDistrict: Array.from(arrearsDistrictMap.entries()).map(([district, count]) => ({
        district,
        count,
      })),
      year,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
