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

    // Members can only view their own profile
    if (!isAdmin(session) && session.user.memberId !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        district: true,
        user: { select: { id: true, email: true, isActive: true } },
        children: true,
        contributions: {
          orderBy: { paidDate: 'desc' },
          take: 20,
        },
        caseContributions: {
          include: {
            case: {
              select: {
                id: true,
                deceasedName: true,
                deceasedRelationship: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        annualRenewals: {
          orderBy: { year: 'desc' },
          take: 5,
        },
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        bereavementCases: {
          where: { memberEligible: true },
          include: {
            caseContributions: {
              where: { status: 'PAID' },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Get member error:', error);
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

    const member = await prisma.member.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        otherNames: body.otherNames,
        phone: body.phone,
        email: body.email,
        districtId: body.districtId,
        churchMembershipDate: body.churchMembershipDate ? new Date(body.churchMembershipDate) : undefined,
        churchDurationYears: body.churchDurationYears,
        isNewChurchMember: body.isNewChurchMember,
        spouseName: body.spouseName,
        spouseAlive: body.spouseAlive,
        fatherName: body.fatherName,
        fatherAlive: body.fatherAlive,
        motherName: body.motherName,
        motherAlive: body.motherAlive,
        nextOfKinName: body.nextOfKinName,
        nextOfKinPhone: body.nextOfKinPhone,
        nextOfKinRelationship: body.nextOfKinRelationship,
        joiningFeePaid: body.joiningFeePaid,
        registrationFeePaid: body.registrationFeePaid,
        dateJoinedWelfare: body.dateJoinedWelfare ? new Date(body.dateJoinedWelfare) : undefined,
      },
      include: { district: true },
    });

    // Also update user phone if member phone changed
    if (member.userId && body.phone) {
      await prisma.user.update({
        where: { id: member.userId },
        data: { phone: body.phone },
      });
    }

    return NextResponse.json({ member });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
