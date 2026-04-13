import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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
      // Admin sees all members
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
      // Member sees only their own data
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
    const {
      churchMembershipNo, firstName, lastName, otherNames, phone, email, districtId,
      churchMembershipDate, isNewChurchMember, spouseName, spouseAlive,
      fatherName, fatherAlive, motherName, motherAlive,
      nextOfKinName, nextOfKinPhone, nextOfKinRelationship,
      status, joiningFeePaid, registrationFeePaid, dateJoinedWelfare,
      password,
    } = body;

    if (!churchMembershipNo || !firstName || !lastName || !phone || !districtId) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // When setting to ACTIVE directly, a password is required for login
    const memberStatus = status || 'PENDING_APPROVAL';
    if (memberStatus === 'ACTIVE' && !password) {
      return NextResponse.json({ error: 'Password is required when setting member as Active' }, { status: 400 });
    }

    const existing = await prisma.member.findUnique({ where: { churchMembershipNo } });
    if (existing) {
      return NextResponse.json({ error: 'Church membership number already exists' }, { status: 409 });
    }

    // Check email uniqueness if provided
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    const lastMember = await prisma.member.findFirst({ orderBy: { welfareNo: 'desc' }, select: { welfareNo: true } });
    const welfareNo = (lastMember?.welfareNo || 0) + 1;

    let churchDurationYears: number | null = null;
    let isNew = isNewChurchMember || false;
    if (churchMembershipDate) {
      const joinDate = new Date(churchMembershipDate);
      const now = new Date();
      churchDurationYears = Math.floor((now.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const settings = await prisma.settings.findFirst();
      isNew = churchDurationYears <= (settings?.newChurchMemberYears || 2);
    }

    // Create a User account if status is ACTIVE (so member can log in immediately)
    let userId: string | null = null;
    if (memberStatus === 'ACTIVE' && password) {
      const passwordHash = await bcrypt.hash(password, 10);
      const userEmail = email || `${churchMembershipNo.toLowerCase().replace(/[/\s]/g, '_')}@welfare.local`;
      const user = await prisma.user.create({
        data: { email: userEmail, passwordHash, role: 'MEMBER', isActive: true, phone },
      });
      userId = user.id;
    }

    const member = await prisma.member.create({
      data: {
        userId,
        churchMembershipNo, welfareNo, firstName, lastName, otherNames: otherNames || null,
        phone, email: email || null, districtId,
        churchMembershipDate: churchMembershipDate ? new Date(churchMembershipDate) : null,
        churchDurationYears, isNewChurchMember: isNew,
        spouseName: spouseName || null, spouseAlive: spouseAlive ?? true,
        fatherName: fatherName || null, fatherAlive: fatherAlive ?? true,
        motherName: motherName || null, motherAlive: motherAlive ?? true,
        nextOfKinName: nextOfKinName || null, nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
        status: memberStatus,
        joiningFeePaid: joiningFeePaid || 0,
        registrationFeePaid: registrationFeePaid || 0,
        dateJoinedWelfare: dateJoinedWelfare ? new Date(dateJoinedWelfare) : null,
      },
      include: { district: true },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Create member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
