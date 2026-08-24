import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import type { SessionUser } from "@/types/auth";

const getSessionSecretKey = (): Uint8Array => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
};

// TEMPORARY DEV-ONLY BYPASS — real login/session issuance isn't built yet.
// When DEV_BYPASS_AUTH=true and no valid session token is present, requests
// are treated as a seeded dev user (see prisma/seed.mjs) so pages and the
// mobile scanner flow can be built/tested against the real DB before auth
// exists. The `x-dev-role` header picks which seeded dev user to act as
// (defaults to the Org Admin) — EventProMobile's api.ts sets it to
// "FRONTMAN" so the scanner flow can be exercised before real mobile login
// exists. Remove this whole block once POST /api/auth/login issues real
// tokens for both apps.
export const DEV_ORG_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_USER_ID = "00000000-0000-4000-8000-000000000002";
export const DEV_FRONTMAN_USER_ID = "00000000-0000-4000-8000-000000000003";

const DEV_SESSION_USERS: Record<string, SessionUser> = {
  ORG_ADMIN: {
    id: DEV_USER_ID,
    organizationId: DEV_ORG_ID,
    email: "dev-admin@eventpro.local",
    role: "ORG_ADMIN" as SessionUser["role"],
  },
  FRONTMAN: {
    id: DEV_FRONTMAN_USER_ID,
    organizationId: DEV_ORG_ID,
    email: "dev-frontman@eventpro.local",
    role: "FRONTMAN" as SessionUser["role"],
  },
};

function getDevBypassUser(request: NextRequest): SessionUser | null {
  if (process.env.DEV_BYPASS_AUTH !== "true") return null;
  const requestedRole = request.headers.get("x-dev-role")?.toUpperCase();
  return DEV_SESSION_USERS[requestedRole ?? "ORG_ADMIN"] ?? DEV_SESSION_USERS.ORG_ADMIN;
}

export async function getSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const cookieToken = request.cookies.get("eventpro_session")?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return getDevBypassUser(request);
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    return payload as unknown as SessionUser;
  } catch {
    // Falls back to the dev bypass so EventProMobile's still-mocked
    // "demo-token" keeps working locally instead of hard-failing with 401.
    return getDevBypassUser(request);
  }
}
