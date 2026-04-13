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
    const { attendees } = await req.json();

    if (!attendees || !Array.isArray(attendees)) {
      return NextResponse.json({ error: 'Attendees array required' }, { status: 400 });
    }

    const caseData = await prisma.bereavementCase.findUnique({ where: { id } });
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Delete existing attendees
    await prisma.burialAttendee.deleteMany({ where: { caseId: id } });

    // Create new attendees
    const created = await prisma.burialAttendee.createMany({
      data: attendees.map((a: { memberId: string; role?: string }) => ({
        caseId: id,
        memberId: a.memberId,
        role: a.role || 'Representative',
      })),
    });

    return NextResponse.json({
      message: `${created.count} burial attendees assigned`,
      count: created.count,
    });
  } catch (error) {
    console.error('Assign attendees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
