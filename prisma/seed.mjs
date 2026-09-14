// Seeds the dev Organization + Org Admin user used by the DEV_BYPASS_AUTH
// session fallback in src/lib/session.ts. Safe to re-run (upserts).
import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const db = new PrismaClient();

const DEV_ORG_ID = '00000000-0000-4000-8000-000000000001';
const DEV_USER_ID = '00000000-0000-4000-8000-000000000002';
const DEV_FRONTMAN_USER_ID = '00000000-0000-4000-8000-000000000003';
const DEV_ORGANIZER_USER_ID = '00000000-0000-4000-8000-000000000004';

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function main() {
  await db.organization.upsert({
    where: { id: DEV_ORG_ID },
    update: {},
    create: { id: DEV_ORG_ID, name: 'Dev Org (seeded)' },
  });

  await db.user.upsert({
    where: { id: DEV_USER_ID },
    update: {
      organizations: {
        connect: { id: DEV_ORG_ID },
      },
    },
    create: {
      id: DEV_USER_ID,
      organizationId: DEV_ORG_ID,
      organizations: {
        connect: { id: DEV_ORG_ID },
      },
      fullName: 'Dev Admin',
      email: 'dev-admin@eventpro.local',
      passwordHash: await hashPassword('dev-only-not-a-real-password'),
      role: 'ORG_ADMIN',
      isTemporaryPassword: false,
    },
  });

  await db.user.upsert({
    where: { id: DEV_FRONTMAN_USER_ID },
    update: {
      organizations: {
        connect: { id: DEV_ORG_ID },
      },
    },
    create: {
      id: DEV_FRONTMAN_USER_ID,
      organizationId: DEV_ORG_ID,
      organizations: {
        connect: { id: DEV_ORG_ID },
      },
      fullName: 'Dev Frontman',
      email: 'dev-frontman@eventpro.local',
      passwordHash: await hashPassword('dev-only-not-a-real-password'),
      role: 'FRONTMAN',
      isTemporaryPassword: true,
    },
  });

  await db.user.upsert({
    where: { id: DEV_ORGANIZER_USER_ID },
    update: {
      organizations: {
        connect: { id: DEV_ORG_ID },
      },
    },
    create: {
      id: DEV_ORGANIZER_USER_ID,
      organizationId: DEV_ORG_ID,
      organizations: {
        connect: { id: DEV_ORG_ID },
      },
      fullName: 'Kamal Perera',
      email: 'dev-organizer@eventpro.local',
      passwordHash: await hashPassword('dev-only-not-a-real-password'),
      role: 'ORGANIZER',
      isTemporaryPassword: false,
    },
  });

  console.log('Seeded dev org + org admin + frontman + organizer users.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
