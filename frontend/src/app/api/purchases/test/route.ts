import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { completePurchase } from "@/server/services/marketplace";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";

const purchaseSchema = z.object({
  buyerOrgId: z.string().min(1),
  datasetId: z.string().min(1),
  planId: z.string().min(1)
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = purchaseSchema.parse(await request.json());

    await requireOrgAccess(user.id, payload.buyerOrgId, OrgRole.MEMBER);

    const purchase = await completePurchase({
      actorUserId: user.id,
      buyerOrgId: payload.buyerOrgId,
      datasetId: payload.datasetId,
      planId: payload.planId
    });

    return purchase;
  });
