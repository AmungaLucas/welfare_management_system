import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const bereavementCase = await prisma.bereavementCase.findUnique({ where: { id } });
    if (!bereavementCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Mark pending contributions as DEFAULTED
    const result = await prisma.caseContribution.updateMany({
      where: { caseId: id, status: 'PENDING' },
      data: { status: 'DEFAULTED' },
    });

    const updated = await prisma.bereavementCase.update({
      where: { id },
      data: { status: 'CONTRIBUTIONS_CLOSED' },
      include: { member: { include: { district: true } } },
    });

    return NextResponse.json({
      case: updated,
      defaultedCount: result.count,
      message: `Contributions closed. ${result.count} members defaulted.`,
    });
  } catch (error) {
    console.error('Close bereavement case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
