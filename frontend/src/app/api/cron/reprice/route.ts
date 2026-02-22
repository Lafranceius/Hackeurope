/**
 * GET /api/cron/reprice?token=<CRON_SECRET_TOKEN>
 *
 * Scheduler-compatible endpoint for automatic repricing.
 * Recomputes recommendations for all datasets with autoPricingEnabled=true
 * and applies the new price within the seller's configured guardrails.
 *
 * Invoke from an external scheduler (e.g. Vercel Cron, cron job, GitHub Action):
 *   GET https://<host>/api/cron/reprice?token=<CRON_SECRET_TOKEN>
 *
 * Security:
 *  - Constant-time token comparison (timing-safe)
 *  - Feature flag check
 *  - Returns 503 if disabled, 401 if token missing/wrong
 *
 * Idempotency:
 *  - Snapshots are deduplicated by the 1-hour cache in getOrComputeRecommendation.
 *  - Running the endpoint multiple times within an hour reuses the same snapshot.
 *
 * Local testing:
 *   DYNAMIC_PRICING_ENABLED=true CRON_SECRET_TOKEN=secret \
 *     curl "http://localhost:3000/api/cron/reprice?token=secret"
 */

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { runAutoPricingForAll } from "@/server/services/dynamic-pricing";
import { env } from "@/server/env";

const tokenMatches = (provided: string, expected: string): boolean => {
  // Avoid short-circuit comparison to prevent timing attacks
  if (!expected) return false;
  try {
    const a = Buffer.from(provided.padEnd(64, "\0").slice(0, 64));
    const b = Buffer.from(expected.padEnd(64, "\0").slice(0, 64));
    return timingSafeEqual(a, b) && provided === expected;
  } catch {
    return false;
  }
};

export const GET = async (request: NextRequest) => {
  if (!env.dynamicPricingEnabled) {
    return NextResponse.json({ ok: false, error: "Dynamic pricing is not enabled" }, { status: 503 });
  }

  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!tokenMatches(token, env.cronSecretToken)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = await runAutoPricingForAll();
  const elapsed = Date.now() - startedAt;

  const summary = {
    applied: results.filter((r) => r.status === "applied").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length
  };

  return NextResponse.json(
    {
      ok: true,
      data: {
        summary,
        results,
        elapsedMs: elapsed,
        ranAt: new Date().toISOString()
      }
    },
    { status: 200 }
  );
};
