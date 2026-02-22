import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { updateDataset } from "@/server/services/marketplace";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";

const updateSchema = z.object({
  orgId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "DEACTIVATED"]).optional()
});

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = updateSchema.parse(await request.json());
    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    return updateDataset(user.id, (await params).datasetId, payload.orgId, payload);
  });
