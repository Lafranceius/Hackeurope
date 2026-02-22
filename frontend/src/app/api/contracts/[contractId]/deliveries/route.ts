import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { uploadDelivery } from "@/server/services/contracting";

const deliverySchema = z.object({
  orgId: z.string().min(1),
  milestoneId: z.string().min(1),
  fileUrl: z.string().min(1),
  notes: z.string().optional()
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ contractId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = deliverySchema.parse(await request.json());
    const contractId = (await params).contractId;

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract || contract.supplierOrgId !== payload.orgId) {
      throw new Error("Forbidden");
    }

    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    return uploadDelivery({
      actorUserId: user.id,
      orgId: payload.orgId,
      contractId,
      milestoneId: payload.milestoneId,
      fileUrl: payload.fileUrl,
      notes: payload.notes
    });
  });
