import { FlagStatus, VerificationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/server/audit";

export const verifyOrg = async (actorUserId: string, orgId: string, verified: boolean) => {
  const org = await prisma.org.update({
    where: { id: orgId },
    data: {
      verificationStatus: verified ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED
    }
  });

  await writeAuditEvent({
    actorUserId,
    orgId,
    entityType: "Org",
    entityId: orgId,
    action: "org.verification.updated",
    metadataJson: { verified }
  });

  return org;
};

export const moderateFlag = async (actorUserId: string, flagId: string, status: FlagStatus) => {
  const flag = await prisma.flagReport.update({
    where: { id: flagId },
    data: { status }
  });

  await writeAuditEvent({
    actorUserId,
    entityType: "FlagReport",
    entityId: flagId,
    action: "flag.moderated",
    metadataJson: { status }
  });

  return flag;
};
