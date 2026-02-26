# Colgate Marketplace

A peer-to-peer marketplace for Colgate University students to buy, sell, and trade textbooks, furniture, electronics, clothing, services, and more — all within the Colgate community.

Developed by **Tony Bolivar** as a TIA Venture (2026).

---

## Features

- Colgate email-only registration (verified accounts)
- Browse and search listings by category
- Create, edit, and manage listings with photo uploads
- In-app messaging between buyers and sellers
- In-chat sale confirmation flow with buyer/seller handshake
- Seller reviews and star ratings
- Admin moderation panel (listing approvals, user management)
- Email notifications via Resend
- Light and dark mode

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Backend & Auth | Supabase (PostgreSQL + Row Level Security) |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime (postgres_changes) |
| Email | Resend + Supabase Edge Functions |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Resend account (for email notifications)

### Setup

```bash
git clone https://github.com/tonybolivar/colgate-marketplace.git
cd colgate-marketplace
npm install
```

Copy the environment template and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=       # Supabase project URL
VITE_SUPABASE_ANON_KEY=  # Supabase anon/public key
```

Start the dev server:

```bash
npm run dev
```

### Database

Run the SQL migrations in `supabase/migrations/` in order against your Supabase project via the SQL Editor.

### Email Notifications

Deploy the `supabase/functions/send-notification` edge function and set the `RESEND_API_KEY` secret in your Supabase project. Enable the `pg_net` extension under Database → Extensions.

## Scripts

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build locally
```

---

© 2026 Tony Bolivar · Built as a TIA Venture · Not affiliated with Colgate University
