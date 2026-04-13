import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 });
    }

    // Parse CSV header
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = ['church_membership_no', 'first_name', 'last_name', 'phone', 'district'];
    for (const rh of requiredHeaders) {
      if (!headers.includes(rh)) {
        return NextResponse.json({ error: `Missing required column: ${rh}` }, { status: 400 });
      }
    }

    const districts = await prisma.district.findMany();
    const districtMap = new Map(districts.map((d) => [d.name.toLowerCase(), d.id]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Invalid number of columns`);
        skipped++;
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });

      try {
        const districtId = districtMap.get(row.district.toLowerCase());
        if (!districtId) {
          errors.push(`Row ${i + 1}: Unknown district "${row.district}"`);
          skipped++;
          continue;
        }

        const existing = await prisma.member.findUnique({
          where: { churchMembershipNo: row.church_membership_no },
        });
        if (existing) {
          errors.push(`Row ${i + 1}: Membership No already exists`);
          skipped++;
          continue;
        }

        const lastMember = await prisma.member.findFirst({
          orderBy: { welfareNo: 'desc' }, select: { welfareNo: true },
        });
        const welfareNo = (lastMember?.welfareNo || 0) + 1;

        const email = row.email || `${row.church_membership_no.toLowerCase().replace(/[/\s]/g, '_')}@welfare.local`;
        const passwordHash = await bcrypt.hash('member123', 10);

        const user = await prisma.user.create({
          data: { email, passwordHash, role: 'MEMBER', isActive: true, phone: row.phone },
        });

        await prisma.member.create({
          data: {
            userId: user.id,
            churchMembershipNo: row.church_membership_no,
            welfareNo,
            firstName: row.first_name,
            lastName: row.last_name,
            otherNames: row.other_names || null,
            phone: row.phone,
            email: row.email || null,
            districtId,
            status: 'PENDING_APPROVAL',
            nextOfKinName: row.next_of_kin_name || null,
            nextOfKinPhone: row.next_of_kin_phone || null,
            nextOfKinRelationship: row.next_of_kin_relationship || null,
          },
        });

        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${String(err)}`);
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (error) {
    console.error('Import members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
