/**
 * Dynamic Pricing Service
 *
 * DB operations for pricing recommendations, applying prices, config management,
 * history retrieval, and the scheduled auto-repricing run.
 *
 * All write operations produce PriceChangeAudit + AuditEvent records.
 */

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/server/audit";
import { computeRecommendedPrice, PricingInput } from "@/server/pricing-engine";

// ---------------------------------------------------------------------------
// Input gathering
// ---------------------------------------------------------------------------

/**
 * Collect all inputs for the pricing engine from the DB.
 * Uses PLACEHOLDER values for assessment fields until real assessment
 * data is persisted on the dataset (see dataset-assessment.ts).
 */
const gatherPricingInputs = async (datasetId: string): Promise<PricingInput> => {
  const dataset = await prisma.dataset.findUniqueOrThrow({
    where: { id: datasetId },
    include: {
      pricePlans: { where: { type: "ONE_TIME" }, orderBy: { createdAt: "asc" }, take: 1 }
    }
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentPurchases = await prisma.purchase.findMany({
    where: { datasetId, status: "PAID", createdAt: { gte: thirtyDaysAgo } },
    include: { plan: { select: { price: true } } }
  });

  const purchases30d = recentPurchases.length;
  const revenue30d = recentPurchases.reduce((sum, p) => sum + Number(p.plan.price), 0);

  // Peer median: same primary category, published datasets, ONE_TIME plans, ≥3 peers required
  const category = dataset.categories[0] ?? null;
  let peerMedianPriceUsd: number | null = null;
  if (category) {
    const peers = await prisma.datasetPricePlan.findMany({
      where: {
        type: "ONE_TIME",
        dataset: {
          status: "PUBLISHED",
          categories: { has: category },
          id: { not: datasetId }
        }
      },
      select: { price: true }
    });
    if (peers.length >= 3) {
      const sorted = peers.map((p) => Number(p.price)).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      peerMedianPriceUsd =
        sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
  }

  // PLACEHOLDER assessment values (see dataset-assessment.ts — will be replaced
  // once assessment results are stored on the dataset record)
  const qualityPercent = 62;
  const complexityTag = "B" as const;
  const cleaningCostUsd = 50;

  const currentPlan = dataset.pricePlans[0];
  const currentPriceUsd = currentPlan ? Number(currentPlan.price) : null;

  return {
    categories: dataset.categories,
    lastUpdatedAt: dataset.lastUpdatedAt,
    createdAt: dataset.createdAt,
    qualityPercent,
    complexityTag,
    cleaningCostUsd,
    views30d: 0, // placeholder — page-view events not yet tracked
    purchases30d,
    revenue30d,
    peerMedianPriceUsd,
    currentPriceUsd
  };
};

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

/**
 * Returns the most recent snapshot if it is younger than `maxAgeMs`
 * (default 1 hour), otherwise computes and persists a new one.
 */
export const getOrComputeRecommendation = async (
  datasetId: string,
  maxAgeMs = 60 * 60 * 1000
) => {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const fresh = await prisma.datasetPricingSnapshot.findFirst({
    where: { datasetId, computedAt: { gte: cutoff } },
    orderBy: { computedAt: "desc" }
  });
  if (fresh) return fresh;

  return computeAndSaveSnapshot(datasetId);
};

/**
 * Force-compute and persist a new pricing snapshot.
 * Called by the cron endpoint and by getOrComputeRecommendation on cache miss.
 */
export const computeAndSaveSnapshot = async (datasetId: string) => {
  const inputs = await gatherPricingInputs(datasetId);
  const output = computeRecommendedPrice(inputs);

  // Store inputs as JSON — Dates become ISO strings automatically
  const inputsJson = {
    ...inputs,
    lastUpdatedAt: inputs.lastUpdatedAt.toISOString(),
    createdAt: inputs.createdAt.toISOString()
  } as unknown as Prisma.InputJsonObject;

  const explanationJson = {
    factors: output.explanationFactors,
    hash: output.inputsHash
  } as Prisma.InputJsonObject;

  return prisma.datasetPricingSnapshot.create({
    data: {
      datasetId,
      recommendedPrice: new Prisma.Decimal(output.recommendedOneTimePriceUsd),
      inputsJson,
      explanationJson,
      computedAt: new Date(output.computedAt)
    }
  });
};

// ---------------------------------------------------------------------------
// Apply recommendation
// ---------------------------------------------------------------------------

export type ApplyResult = { oldPrice: number; newPrice: number };

/**
 * Apply a specific snapshot's recommended price to the dataset's ONE_TIME plan.
 * Enforces pricing config guardrails (min/max/maxWeeklyChangePct).
 * Writes PriceChangeAudit + AuditEvent for full traceability.
 */
export const applyRecommendedPrice = async (args: {
  actorUserId: string;
  datasetId: string;
  orgId: string;
  snapshotId: string;
  reason?: string;
}): Promise<ApplyResult> => {
  // Verify dataset ownership
  const dataset = await prisma.dataset.findFirst({
    where: { id: args.datasetId, orgId: args.orgId },
    include: {
      pricePlans: { where: { type: "ONE_TIME" }, orderBy: { createdAt: "asc" }, take: 1 }
    }
  });
  if (!dataset) throw new Error("Dataset not found");

  const plan = dataset.pricePlans[0];
  if (!plan) throw new Error("No ONE_TIME price plan found for this dataset");

  const snapshot = await prisma.datasetPricingSnapshot.findUnique({
    where: { id: args.snapshotId }
  });
  if (!snapshot || snapshot.datasetId !== args.datasetId) {
    throw new Error("Snapshot not found");
  }

  const newPrice = snapshot.recommendedPrice;
  const oldPrice = plan.price;

  // Guardrails from pricing config (if configured)
  const config = await prisma.datasetPricingConfig.findUnique({
    where: { datasetId: args.datasetId }
  });
  if (config) {
    if (newPrice.lt(config.minPrice)) {
      throw new Error(`Recommended price $${newPrice} is below seller minimum $${config.minPrice}`);
    }
    if (newPrice.gt(config.maxPrice)) {
      throw new Error(`Recommended price $${newPrice} exceeds seller maximum $${config.maxPrice}`);
    }
    if (oldPrice.toNumber() > 0) {
      const pct = config.maxWeeklyChangePct / 100;
      const maxUp = oldPrice.toNumber() * (1 + pct);
      const maxDown = oldPrice.toNumber() * (1 - pct);
      const np = newPrice.toNumber();
      if (np > maxUp || np < maxDown) {
        throw new Error(
          `Price change exceeds ${config.maxWeeklyChangePct}% weekly limit (current: $${oldPrice})`
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.datasetPricePlan.update({
      where: { id: plan.id },
      data: { price: newPrice }
    });

    await tx.datasetPricingSnapshot.update({
      where: { id: snapshot.id },
      data: { appliedPrice: newPrice }
    });

    await tx.priceChangeAudit.create({
      data: {
        datasetId: args.datasetId,
        actorUserId: args.actorUserId,
        oldPrice,
        newPrice,
        reason: args.reason ?? "manual_apply",
        appliedAt: new Date()
      }
    });

    if (config) {
      await tx.datasetPricingConfig.update({
        where: { id: config.id },
        data: { lastAppliedAt: new Date() }
      });
    }
  });

  await writeAuditEvent({
    actorUserId: args.actorUserId,
    orgId: args.orgId,
    entityType: "Dataset",
    entityId: args.datasetId,
    action: "pricing.applied",
    metadataJson: {
      oldPrice: oldPrice.toNumber(),
      newPrice: newPrice.toNumber(),
      snapshotId: args.snapshotId,
      reason: args.reason ?? "manual_apply"
    }
  });

  return { oldPrice: oldPrice.toNumber(), newPrice: newPrice.toNumber() };
};

// ---------------------------------------------------------------------------
// Pricing config management
// ---------------------------------------------------------------------------

/**
 * Create or update the seller's pricing constraints for a dataset.
 * Only supplied fields are updated (undefined = leave unchanged).
 */
export const upsertPricingConfig = async (args: {
  datasetId: string;
  orgId: string;
  autoPricingEnabled?: boolean;
  minPrice?: number;
  maxPrice?: number;
  maxWeeklyChangePct?: number;
}) => {
  // Verify ownership
  const dataset = await prisma.dataset.findFirst({
    where: { id: args.datasetId, orgId: args.orgId }
  });
  if (!dataset) throw new Error("Dataset not found");

  const createData: Prisma.DatasetPricingConfigUncheckedCreateInput = {
    datasetId: args.datasetId,
    autoPricingEnabled: args.autoPricingEnabled ?? false,
    ...(args.minPrice !== undefined && { minPrice: new Prisma.Decimal(args.minPrice) }),
    ...(args.maxPrice !== undefined && { maxPrice: new Prisma.Decimal(args.maxPrice) }),
    ...(args.maxWeeklyChangePct !== undefined && {
      maxWeeklyChangePct: args.maxWeeklyChangePct
    })
  };

  const updateData: Prisma.DatasetPricingConfigUncheckedUpdateInput = {
    ...(args.autoPricingEnabled !== undefined && {
      autoPricingEnabled: args.autoPricingEnabled
    }),
    ...(args.minPrice !== undefined && { minPrice: new Prisma.Decimal(args.minPrice) }),
    ...(args.maxPrice !== undefined && { maxPrice: new Prisma.Decimal(args.maxPrice) }),
    ...(args.maxWeeklyChangePct !== undefined && {
      maxWeeklyChangePct: args.maxWeeklyChangePct
    })
  };

  return prisma.datasetPricingConfig.upsert({
    where: { datasetId: args.datasetId },
    create: createData,
    update: updateData
  });
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/** Returns recent snapshots and audit records for a dataset (seller-only). */
export const getPriceHistory = async (datasetId: string, orgId: string) => {
  const dataset = await prisma.dataset.findFirst({
    where: { id: datasetId, orgId }
  });
  if (!dataset) throw new Error("Dataset not found");

  const [snapshots, audits] = await Promise.all([
    prisma.datasetPricingSnapshot.findMany({
      where: { datasetId },
      orderBy: { computedAt: "desc" },
      take: 30,
      select: {
        id: true,
        recommendedPrice: true,
        appliedPrice: true,
        explanationJson: true,
        computedAt: true
      }
    }),
    prisma.priceChangeAudit.findMany({
      where: { datasetId },
      orderBy: { appliedAt: "desc" },
      take: 20,
      select: {
        id: true,
        oldPrice: true,
        newPrice: true,
        reason: true,
        appliedAt: true,
        actor: { select: { id: true, name: true } }
      }
    })
  ]);

  return { snapshots, audits };
};

// ---------------------------------------------------------------------------
// Scheduled auto-repricing
// ---------------------------------------------------------------------------

/** System actor user ID used when a cron job applies prices automatically. */
const SYSTEM_ACTOR_PLACEHOLDER = "system";

/**
 * For every dataset with autoPricingEnabled=true:
 *  1. Compute a fresh snapshot.
 *  2. Attempt to apply it (guardrails enforced).
 *
 * Returns a per-dataset result summary for the cron log.
 * Errors per dataset are isolated — one failure does not abort others.
 */
export const runAutoPricingForAll = async (actorUserId: string = SYSTEM_ACTOR_PLACEHOLDER) => {
  const configs = await prisma.datasetPricingConfig.findMany({
    where: { autoPricingEnabled: true },
    include: { dataset: { select: { id: true, orgId: true, status: true } } }
  });

  const results: Array<{ datasetId: string; status: "applied" | "error" | "skipped"; detail?: string }> = [];

  for (const config of configs) {
    const { dataset } = config;
    // Only reprice published datasets
    if (dataset.status !== "PUBLISHED") {
      results.push({ datasetId: dataset.id, status: "skipped", detail: "not published" });
      continue;
    }

    try {
      const snapshot = await computeAndSaveSnapshot(dataset.id);
      await applyRecommendedPrice({
        actorUserId,
        datasetId: dataset.id,
        orgId: dataset.orgId,
        snapshotId: snapshot.id,
        reason: "auto_reprice_cron"
      });
      results.push({ datasetId: dataset.id, status: "applied" });
    } catch (error) {
      results.push({
        datasetId: dataset.id,
        status: "error",
        detail: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return results;
};

// ---------------------------------------------------------------------------
// Lightweight preview (no DB required)
// ---------------------------------------------------------------------------

/**
 * Compute a recommended price preview without persisting anything.
 * Used during dataset creation before a dataset ID exists.
 */
export const previewRecommendedPrice = (args: {
  qualityPercent: number;
  complexityTag: "A" | "B" | "C" | "D";
  cleaningCostUsd: number;
  categories?: string[];
  currentPriceUsd?: number;
}) => {
  const input: PricingInput = {
    categories: args.categories ?? [],
    lastUpdatedAt: new Date(),
    createdAt: new Date(),
    qualityPercent: args.qualityPercent,
    complexityTag: args.complexityTag,
    cleaningCostUsd: args.cleaningCostUsd,
    views30d: 0,
    purchases30d: 0,
    revenue30d: 0,
    peerMedianPriceUsd: null,
    currentPriceUsd: args.currentPriceUsd ?? null
  };
  return computeRecommendedPrice(input);
};
