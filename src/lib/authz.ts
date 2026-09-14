import { NextResponse } from "next/server";
import type { SessionUser } from "@/types/auth";
import type { UserRole } from "@prisma/client";

export function requireRole(
  user: SessionUser,
  allowed: UserRole[]
): NextResponse | null {
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}

export function requireSameOrg(
  user: SessionUser,
  resourceOrgId: string
): NextResponse | null {
  if (user.organizationId !== resourceOrgId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}
