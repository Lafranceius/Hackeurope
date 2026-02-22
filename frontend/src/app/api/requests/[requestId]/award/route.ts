import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { awardBid } from "@/server/services/contracting";

const awardSchema = z.object({
  bidId: z.string().min(1),
  buyerOrgId: z.string().min(1)
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = awardSchema.parse(await request.json());
    const requestId = (await params).requestId;

    await requireOrgAccess(user.id, payload.buyerOrgId, OrgRole.ADMIN);

    const requestRecord = await prisma.request.findUnique({ where: { id: requestId } });
    if (!requestRecord || requestRecord.buyerOrgId !== payload.buyerOrgId) {
      throw new Error("Forbidden");
    }

    return awardBid({
      actorUserId: user.id,
      requestId,
      bidId: payload.bidId,
      buyerOrgId: payload.buyerOrgId
    });
  });
