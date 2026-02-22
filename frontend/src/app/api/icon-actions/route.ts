import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getAuthSession } from "@/server/auth";
import { writeAuditEvent } from "@/server/audit";
import { withRouteError } from "@/server/http";

const iconActionSchema = z.object({
  action: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
  orgId: z.string().optional()
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const session = await getAuthSession();
    const parsed = iconActionSchema.parse(await request.json());

    if (!session?.user?.id) {
      return {
        tracked: false,
        reason: "anonymous"
      };
    }

    const fallbackOrg = parsed.orgId ?? session.user.activeOrgId ?? session.user.memberships[0]?.orgId;

    await writeAuditEvent({
      actorUserId: session.user.id,
      orgId: fallbackOrg,
      entityType: "UiIcon",
      entityId: parsed.action,
      action: "ui.icon.clicked",
      metadataJson: parsed.metadata as Prisma.InputJsonObject
    });

    return {
      tracked: true,
      action: parsed.action
    };
  });
