import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { publishDataset } from "@/server/services/marketplace";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";

const publishSchema = z.object({
  orgId: z.string().min(1)
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = publishSchema.parse(await request.json());

    await requireOrgAccess(user.id, payload.orgId, OrgRole.ADMIN);

    return publishDataset(user.id, (await params).datasetId, payload.orgId);
  });
