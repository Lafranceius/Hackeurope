import { OrgRole } from "@prisma/client";

import { createDataset } from "@/server/services/marketplace";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { createDatasetSchema } from "@/server/validation";

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = createDatasetSchema.parse(await request.json());

    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    const dataset = await createDataset(user.id, payload);
    return dataset;
  });
