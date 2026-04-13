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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (isAdmin(session)) {
      if (status) where.status = status;
    } else {
      // Members can see all active cases and their own cases
      where.OR = [
        { status: 'ACTIVE' },
        { status: 'CONTRIBUTIONS_CLOSED' },
        { memberId: session.user.memberId },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.bereavementCase.findMany({
        where,
        include: {
          member: { include: { district: true } },
          caseContributions: {
            include: { member: { select: { firstName: true, lastName: true, churchMembershipNo: true } } },
          },
          benefitDisbursement: true,
          _count: { select: { caseContributions: true, burialAttendees: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bereavementCase.count({ where }),
    ]);

    return NextResponse.json({
      cases,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get bereavement cases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const {
      memberId, deceasedName, deceasedRelationship, deceasedAge,
      dateOfDeath, dateOfBurial, burialLocation, category,
    } = body;

    if (!memberId || !deceasedName || !deceasedRelationship || !category) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true, children: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const settings = await prisma.settings.findFirst();

    // Coverage checks
    let memberEligible = true;
    const eligibilityNotesList: string[] = [];
    let waitingPeriodSatisfied = true;

    // Check membership status
    if (member.status !== 'ACTIVE') {
      memberEligible = false;
      eligibilityNotesList.push(`Member status is ${member.status}. Must be ACTIVE.`);
    }

    // Check arrears
    if (member.consecutiveArrears >= (settings?.redAlertThreshold || 2)) {
      memberEligible = false;
      eligibilityNotesList.push('Member has excessive consecutive arrears.');
    }

    if (member.totalDefaultEvents >= (settings?.suspensionThreshold || 3)) {
      memberEligible = false;
      eligibilityNotesList.push('Member has been in default multiple times.');
    }

    // Check waiting period
    if (member.dateJoinedWelfare) {
      const waitingMonths = settings?.waitingPeriodMonths || 3;
      const joinDate = new Date(member.dateJoinedWelfare);
      const monthsSinceJoin = Math.floor(
        (Date.now() - joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );
      if (monthsSinceJoin < waitingMonths) {
        memberEligible = false;
        waitingPeriodSatisfied = false;
        eligibilityNotesList.push(
          `Waiting period not satisfied. Joined ${monthsSinceJoin} months ago, need ${waitingMonths} months.`
        );
      }
    }

    // Check child coverage
    if (deceasedRelationship === 'CHILD') {
      const maxAge = settings?.childCoverageMaxAge || 25;
      if (deceasedAge && deceasedAge > maxAge) {
        memberEligible = false;
        eligibilityNotesList.push(`Child is ${deceasedAge} years old. Coverage only up to ${maxAge} years.`);
      }
    }

    // Determine amounts
    const isNuclear = category === 'NUCLEAR_FAMILY';
    const benefitAmount = isNuclear
      ? Number(settings?.nuclearBenefitAmount || 100000)
      : Number(settings?.parentBenefitAmount || 60000);
    const contributionPerMember = isNuclear
      ? Number(settings?.nuclearContributionPerMember || 300)
      : Number(settings?.parentContributionPerMember || 200);

    // Get active members for contributions
    const activeMembers = await prisma.member.findMany({
      where: { status: 'ACTIVE', id: { not: memberId } },
    });
    const totalExpected = activeMembers.length;

    // Create bereavement case
    const bereavementCase = await prisma.bereavementCase.create({
      data: {
        memberId,
        deceasedName,
        deceasedRelationship,
        deceasedAge,
        dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null,
        dateOfBurial: dateOfBurial ? new Date(dateOfBurial) : null,
        burialLocation,
        category,
        contributionPerMember,
        totalExpected,
        benefitAmount,
        memberEligible,
        eligibilityNotes: eligibilityNotesList.join(' '),
        waitingPeriodSatisfied,
        loggedBy: session.user.id,
        contributionDeadline: dateOfBurial
          ? new Date(new Date(dateOfBurial).getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      include: { member: { include: { district: true } } },
    });

    // Create case contributions for all active members
    if (memberEligible) {
      await prisma.caseContribution.createMany({
        data: activeMembers.map((m) => ({
          caseId: bereavementCase.id,
          memberId: m.id,
          expectedAmount: contributionPerMember,
        })),
      });

      // Send notifications
      for (const m of activeMembers) {
        await prisma.notification.create({
          data: {
            memberId: m.id,
            type: 'BEREAVEMENT_NOTICE',
            channel: 'SMS',
            message: `Bereavement case: ${deceasedName}. Your contribution of Ksh ${contributionPerMember} is due by ${bereavementCase.contributionDeadline?.toLocaleDateString()}.`,
            recipientPhone: m.phone,
            status: 'PENDING',
          },
        });
      }
    }

    return NextResponse.json({ case: bereavementCase }, { status: 201 });
  } catch (error) {
    console.error('Create bereavement case error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
