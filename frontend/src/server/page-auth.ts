import { redirect } from "next/navigation";

import { getAuthSession } from "@/server/auth";

export const requirePageSession = async () => {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  return session.user;
};

export const requireOrgInSession = async (orgId: string) => {
  const user = await requirePageSession();
  const membership = user.memberships.find((item) => item.orgId === orgId);
  if (!membership) {
    redirect("/marketplace");
  }
  return { user, membership };
};
