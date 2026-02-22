import { OrgRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { submitBid } from "@/server/services/contracting";
import { createBidSchema } from "@/server/validation";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = createBidSchema.parse(await request.json());
    const requestId = (await params).requestId;

    if (payload.requestId !== requestId) {
      throw new Error("Request mismatch");
    }

    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    const requestRecord = await prisma.request.findUnique({ where: { id: requestId } });
    if (!requestRecord) {
      throw new Error("Request not found");
    }
    if (requestRecord.status !== "OPEN") {
      throw new Error("Request is not open for bids");
    }
    if (requestRecord.buyerOrgId === payload.orgId) {
      throw new Error("Buyer org cannot submit supplier bids to its own request");
    }

    if ((requestRecord.flagsMinors || requestRecord.flagsPii) && !payload.complianceJson.complianceOfficer) {
      throw new Error("Compliance officer field is required for sensitive requests");
    }

    return submitBid(user.id, {
      ...payload,
      requestId
    });
  });
