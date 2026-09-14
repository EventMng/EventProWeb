import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";

// PATCH /api/organization — rename the caller's own organization (ORG_ADMIN only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN"]);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { name } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }

    const organization = await db.organization.update({
      where: { id: user.organizationId },
      data: { name: name.trim() },
      select: { id: true, name: true },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Failed to update organization:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
