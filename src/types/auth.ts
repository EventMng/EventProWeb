import type { UserRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
}
