/**
 * POST /api/pricing/preview
 *
 * Stateless pricing recommendation preview.
 * Used during dataset creation (before a dataset ID exists) to show
 * a suggested starting price from the assessment result.
 *
 * No snapshot is persisted. Feature-flagged.
 * Any authenticated user may call this endpoint.
 */

import { previewRecommendedPrice } from "@/server/services/dynamic-pricing";
import { withRouteError, HttpError } from "@/server/http";
import { requireUser } from "@/server/session";
import { pricingPreviewSchema } from "@/server/validation";
import { env } from "@/server/env";

export const POST = async (request: Request) =>
  withRouteError(async () => {
    if (!env.dynamicPricingEnabled) {
      throw new HttpError(404, "Dynamic pricing is not enabled");
    }

    await requireUser();
    const payload = pricingPreviewSchema.parse(await request.json());

    const output = previewRecommendedPrice({
      qualityPercent: payload.qualityPercent,
      complexityTag: payload.complexityTag,
      cleaningCostUsd: payload.cleaningCostUsd,
      categories: payload.categories,
      currentPriceUsd: payload.currentPriceUsd
    });

    return {
      recommendedOneTimePriceUsd: output.recommendedOneTimePriceUsd,
      explanationFactors: output.explanationFactors
    };
  });
