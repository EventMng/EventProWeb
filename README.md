# EventProFrontend
Frontend Development

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