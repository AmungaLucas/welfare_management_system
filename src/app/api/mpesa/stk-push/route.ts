import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { initiateSTKPush } from '@/lib/mpesa';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { phone, amount, reference, description } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json({ error: 'Phone and amount are required' }, { status: 400 });
    }

    const result = await initiateSTKPush({
      phone: String(phone).startsWith('0') ? `254${phone.slice(1)}` : phone,
      amount: Number(amount),
      reference: reference || `WLF${Date.now()}`,
      description: description || 'Welfare Payment',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('M-Pesa STK push error:', error);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}
