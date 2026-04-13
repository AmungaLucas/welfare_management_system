import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const districtId = searchParams.get('districtId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (isAdmin(session)) {
      if (status) where.status = status;
      if (districtId) where.districtId = parseInt(districtId);
      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { churchMembershipNo: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ];
      }
    } else {
      where.id = session.user.memberId;
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: { district: true, user: { select: { id: true, isActive: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.member.count({ where }),
    ]);

    return NextResponse.json({
      members,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get members error:', error);
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
    console.log('[POST /api/members] Body received:', JSON.stringify(body, null, 2));
    const {
      churchMembershipNo, firstName, lastName, otherNames, phone, email, districtId,
      churchMembershipDate, isNewChurchMember, spouseName, spouseAlive,
      fatherName, fatherAlive, motherName, motherAlive,
      nextOfKinName, nextOfKinPhone, nextOfKinRelationship,
      status, joiningFeePaid, registrationFeePaid, dateJoinedWelfare,
      password,
    } = body;

    // Validate required fields — return specific error for each missing field
    const missing: string[] = [];
    if (!churchMembershipNo) missing.push('Church Membership No');
    if (!firstName) missing.push('First Name');
    if (!lastName) missing.push('Last Name');
    if (!phone) missing.push('Phone');
    if (!districtId) missing.push('District');
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    // Ensure districtId is a valid integer
    const parsedDistrictId = parseInt(String(districtId), 10);
    if (isNaN(parsedDistrictId)) {
      return NextResponse.json({ error: 'Invalid district ID' }, { status: 400 });
    }

    // When setting to ACTIVE directly, a password is required for login
    const memberStatus = status || 'PENDING_APPROVAL';
    if (memberStatus === 'ACTIVE' && !password) {
      return NextResponse.json({ error: 'Password is required when setting member as Active' }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.member.findUnique({ where: { churchMembershipNo } });
    if (existing) {
      return NextResponse.json({ error: 'Church membership number already exists' }, { status: 409 });
    }

    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    // Compute church membership duration
    let churchDurationYears: number | null = null;
    let isNew = isNewChurchMember === true;
    if (churchMembershipDate) {
      const joinDate = new Date(churchMembershipDate);
      const now = new Date();
      if (!isNaN(joinDate.getTime())) {
        churchDurationYears = Math.floor((now.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const settings = await prisma.settings.findFirst();
        isNew = churchDurationYears <= (settings?.newChurchMemberYears || 2);
      }
    }

    // Create a User account if status is ACTIVE (so member can log in immediately)
    let userId: string | null = null;
    if (memberStatus === 'ACTIVE' && password) {
      const passwordHash = await bcrypt.hash(String(password), 10);
      const userEmail = (email || `${churchMembershipNo.toLowerCase().replace(/[/\s]/g, '_')}@welfare.local`).toLowerCase();
      const user = await prisma.user.create({
        data: { email: userEmail, passwordHash, role: 'MEMBER', isActive: true, phone: String(phone) },
      });
      userId = user.id;
    }

    // Parse fee amounts safely for Prisma Decimal fields
    const parseDecimal = (val: unknown): Prisma.Decimal | number => {
      if (val === null || val === undefined || val === '') return 0;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    };

    const member = await prisma.member.create({
      data: {
        userId,
        churchMembershipNo: String(churchMembershipNo),
        firstName: String(firstName),
        lastName: String(lastName),
        otherNames: otherNames ? String(otherNames) : null,
        phone: String(phone),
        email: email ? String(email) : null,
        districtId: parsedDistrictId,
        churchMembershipDate: churchMembershipDate ? new Date(String(churchMembershipDate)) : null,
        churchDurationYears,
        isNewChurchMember: isNew,
        spouseName: spouseName ? String(spouseName) : null,
        spouseAlive: spouseAlive === true ? true : spouseAlive === false ? false : null,
        fatherName: fatherName ? String(fatherName) : null,
        fatherAlive: fatherAlive === true ? true : fatherAlive === false ? false : null,
        motherName: motherName ? String(motherName) : null,
        motherAlive: motherAlive === true ? true : motherAlive === false ? false : null,
        nextOfKinName: nextOfKinName ? String(nextOfKinName) : null,
        nextOfKinPhone: nextOfKinPhone ? String(nextOfKinPhone) : null,
        nextOfKinRelationship: nextOfKinRelationship ? String(nextOfKinRelationship) : null,
        status: memberStatus,
        joiningFeePaid: parseDecimal(joiningFeePaid),
        registrationFeePaid: parseDecimal(registrationFeePaid),
        dateJoinedWelfare: dateJoinedWelfare ? new Date(String(dateJoinedWelfare)) : null,
      },
      include: { district: true },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create member error:', error);

    // Return detailed error for debugging (restrict in production later)
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = (error as { code?: string })?.code;

    // Handle known Prisma errors
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate entry — this record already exists' }, { status: 409 });
    }
    if (code === 'P2003') {
      return NextResponse.json({ error: 'Foreign key constraint failed — check district ID' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create member', details: message },
      { status: 500 },
    );
  }
}
