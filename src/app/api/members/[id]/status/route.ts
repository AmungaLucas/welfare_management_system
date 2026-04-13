import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';

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
    const { status, reason } = await req.json();

    if (!['ACTIVE', 'SUSPENDED', 'REMOVED', 'PENDING_APPROVAL'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'SUSPENDED') {
      const settings = await prisma.settings.findFirst();
      const duration = (settings?.suspensionDurationMonths || 6);
      updateData.suspendedUntil = new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000);
    }

    if (status === 'REMOVED') {
      updateData.removedFromRegister = true;
      updateData.removalDate = new Date();
    }

    if (status === 'ACTIVE') {
      updateData.suspendedUntil = null;
      updateData.removedFromRegister = false;
      updateData.removalDate = null;
      updateData.dateJoinedWelfare = updateData.dateJoinedWelfare || new Date();
    }

    const updated = await prisma.member.update({
      where: { id },
      data: updateData,
      include: { district: true },
    });

    // Create notification
    if (updated.userId || member.phone) {
      const statusMessages: Record<string, string> = {
        ACTIVE: 'Your membership has been approved. Welcome to ACK St. Monica Welfare!',
        SUSPENDED: `Your membership has been suspended. Reason: ${reason || 'Policy violation'}.`,
        REMOVED: `Your membership has been removed. Reason: ${reason || 'Policy violation'}.`,
      };

      await prisma.notification.create({
        data: {
          memberId: id,
          type: 'REGISTRATION_APPROVAL',
          channel: 'SMS',
          message: statusMessages[status] || `Your membership status has been updated to ${status}.`,
          recipientPhone: member.phone,
          status: 'PENDING',
        },
      });
    }

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error('Update member status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
