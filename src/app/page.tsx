import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import DashboardClient from '@/components/dashboard/DashboardClient';

// Requires a real eventpro_session cookie to view the dashboard — this check
// intentionally does NOT honor DEV_BYPASS_AUTH (see src/lib/session.ts):
// that bypass exists only so API routes can be exercised without real login
// during development, not to make the dashboard page itself publicly
// viewable. Unauthenticated visitors are sent to /login.
async function hasValidSession(): Promise<boolean> {
  const token = (await cookies()).get('eventpro_session')?.value;
  if (!token) return false;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export default async function DashboardPage() {
  if (!(await hasValidSession())) {
    redirect('/login');
  }

  return <DashboardClient />;
}
