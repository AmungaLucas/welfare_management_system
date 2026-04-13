import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Force-read DATABASE_URL from the local .env file to avoid
 * system-level env var overrides (e.g. a SQLite path set globally).
 * On Vercel, the .env file doesn't exist, so it falls back to
 * process.env.DATABASE_URL which is injected by Vercel's env settings.
 */
function loadDatabaseUrl(): string {
  // First try: read from .env file (local development)
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        let val = trimmed.substring('DATABASE_URL='.length).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (val.length > 0) {
          return val;
        }
      }
    }
  } catch {
    // .env file not found (expected on Vercel) — fall through
  }

  // Fallback: use process.env (Vercel injects env vars this way)
  return process.env.DATABASE_URL ?? '';
}

const databaseUrl = loadDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
