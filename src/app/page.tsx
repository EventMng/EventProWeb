import { redirect } from 'next/navigation';

// '/' always sends visitors to the login page, regardless of whether a
// session exists — the admin dashboard now lives at /dashboard instead.
// This is deliberate (per explicit request): visiting localhost:3000
// should always show the login screen, not silently resume a logged-in
// session on the root URL.
export default function RootPage() {
  redirect('/login');
}
