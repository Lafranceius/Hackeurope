/**
 * Pricing Engine — pure computation, no DB access.
 *
 * Formula:
 *  base          = max(categoryFloor, cleaningCostUsd × cleaningMultiplier)
 *  × qualityMult  (0.70 – 1.30 based on qualityPercent)
 *  × complexMult  (A: 0.85, B: 1.00, C: 1.20, D: 1.40)
 *  × freshMult    (< 7d: ×1.15 / < 30d: ×1.08 / < 90d: ×1.00 / older: ×0.90)
 *  × demandMult   (1 + min(purchases30d × 0.04, 0.40))
 *  + peerBlend    (if ≥ 3 peers: price = price × 0.65 + peerMedian × 0.35)
 *  + smoothing    (if currentPrice > 0: clamp to ±10%)
 *  → category bounds (floor … ceiling)
 *  → round to nearest $50
 */

import { createHash } from "crypto";

export type ComplexityTag = "A" | "B" | "C" | "D";

export type PricingInput = {
  /** Dataset attributes */
  categories: string[];
  lastUpdatedAt: Date;
  createdAt: Date;

  /**
   * Assessment results (placeholders until real assessment is persisted on the
   * dataset — use PLACEHOLDER_* values from dataset-assessment.ts service).
   */
  qualityPercent: number; // 30–95
  complexityTag: ComplexityTag; // A–D
  cleaningCostUsd: number; // 50–250

  /** Marketplace signals (30-day windows) */
  views30d: number; // placeholder: 0 — no page-view event yet
  purchases30d: number; // real: PAID purchases in last 30 days
  revenue30d: number; // real: sum of plan prices for recent purchases

  /** Peer anchor (null when fewer than 3 comparable peers) */
  peerMedianPriceUsd: number | null;

  /** Current listed price (used for per-period smoothing; null = no smoothing) */
  currentPriceUsd: number | null;
};

export type PricingOutput = {
  recommendedOneTimePriceUsd: number; // integer USD, rounded to $50
  explanationFactors: string[]; // top 3 human-readable drivers
  computedAt: string; // ISO 8601
  inputsHash: string; // stable 16-char hex digest of inputs
};

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

type CategoryConfig = {
  floorUsd: number;
  ceilingUsd: number;
  /** How many times the cleaning cost should be covered at minimum */
  cleaningMultiplier: number;
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Finance: { floorUsd: 500, ceilingUsd: 50_000, cleaningMultiplier: 4.0 },
  Healthcare: { floorUsd: 1_000, ceilingUsd: 100_000, cleaningMultiplier: 5.0 },
  Marketing: { floorUsd: 200, ceilingUsd: 20_000, cleaningMultiplier: 3.0 },
  Technology: { floorUsd: 500, ceilingUsd: 50_000, cleaningMultiplier: 4.0 },
  Legal: { floorUsd: 1_000, ceilingUsd: 80_000, cleaningMultiplier: 4.5 },
  "Real Estate": { floorUsd: 300, ceilingUsd: 30_000, cleaningMultiplier: 3.5 },
  Default: { floorUsd: 100, ceilingUsd: 20_000, cleaningMultiplier: 3.0 }
};

