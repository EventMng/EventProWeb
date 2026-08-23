import { describe, it, expect } from 'vitest';
import { requireRole, requireSameOrg } from './authz';
import type { SessionUser } from '@/types/auth';

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user_1',
    organizationId: 'org_1',
    email: 'admin@example.com',
    role: 'ORG_ADMIN',
    ...overrides,
  };
}

describe('requireRole', () => {
  it('allows a user whose role is in the allowed list', () => {
    const user = makeUser({ role: 'ORGANIZER' });
    expect(requireRole(user, ['ORG_ADMIN', 'ORGANIZER'])).toBeNull();
  });

  it('rejects a user whose role is not in the allowed list', async () => {
    const user = makeUser({ role: 'FRONTMAN' });
    const result = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    expect(await result?.json()).toEqual({ error: 'FORBIDDEN' });
  });
});

describe('requireSameOrg', () => {
  it('allows a user whose organizationId matches the resource', () => {
    const user = makeUser({ organizationId: 'org_1' });
    expect(requireSameOrg(user, 'org_1')).toBeNull();
  });

  it('rejects a user from a different organization', async () => {
    const user = makeUser({ organizationId: 'org_1' });
    const result = requireSameOrg(user, 'org_2');

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    expect(await result?.json()).toEqual({ error: 'FORBIDDEN' });
  });
});
