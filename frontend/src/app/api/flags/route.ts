import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";

const flagSchema = z.object({
  entityType: z.enum(["DATASET", "REQUEST", "USER"]),
  entityId: z.string().min(1),
  reason: z.string().min(5)
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = flagSchema.parse(await request.json());

    return prisma.flagReport.create({
      data: {
        reporterUserId: user.id,
        entityType: payload.entityType,
        entityId: payload.entityId,
        reason: payload.reason
      }
    });
  });
