import { OrgRole } from "@prisma/client";

import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";
import { createRequest } from "@/server/services/contracting";
import { createRequestSchema } from "@/server/validation";

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = createRequestSchema.parse(await request.json());

    await requireOrgAccess(user.id, payload.orgId, OrgRole.MEMBER);

    return createRequest(user.id, payload);
  });
