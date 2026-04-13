import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();

    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        monthlyContributionAmount: body.monthlyContributionAmount,
        registrationFee: body.registrationFee,
        annualRenewalFee: body.annualRenewalFee,
        joiningFeeNewMember: body.joiningFeeNewMember,
        joiningFeeOldMember: body.joiningFeeOldMember,
        nuclearBenefitAmount: body.nuclearBenefitAmount,
        parentBenefitAmount: body.parentBenefitAmount,
        nuclearContributionPerMember: body.nuclearContributionPerMember,
        parentContributionPerMember: body.parentContributionPerMember,
        childCoverageMaxAge: body.childCoverageMaxAge,
        waitingPeriodMonths: body.waitingPeriodMonths,
        redAlertThreshold: body.redAlertThreshold,
        suspensionThreshold: body.suspensionThreshold,
        suspensionDurationMonths: body.suspensionDurationMonths,
        removalThreshold: body.removalThreshold,
        maxBurialAttendees: body.maxBurialAttendees,
        newChurchMemberYears: body.newChurchMemberYears,
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
