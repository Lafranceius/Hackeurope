/**
 * GET /api/datasets/[datasetId]/pricing/history
 *
 * Returns paginated snapshot history and price-change audit records.
 * Seller only. Feature-flagged.
 * Buyers see only the current price (via the regular dataset endpoint).
 */

import { OrgRole } from "@prisma/client";

import { getPriceHistory } from "@/server/services/dynamic-pricing";
import { withRouteError, HttpError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { env } from "@/server/env";
import { prisma } from "@/lib/prisma";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    if (!env.dynamicPricingEnabled) {
      throw new HttpError(404, "Dynamic pricing is not enabled");
    }

    const user = await requireUser();
    const { datasetId } = await params;

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { orgId: true }
    });
    if (!dataset) throw new HttpError(404, "Dataset not found");
    await requireOrgAccess(user.id, dataset.orgId, OrgRole.MEMBER);

    const history = await getPriceHistory(datasetId, dataset.orgId);

    return {
      snapshots: history.snapshots.map((s) => ({
        id: s.id,
        recommendedPrice: s.recommendedPrice.toNumber(),
        appliedPrice: s.appliedPrice?.toNumber() ?? null,
        explanationJson: s.explanationJson,
        computedAt: s.computedAt
      })),
      audits: history.audits.map((a) => ({
        id: a.id,
        oldPrice: a.oldPrice.toNumber(),
        newPrice: a.newPrice.toNumber(),
        reason: a.reason,
        appliedAt: a.appliedAt,
        actorName: a.actor.name
      }))
    };
  });
