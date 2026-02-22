import { FlagStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";
import { requirePlatformAdmin } from "@/server/rbac";
import { moderateFlag } from "@/server/services/admin";

const moderationSchema = z.object({
  flagId: z.string().min(1),
  status: z.nativeEnum(FlagStatus),
  resolutionNote: z.string().optional(),
  entityAction: z.enum(["NONE", "DEACTIVATE_DATASET", "CANCEL_REQUEST"]).default("NONE")
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    await requirePlatformAdmin(user.id);

    const payload = moderationSchema.parse(await request.json());

    const flag = await moderateFlag(user.id, payload.flagId, payload.status);

    if (payload.entityAction === "DEACTIVATE_DATASET" && flag.entityType === "DATASET") {
      await prisma.dataset.update({
        where: { id: flag.entityId },
        data: { status: "DEACTIVATED" }
      });
    }

    if (payload.entityAction === "CANCEL_REQUEST" && flag.entityType === "REQUEST") {
      await prisma.request.update({
        where: { id: flag.entityId },
        data: { status: "CANCELLED" }
      });
    }

    await prisma.auditEvent.create({
      data: {
        actorUserId: user.id,
        entityType: "FlagReport",
        entityId: payload.flagId,
        action: "moderation.action",
        metadataJson: {
          status: payload.status,
          resolutionNote: payload.resolutionNote,
          entityAction: payload.entityAction
        }
      }
    });

    return flag;
  });
