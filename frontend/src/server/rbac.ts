import { OrgRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const roleRank: Record<OrgRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4
};

export const hasAtLeastRole = (current: OrgRole, minimum: OrgRole) => roleRank[current] >= roleRank[minimum];

export const requireOrgMembership = async (userId: string, orgId: string, minimumRole: OrgRole = OrgRole.VIEWER) => {
  const membership = await prisma.orgMember.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId
      }
    },
    include: {
      org: true
    }
  });

  if (!membership) {
    throw new Error("Forbidden: no org membership");
  }

  if (!hasAtLeastRole(membership.role, minimumRole)) {
    throw new Error("Forbidden: insufficient role");
  }

  return membership;
};

export const requirePlatformAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true }
  });

  if (!user?.isPlatformAdmin) {
    throw new Error("Forbidden: platform admin only");
  }

  return true;
};
