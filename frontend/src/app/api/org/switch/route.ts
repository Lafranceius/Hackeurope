import { cookies } from "next/headers";
import { z } from "zod";

import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";

const switchSchema = z.object({
  orgId: z.string().min(1)
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const { orgId } = switchSchema.parse(await request.json());

    const hasOrg = user.memberships.some((membership) => membership.orgId === orgId);
    if (!hasOrg) {
      throw new Error("Forbidden: no org membership");
    }

    (await cookies()).set("activeOrgId", orgId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30
    });

    return { orgId };
  });
