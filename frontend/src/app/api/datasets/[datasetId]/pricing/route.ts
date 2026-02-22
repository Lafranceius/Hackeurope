/**
 * GET  /api/datasets/[datasetId]/pricing
 *      Returns latest pricing snapshot + config + current plan price.
 *      Seller only. Feature-flagged.
 *
 * PUT  /api/datasets/[datasetId]/pricing
 *      Upsert seller's pricing config (auto toggle, bounds, rate limit).
 *      Seller only. Feature-flagged.
 */

import { OrgRole } from "@prisma/client";

import { getOrComputeRecommendation, upsertPricingConfig } from "@/server/services/dynamic-pricing";
import { withRouteError, HttpError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { updatePricingConfigSchema } from "@/server/validation";
import { env } from "@/server/env";
import { prisma } from "@/lib/prisma";

const assertEnabled = () => {
  if (!env.dynamicPricingEnabled) {
    throw new HttpError(404, "Dynamic pricing is not enabled");
  }
};

// GET — recommendation + config summary
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    assertEnabled();
    const user = await requireUser();
    const { datasetId } = await params;

    // Verify the caller is a member of the org that owns this dataset
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { orgId: true, pricePlans: { where: { type: "ONE_TIME" }, take: 1 } }
    });
    if (!dataset) throw new HttpError(404, "Dataset not found");
    await requireOrgAccess(user.id, dataset.orgId, OrgRole.MEMBER);

    const [snapshot, config] = await Promise.all([
      getOrComputeRecommendation(datasetId),
      prisma.datasetPricingConfig.findUnique({ where: { datasetId } })
    ]);

    return {
      snapshot: {
        id: snapshot.id,
        recommendedPrice: snapshot.recommendedPrice.toNumber(),
        appliedPrice: snapshot.appliedPrice?.toNumber() ?? null,
        explanationJson: snapshot.explanationJson,
        computedAt: snapshot.computedAt
      },
      config: config
        ? {
            id: config.id,
            autoPricingEnabled: config.autoPricingEnabled,
            minPrice: config.minPrice.toNumber(),
            maxPrice: config.maxPrice.toNumber(),
            maxWeeklyChangePct: config.maxWeeklyChangePct,
            lastAppliedAt: config.lastAppliedAt
          }
        : null,
      currentOneTimePrice: dataset.pricePlans[0]
        ? Number(dataset.pricePlans[0].price)
        : null
    };
  });

// PUT — upsert pricing config
export const PUT = async (
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    assertEnabled();
    const user = await requireUser();
    const { datasetId } = await params;
    const payload = updatePricingConfigSchema.parse(await request.json());

    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    const config = await upsertPricingConfig({
      datasetId,
      orgId: payload.orgId,
      autoPricingEnabled: payload.autoPricingEnabled,
      minPrice: payload.minPrice,
      maxPrice: payload.maxPrice,
      maxWeeklyChangePct: payload.maxWeeklyChangePct
    });

    return {
      id: config.id,
      autoPricingEnabled: config.autoPricingEnabled,
      minPrice: config.minPrice.toNumber(),
      maxPrice: config.maxPrice.toNumber(),
      maxWeeklyChangePct: config.maxWeeklyChangePct,
      lastAppliedAt: config.lastAppliedAt
    };
  });
