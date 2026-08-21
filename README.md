# EventProWeb
Frontend Development

## Role in the system
Next.js web app that serves as the backend and admin/organizer dashboard for EventPro. Org Admins manage members and Frontmen, Organizers create events and manage participants, and this app's `api/scanner/*` endpoints are called by `EventProMobile` to verify and mark attendance. It also owns the PostgreSQL schema (via Prisma) and sends participants their QR code invitations by email.

## Tech Stack & Core Technologies
* **Framework:** Next.js 14+ (App Router, Server Actions & API Route Handlers)
* **Language:** TypeScript
* **Database:** PostgreSQL
* **ORM:** Prisma ORM
* **Authentication & Authorization:** NextAuth.js / JWT with Role-Based Access Control (RBAC)
* **Styling & UI:** Tailwind CSS, shadcn/ui, Lucide React Icons
* **Email Delivery:** Resend / Nodemailer (for QR invitation delivery)
* **QR Generation & Cryptography:** `qrcode` & Node.js `crypto` / `jose` (for HMAC/JWT-signed secure tokens)

### DevOps & Infrastructure
* **Architecture:** Multi-Repository (Decoupled Web & Mobile clients)
* **Database Hosting:** Supabase / Neon / AWS RDS (PostgreSQL)
* **Web Hosting:** Vercel
* **Mobile Distribution:** Expo Application Services (EAS Build)
* **Version Control:** Git & GitHub

## folder arch
```text
event-system-web/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── prisma/
│   └── schema.prisma                  # PostgreSQL Database Schema
│
├── public/                            # Static assets (Logos, Icons)
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Landing / Root Login
│   │   │
│   │   ├── (auth)/                    # Auth Route Group
│   │   │   ├── login/
│   │   │   └── reset-password/
│   │   │
│   │   ├── (dashboard)/               # Protected Dashboard Views
│   │   │   ├── layout.tsx             # Sidebar & Topbar Shell
│   │   │   ├── admin/                 # Org Admin (Members & Frontmen)
│   │   │   ├── events/                # Event creation & Participant list
│   │   │   └── reports/               # Attendance & Analytics
│   │   │
│   │   └── api/                       # REST Endpoints
│   │       ├── auth/
│   │       ├── events/
│   │       ├── participants/
│   │       ├── reports/
│   │       └── scanner/               # Endpoints consumed by Mobile App
│   │           ├── verify/route.ts
│   │           └── mark-attendance/route.ts
│   │
│   ├── components/                    # UI Components
│   │   ├── ui/                        # shadcn / Base components (Button, Modal, Table)
│   │   ├── events/                    # Event-specific forms & cards
│   │   ├── reports/                   # Chart & stats widgets
│   │   └── shared/                    # Header, Navigation, Avatar
│   │
│   ├── lib/                           # Core utilities
│   │   ├── db.ts                      # Prisma client instance
│   │   ├── mailer.ts                  # QR email delivery service
│   │   ├── qr-token.ts                # Token encryption & signing
│   │   └── utils.ts
│   │
│   └── types/                         # TypeScript interfaces & DTOs
│       ├── database.ts
│       ├── api.ts
│       └── auth.ts

```