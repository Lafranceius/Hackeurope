import { OrgRole } from "@prisma/client";

import { requireAuthSession } from "@/server/auth";
import { HttpError } from "@/server/http";
import { hasAtLeastRole, requireOrgMembership } from "@/server/rbac";

export const requireUser = async () => {
  const session = await requireAuthSession();
  if (!session.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }
  return session.user;
};

export const requireOrgAccess = async (userId: string, orgId: string, minimumRole: OrgRole = OrgRole.VIEWER) => {
  try {
    return await requireOrgMembership(userId, orgId, minimumRole);
  } catch {
    throw new HttpError(403, "Forbidden");
  }
};

export const assertRole = (role: OrgRole, minimumRole: OrgRole) => {
  if (!hasAtLeastRole(role, minimumRole)) {
    throw new HttpError(403, "Forbidden");
  }
};
