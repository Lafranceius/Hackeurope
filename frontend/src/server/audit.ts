import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorUserId: string;
  orgId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadataJson?: Prisma.InputJsonObject;
};

export const writeAuditEvent = async ({
  actorUserId,
  orgId,
  entityType,
  entityId,
  action,
  metadataJson = {}
}: AuditInput) => {
  return prisma.auditEvent.create({
    data: {
      actorUserId,
      orgId: orgId ?? null,
      entityType,
      entityId,
      action,
      metadataJson
    }
  });
};
