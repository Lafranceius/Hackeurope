import { OrgRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { createThread } from "@/server/services/messaging";
import { createThreadSchema } from "@/server/validation";

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = createThreadSchema.parse(await request.json());

    if (payload.type === "REQUEST") {
      const requestRecord = await prisma.request.findUnique({ where: { id: payload.requestId } });
      if (!requestRecord) {
        throw new Error("Request not found");
      }

      const inBuyerOrg = user.memberships.some((membership) => membership.orgId === requestRecord.buyerOrgId);
      const supplierBid = await prisma.bid.findFirst({
        where: {
          requestId: requestRecord.id,
          supplierOrgId: {
            in: user.memberships.map((membership) => membership.orgId)
          }
        }
      });

      if (!inBuyerOrg && !supplierBid) {
        throw new Error("Forbidden");
      }

      if (inBuyerOrg) {
        await requireOrgAccess(user.id, requestRecord.buyerOrgId, OrgRole.VIEWER);
      }
    }

    if (payload.type === "CONTRACT") {
      const contract = await prisma.contract.findUnique({ where: { id: payload.contractId } });
      if (!contract) {
        throw new Error("Contract not found");
      }

      const memberOfEither = user.memberships.some(
        (membership) => membership.orgId === contract.buyerOrgId || membership.orgId === contract.supplierOrgId
      );

      if (!memberOfEither) {
        throw new Error("Forbidden");
      }
    }

    return createThread(payload);
  });
