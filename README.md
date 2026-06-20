# Solaris Diamond

A premium, all-in-one business management SaaS platform. Businesses subscribe to
the modules they need — **Inventory, Sales, Expenses, Point of Sale and
Attendance** — and run everything from one elegant, multi-tenant dashboard.

Design language: a fusion of Stripe, Linear, Apple, Vercel and Arc — black &
white dominant, a subtle Solaris-orange accent, glassmorphism, premium
micro-interactions and a tasteful 3D hero.

---

## ✨ Highlights

- **World-class marketing site** — glass navbar with a mega-menu, an interactive
  React Three Fiber diamond hero, services, bundles, pricing, about and contact.
- **Full authentication flow** — register, login, email OTP verification,
  new-device 2FA, forgot/reset password, session & device management.
- **Customer dashboard** — locked/unlocked modules, with five fully interactive
  modules backed by a persisted store.
- **Hidden admin console** at `/admin` — users, subscriptions, revenue, payments,
  services, and system / login / device logs.
- **Production architecture** — multi-tenant Prisma schema, PayMongo checkout +
  webhooks, Resend email, Supabase auth, all behind clean, key-guarded service
  layers.

## 🧱 Tech stack

| Area        | Choice                                                            |
| ----------- | ----------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack), React 19, TypeScript          |
| Styling     | Tailwind CSS v4, custom design tokens, shadcn-style primitives    |
| Animation   | Motion (Framer Motion), GSAP-ready, CSS keyframes                 |
| 3D          | React Three Fiber, Three.js, Drei                                 |
| State/Data  | Zustand (persisted), TanStack Query                               |
| Database    | PostgreSQL + Prisma 7 (node-postgres driver adapter)              |
| Auth        | Supabase Auth (SSR)                                               |
| Payments    | PayMongo (GCash, Maya, PayPal, Bank Transfer)                     |
| Email       | Resend                                                            |

## 🚀 Getting started

```bash
pnpm install
cp .env.example .env   # optional — the app runs without any keys
pnpm dev
```

Open <http://localhost:3000>.

> **Mock mode:** with no environment variables the app is fully functional.
> Auth, OTP and payments are simulated client-side and all module data is seeded
> and persisted to `localStorage`. Add keys to `.env` to switch any integration
> to its real implementation — no code changes required.

### Try it

- **Customer flow:** Register → verify the OTP (shown in a toast in dev) → land
  on the dashboard. Modules start locked; click **Unlock** (or subscribe via
  **Pricing → Checkout**) to activate them instantly.
- **Admin console:** visit `/admin/login` and sign in with the seeded
  super-admin: `admin@solarisdiamond.com` / `solaris-admin-2026`.

## 🗄️ Database

```bash
pnpm db:generate   # generate the Prisma client
pnpm db:push       # push the schema to your database
pnpm db:seed       # seed the super-admin + a demo tenant
pnpm db:studio     # browse data in Prisma Studio
```

Multi-tenancy: every customer-owned row carries a `tenantId`; application
queries always filter by the authenticated tenant, and Postgres Row-Level
Security enforces isolation at the database layer.

## 📁 Project structure

```
src/
├─ app/
│  ├─ (marketing)/        # public website (navbar + footer layout)
│  ├─ (auth)/             # register, login, verify, forgot/reset
│  ├─ (dashboard)/        # customer dashboard + 5 module pages
│  ├─ admin/              # hidden admin console (+ /admin/login)
│  ├─ checkout/           # PayMongo-style checkout flow
│  └─ api/                # checkout + PayMongo webhook route handlers
├─ components/
│  ├─ ui/                 # shadcn-style primitives
│  ├─ marketing/ three/   # site sections + 3D scene
│  ├─ dashboard/ admin/   # app chrome, charts, gates
│  └─ motion/             # reveal, magnetic, counters
├─ lib/
│  ├─ data/               # services, bundles, marketing & admin datasets
│  ├─ store/              # zustand stores (auth, business, admin)
│  ├─ payments/ email/ supabase/ db/   # key-guarded integration layers
│  └─ env.ts              # central env + `integrations` flags
└─ proxy.ts               # Next.js 16 route protection (was middleware)
prisma/
├─ schema.prisma          # multi-tenant data model
└─ seed.ts                # super-admin + demo tenant
```

## 🔒 Security & auth

- Email verification via OTP, with new-device detection triggering 2FA.
- Login activity, device logs and session management surfaced in settings.
- The admin account is seeded directly and never relies on email verification.

## 📦 Deployment

Deploy to Vercel. Add the environment variables from `.env.example`, point
`DATABASE_URL` at a managed Postgres (Supabase/Neon), configure the PayMongo
webhook to `POST /api/webhooks/paymongo`, and run `pnpm db:push && pnpm db:seed`.

---

Built with care — premium software for real, paying businesses.
