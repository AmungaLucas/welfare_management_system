import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const caseData = await prisma.bereavementCase.findUnique({
      where: { id },
      include: {
        member: { include: { district: true } },
        caseContributions: {
          include: { member: { select: { firstName: true, lastName: true, churchMembershipNo: true, district: true } } },
          orderBy: { status: 'asc' },
        },
        burialAttendees: {
          include: { member: { select: { firstName: true, lastName: true, churchMembershipNo: true } } },
        },
        benefitDisbursement: true,
        notifications: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const totalCollected = caseData.caseContributions.reduce(
      (sum, c) => sum + Number(c.paidAmount), 0
    );
    const paidContributions = caseData.caseContributions.filter((c) => c.status === 'PAID').length;

    return NextResponse.json({
      ...caseData,
      totalCollected,
      paidContributions,
      pendingContributions: caseData.totalExpected - paidContributions,
    });
  } catch (error) {
    console.error('Get bereavement case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.bereavementCase.update({
      where: { id },
      data: {
        deceasedName: body.deceasedName,
        deceasedAge: body.deceasedAge,
        dateOfDeath: body.dateOfDeath ? new Date(body.dateOfDeath) : undefined,
        dateOfBurial: body.dateOfBurial ? new Date(body.dateOfBurial) : undefined,
        burialLocation: body.burialLocation,
        status: body.status,
        benefitAmount: body.benefitAmount,
      },
      include: { member: { include: { district: true } } },
    });

    return NextResponse.json({ case: updated });
  } catch (error) {
    console.error('Update bereavement case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.bereavementCase.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete notifications for this case
      await tx.notification.deleteMany({ where: { bereavementCaseId: id } });

      // Delete benefit disbursement if exists
      await tx.benefitDisbursement.deleteMany({ where: { caseId: id } });

      // Delete case contributions
      await tx.caseContribution.deleteMany({ where: { caseId: id } });

      // Delete burial attendees
      await tx.burialAttendee.deleteMany({ where: { caseId: id } });

      // Finally delete the case itself
      await tx.bereavementCase.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Delete bereavement case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
