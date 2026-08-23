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

export async function getSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get("eventpro_session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
