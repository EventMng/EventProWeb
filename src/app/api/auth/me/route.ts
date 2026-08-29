import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: { primaryOrganization: true },
  });

  if (!user || !user.primaryOrganization) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.primaryOrganization.name,
      isTemporaryPassword: user.isTemporaryPassword,
      imageUrl: (user as any).imageUrl ?? null,
    },
  });
}
