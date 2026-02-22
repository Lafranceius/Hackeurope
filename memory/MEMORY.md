# HackEurope / Hackeurope Repo Memory

## Stack
- Next.js 15 App Router (src/app), React 19, Prisma 6, PostgreSQL, Tailwind, Recharts, Zod, NextAuth 4, Stripe (optional)
- Frontend root: `frontend/`
- Tests: Vitest (unit/integration in `tests/`), Playwright (e2e)
- Aliases: `@/` → `src/`

## Key Patterns
- API routes use `withRouteError()` from `src/server/http.ts`
- Auth: `requireUser()` / `requireOrgAccess()` from `src/server/session.ts`
- Audit: `writeAuditEvent()` from `src/server/audit.ts`
- Feature flags: boolean env vars via `env.ts` `bool()` helper
- UI: `panel` CSS class for cards, `field-label` for labels, Button/Card/Badge/Input components
- Currency: `formatCurrency()` from `src/lib/utils.ts`

## Dynamic Pricing (implemented Feb 2026)
- DB schema already had DatasetPricingConfig / DatasetPricingSnapshot / PriceChangeAudit — no migrations needed
- Engine: `src/server/pricing-engine.ts` (pure, no DB)
- Service: `src/server/services/dynamic-pricing.ts`
- API routes: `/api/datasets/[datasetId]/pricing` (GET+PUT), `/apply`, `/history`, `/api/cron/reprice`, `/api/pricing/preview`
- UI: `src/components/pricing/dataset-pricing-panel.tsx` (client), `price-history-sparkline.tsx`
- Feature flag: `DYNAMIC_PRICING_ENABLED=false` (default off)
- Cron secret: `CRON_SECRET_TOKEN`
- All 22 tests pass (16 new engine tests + 6 pre-existing)
