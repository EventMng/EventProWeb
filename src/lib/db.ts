import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Neon's serverless Postgres scales to zero when idle and needs a moment
  // to wake up on the first connection after inactivity — the very first
  // query can fail with "Can't reach database server" even though the
  // very next one succeeds immediately. Retry that specific transient
  // failure once with a short delay instead of surfacing a 500 for what's
  // really just a cold start.
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          try {
            return await query(args);
          } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.includes("Can't reach database server")) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              return await query(args);
            }
            throw error;
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
