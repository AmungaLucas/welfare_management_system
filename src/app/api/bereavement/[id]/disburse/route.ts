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
    const {
      amount, disbursementMethod, referenceNo,
      receivedByName, receivedByIdNo, notes,
    } = await req.json();

    const caseData = await prisma.bereavementCase.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    if (!caseData.memberEligible) {
      return NextResponse.json({
        error: `Cannot disburse - member not eligible: ${caseData.eligibilityNotes}`,
      }, { status: 400 });
    }

    // Create disbursement
    const disbursement = await prisma.benefitDisbursement.create({
      data: {
        caseId: id,
        memberId: caseData.memberId,
        amount: amount || Number(caseData.benefitAmount),
        disbursementMethod: disbursementMethod || 'BANK_TRANSFER',
        referenceNo,
        disbursedDate: new Date(),
        receivedByName,
        receivedByIdNo,
        notes,
      },
    });

    // Update case
    await prisma.bereavementCase.update({
      where: { id },
      data: {
        benefitStatus: 'DISBURSED',
        benefitDisbursedDate: new Date(),
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({
      disbursement,
      message: `Benefit of Ksh ${amount || Number(caseData.benefitAmount)} disbursed successfully`,
    });
  } catch (error) {
    console.error('Disburse benefit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
