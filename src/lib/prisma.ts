import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

/**
 * Force-read DATABASE_URL from the .env file to avoid
 * system-level env var overrides (e.g. a SQLite path set globally).
 */
function loadDbUrlFromDotEnv(): string {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        let val = trimmed.substring('DATABASE_URL='.length).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        return val;
      }
    }
  } catch {
    // .env not found – fall through to process.env
  }
  return process.env.DATABASE_URL ?? '';
}

const dbUrl = loadDbUrlFromDotEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
