import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, string> = {};

  // Check env vars
  results.DATABASE_URL_SET = process.env.DATABASE_URL ? 'YES' : 'NO';
  results.JWT_SECRET_SET = process.env.JWT_SECRET ? 'YES' : 'NO';

  // Check DATABASE_URL format (mask password)
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('mysql://')) {
    try {
      const url = new URL(dbUrl);
      results.DB_HOST = url.hostname;
      results.DB_PORT = url.port || '3306';
      results.DB_NAME = url.pathname.slice(1);
      results.DB_USER = url.username;
      results.URL_SAFE = 'YES';
    } catch {
      results.URL_SAFE = 'PARSE_ERROR';
    }
  } else {
    results.URL_SAFE = 'NOT_MYSQL';
  }

  // Try importing prisma
  try {
    const { PrismaClient } = await import('@/generated/prisma/client');
    results.PRISMA_IMPORT = 'OK';
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      results.DB_CONNECT = 'OK';
      const userCount = await prisma.user.count();
      results.USER_COUNT = String(userCount);
      await prisma.$disconnect();
    } catch (e: unknown) {
      results.DB_CONNECT = 'FAILED';
      results.DB_ERROR = String((e as { message?: string })?.message || e).substring(0, 300);
    }
  } catch (e: unknown) {
    results.PRISMA_IMPORT = 'FAILED';
    results.PRISMA_ERROR = String((e as { message?: string })?.message || e).substring(0, 300);
  }

  return NextResponse.json(results);
}
