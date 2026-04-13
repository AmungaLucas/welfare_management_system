import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session) {
      return NextResponse.json({ error: 'Already logged in' }, { status: 400 });
    }

    const body = await req.json();
    const {
      churchMembershipNo, firstName, lastName, phone, email, districtId, password,
      churchMembershipDate, isNewChurchMember, spouseName, spouseAlive,
      nextOfKinName, nextOfKinPhone, nextOfKinRelationship,
    } = body;

    if (!churchMembershipNo || !firstName || !lastName || !phone || !districtId || !password) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const existingMember = await prisma.member.findUnique({ where: { churchMembershipNo } });
    if (existingMember) {
      return NextResponse.json({ error: 'Church membership number already registered' }, { status: 409 });
    }

    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    const district = await prisma.district.findUnique({ where: { id: districtId } });
    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userEmail = email || `${churchMembershipNo.toLowerCase().replace(/[/\s]/g, '_')}@welfare.local`;

    const user = await prisma.user.create({
      data: { email: userEmail, passwordHash, role: 'MEMBER', isActive: true, phone },
    });

    let churchDurationYears: number | null = null;
    let isNew = false;
    if (churchMembershipDate) {
      const joinDate = new Date(churchMembershipDate);
      const now = new Date();
      churchDurationYears = Math.floor((now.getTime() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const settings = await prisma.settings.findFirst();
      isNew = churchDurationYears <= (settings?.newChurchMemberYears || 2);
    }

    const member = await prisma.member.create({
      data: {
        userId: user.id, churchMembershipNo, firstName, lastName, phone,
        email: email || null, districtId,
        churchMembershipDate: churchMembershipDate ? new Date(churchMembershipDate) : null,
        churchDurationYears, isNewChurchMember: isNew ?? isNewChurchMember ?? false,
        status: 'PENDING_APPROVAL',
        spouseName: spouseName || null, spouseAlive: spouseAlive ?? true,
        nextOfKinName: nextOfKinName || null, nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
      },
      include: { district: true },
    });

    return NextResponse.json({
      message: 'Registration successful! Your account is pending admin approval.',
      member: {
        id: member.id, churchMembershipNo: member.churchMembershipNo,
        name: `${member.firstName} ${member.lastName}`, status: member.status, district: member.district.name,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
