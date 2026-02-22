import { z } from "zod";

import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";
import { requirePlatformAdmin } from "@/server/rbac";
import { verifyOrg } from "@/server/services/admin";

const verifySchema = z.object({
  orgId: z.string().min(1),
  verified: z.boolean()
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    await requirePlatformAdmin(user.id);

    const payload = verifySchema.parse(await request.json());
    return verifyOrg(user.id, payload.orgId, payload.verified);
  });
