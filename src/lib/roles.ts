import type { UserRole as PrismaUserRole } from '@prisma/client';

export type UserRole = PrismaUserRole | 'MEMBER';

export const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'System Admin',
  ORG_ADMIN: 'Org Admin',
  ORGANIZER: 'Organizer',
  FRONTMAN: 'Frontman',
  MEMBER: 'Member',
};
