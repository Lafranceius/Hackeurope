/**
 * POST /api/datasets/[datasetId]/pricing/apply
 *
 * Apply a specific snapshot's recommended price to the dataset's ONE_TIME plan.
 * Seller only. Feature-flagged.
 * Guardrails (min/max/weeklyChange) are enforced by the service layer.
 */

import { OrgRole } from "@prisma/client";

import { applyRecommendedPrice } from "@/server/services/dynamic-pricing";
import { withRouteError, HttpError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { applyPriceSchema } from "@/server/validation";
import { env } from "@/server/env";
import { prisma } from "@/lib/prisma";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    if (!env.dynamicPricingEnabled) {
      throw new HttpError(404, "Dynamic pricing is not enabled");
    }

    const user = await requireUser();
    const { datasetId } = await params;
    const payload = applyPriceSchema.parse(await request.json());

    // Verify caller belongs to the org that owns the dataset
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { orgId: true }
    });
    if (!dataset) throw new HttpError(404, "Dataset not found");
    if (dataset.orgId !== payload.orgId) throw new HttpError(403, "Forbidden");
    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    return applyRecommendedPrice({
      actorUserId: user.id,
      datasetId,
      orgId: payload.orgId,
      snapshotId: payload.snapshotId,
      reason: payload.reason ?? "manual_apply"
    });
  });
