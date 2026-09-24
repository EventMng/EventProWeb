import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import DashboardClient from '@/components/dashboard/DashboardClient';

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

export default async function AdminDashboardPage() {
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