const COMPLEXITY_MULTIPLIER: Record<ComplexityTag, number> = {
  A: 0.85, // Simple, clean — slight discount
  B: 1.0, // Standard
  C: 1.2, // Requires human review
  D: 1.4 // Requires data quality engineer
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getCategoryConfig = (categories: string[]): { key: string; config: CategoryConfig } => {
  for (const cat of categories) {
    if (CATEGORY_CONFIG[cat]) {
      return { key: cat, config: CATEGORY_CONFIG[cat] };
    }
  }
  return { key: "Default", config: CATEGORY_CONFIG.Default };
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const stableHash = (input: PricingInput): string => {
  const canonical = {
    categories: input.categories,
    qualityPercent: input.qualityPercent,
    complexityTag: input.complexityTag,
    cleaningCostUsd: input.cleaningCostUsd,
    views30d: input.views30d,
    purchases30d: input.purchases30d,
    revenue30d: input.revenue30d,
    peerMedianPriceUsd: input.peerMedianPriceUsd
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
};

const daysSince = (date: Date): number => (Date.now() - date.getTime()) / 86_400_000;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export const computeRecommendedPrice = (input: PricingInput): PricingOutput => {
  const { config } = getCategoryConfig(input.categories);
  const factors: Array<{ label: string; score: number }> = [];

  // ── 1. Base price (cleaning cost + margin, floored at category minimum) ──
  const cleaningBase = input.cleaningCostUsd * config.cleaningMultiplier;
  let price = Math.max(config.floorUsd, cleaningBase);

  // ── 2. Quality multiplier: 0.70 (quality=30%) → 1.30 (quality=95%) ──
  const qualityMult = 0.7 + (clamp(input.qualityPercent, 30, 95) / 100) * 0.6;
  price *= qualityMult;
  if (input.qualityPercent >= 80) {
    factors.push({ label: "High data quality", score: qualityMult - 1 });
  } else if (input.qualityPercent < 50) {
    factors.push({ label: "Low quality — improvement opportunity", score: 1 - qualityMult });
  }

  // ── 3. Complexity multiplier ──
  const complexMult = COMPLEXITY_MULTIPLIER[input.complexityTag];
  price *= complexMult;
  if (input.complexityTag === "D") {
    factors.push({ label: "High-complexity dataset", score: complexMult - 1 });
  } else if (input.complexityTag === "A") {
    factors.push({ label: "Simple, clean structure", score: 0 });
  }

  // ── 4. Freshness multiplier ──
  const age = daysSince(input.lastUpdatedAt);
  let freshMult: number;
  let freshLabel: string;
  if (age <= 7) {
    freshMult = 1.15;
    freshLabel = "Very fresh data (< 7 days)";
  } else if (age <= 30) {
    freshMult = 1.08;
    freshLabel = "Recently updated data";
  } else if (age <= 90) {
    freshMult = 1.0;
    freshLabel = "";
  } else {
    freshMult = 0.9;
    freshLabel = "Data not recently refreshed";
  }
  price *= freshMult;
  if (freshLabel) {
    factors.push({ label: freshLabel, score: Math.abs(freshMult - 1) });
  }

  // ── 5. Demand multiplier (up to +40%) ──
  const demandBoost = clamp(input.purchases30d * 0.04, 0, 0.4);
  price *= 1 + demandBoost;
  if (demandBoost >= 0.12) {
    factors.push({ label: "High purchase demand", score: demandBoost });
  } else if (demandBoost > 0) {
    factors.push({ label: "Steady purchase demand", score: demandBoost });
  }

  // ── 6. Peer anchor blend ──
  if (input.peerMedianPriceUsd !== null) {
    price = price * 0.65 + input.peerMedianPriceUsd * 0.35;
    factors.push({ label: "Aligned with market peers", score: 0.05 });
  }

  // ── 7. Per-period smoothing guard (±10% of current price) ──
  if (input.currentPriceUsd !== null && input.currentPriceUsd > 0) {
    const maxUp = input.currentPriceUsd * 1.1;
    const maxDown = input.currentPriceUsd * 0.9;
    price = clamp(price, maxDown, maxUp);
  }

  // ── 8. Category bounds ──
  price = clamp(price, config.floorUsd, config.ceilingUsd);

  // ── 9. Round to nearest $50 ──
  const rounded = Math.round(price / 50) * 50;

  // ── Top 3 drivers (by absolute score, descending) ──
  const topFactors = factors
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((f) => f.label);

  if (topFactors.length === 0) {
    topFactors.push("Standard market pricing");
  }

  return {
    recommendedOneTimePriceUsd: rounded,
    explanationFactors: topFactors,
    computedAt: new Date().toISOString(),
    inputsHash: stableHash(input)
  };
};
