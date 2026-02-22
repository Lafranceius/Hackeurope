import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { acceptMilestone } from "@/server/services/contracting";

const changeSchema = z.object({
  orgId: z.string().min(1),
  comment: z.string().min(2)
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ contractId: string; id: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = changeSchema.parse(await request.json());
    const { contractId, id } = await params;

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.buyerOrgId !== payload.orgId) {
      throw new Error("Forbidden");
    }

    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    return acceptMilestone({
      actorUserId: user.id,
      orgId: payload.orgId,
      milestoneId: id,
      accepted: false,
      comment: payload.comment
    });
  });
