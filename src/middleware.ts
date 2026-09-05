import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Pages reachable without a session. Everything else under this matcher
// requires a valid eventpro_session cookie, or the visitor is sent to
// /login — including a direct URL typed straight into the address bar.
const PUBLIC_PATHS = ['/login', '/signup'];

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('eventpro_session')?.value;
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (await hasValidSession(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: [
    // Every page route except API routes (which handle their own auth,
    // including the DEV_BYPASS_AUTH dev convenience — untouched here) and
    // Next.js internals/static files.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
