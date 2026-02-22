# Data Marketplace + Data Contracting Platform

Production-oriented Next.js app for:
- Dataset marketplace (publish, purchase, entitlement, invoice, license acceptance)
- Data collection contracting (RFP, bids, award, milestones, delivery, acceptance)
- Org RBAC and platform admin moderation

## Stack
- Next.js App Router + TypeScript
- Prisma + PostgreSQL
- NextAuth credentials auth
- Tailwind UI (enterprise neutral design system)
- Stripe test mode optional, internal test purchase fallback
- S3 optional, local file fallback

## Quick Start
1. Install deps:
```bash
npm install
```
2. Copy env file:
```bash
cp .env.example .env
```
3. Start local Postgres:
```bash
docker compose up -d
```
4. Generate Prisma client and migrate:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```
5. Seed data:
```bash
npm run prisma:seed
```
6. Run app:
```bash
npm run dev
```

## Default Seed Credentials
- Platform admin: `admin@datamarket.io` / `password123`
- Buyer owner: `alicia@acmeinsights.com` / `password123`
- Supplier owner: `darius@datastream.com` / `password123`

## Environment Variables
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ENABLE_STRIPE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ENABLE_S3`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`

## Test Commands
```bash
npm run test
npm run test:e2e
```

## Notes
- If Stripe is disabled, use `/api/purchases/test` fallback through the UI purchase ticket.
- If S3 is disabled, upload/download URLs use local placeholders.
