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

## System Workflow & Role Architecture

1. **Organization Admin (`ORG_ADMIN`)**:
   - Registers their personal account first and creates the Organization.
   - Creates Events and manages team members.
   - Invites/Adds Members to the Organization and issues **Temporary Passwords** for Mobile App Scanner access.

2. **Members & Event Role Assignment**:
   - Regular Members do **not** self-register; they are added directly by the Organization Admin.
   - Members are assigned temporary event roles per event:
     - `ORGANIZER`: Event coordinator and manager.
     - `FRONTMAN`: Gate staff responsible for ticket scanning on the Mobile App.

3. **Frontmen & Mobile App Access**:
   - Frontmen log into the `EventProMobile` app using their Username (Email) and generated **Temporary Password**.
   - Frontmen scan participant QR codes at event entry gates.

---

## Data Audit & QR Attendance Tracking Specs

### Participant Creation Data
When an Organization Admin adds/registers a Participant:
- `id`: Auto-generated UUID.
- `organizationId`: Associated Organization ID.
- `createdById`: User ID of the Organization Admin who created the participant.
- `fullName`: Full Name of the participant.
- `email`: Email address.
- `imageUrl`: Optional avatar image URL.

### Frontman QR Scan Attendance Data
When a Frontman scans a participant's QR code via `/api/scanner/mark-attendance`:
- `markedBy`: User ID of the Frontman who performed the scan.
- `attendedAt`: Timestamp (`DateTime`) of the exact scan time.
- `attended`: Attendance status set to `true`.

---

## Database Sync & Migrations

```bash
# 1. Update TypeScript Prisma Client definitions after schema changes
npx prisma generate

# 2. Sync schema changes directly to the live PostgreSQL (Neon) Database
npx prisma db push

# 3. Create a named migration file for version control (optional)
npx prisma migrate dev --name <migration_name>

# 4. Open Prisma Studio to inspect live database tables
npx prisma studio
```

## Commands

```bash
npm run dev         # start dev server
npm run build        # production build
npm run start        # run production build
npm run lint
npx prisma studio    # inspect the database
npx prisma db push   # sync schema to live database
```