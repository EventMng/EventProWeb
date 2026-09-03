import type { UserRole } from '@prisma/client';

export const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'System Admin',
  ORG_ADMIN: 'Org Admin',
  ORGANIZER: 'Organizer',
  FRONTMAN: 'Frontman',
};
