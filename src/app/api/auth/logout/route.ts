import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logout successful" });

  // Clear the session cookie set by login/register.
  response.cookies.set({
    name: "eventpro_session",
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });

  return response;
}
