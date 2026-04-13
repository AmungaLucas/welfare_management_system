import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const districts = await prisma.district.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json({ districts });
  } catch (error) {
    console.error('Get districts error:', error);
    return NextResponse.json({ error: 'Failed to fetch districts' }, { status: 500 });
  }
}
