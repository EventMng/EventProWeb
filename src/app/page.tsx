import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import DashboardClient from '@/components/dashboard/DashboardClient';

// Requires a real eventpro_session cookie to view the dashboard — this check
// intentionally does NOT honor DEV_BYPASS_AUTH (see src/lib/session.ts):
// that bypass exists only so API routes can be exercised without real login
// during development, not to make the dashboard page itself publicly
// viewable. Unauthenticated visitors are sent to /login.
async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get('eventpro_session')?.value;
  if (!token) return null;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { primaryOrganization: true },
  });

  if (!user || !user.primaryOrganization) {
    redirect('/login');
  }

  return (
    <DashboardClient
      fullName={user.fullName}
      organizationName={user.primaryOrganization.name}
      role={user.role}
    />
  );
}
