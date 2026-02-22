import { OrgRole, OrgType } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      isPlatformAdmin: boolean;
      activeOrgId?: string;
      memberships: Array<{
        orgId: string;
        orgName: string;
        orgType: OrgType;
        role: OrgRole;
      }>;
    };
  }

  interface User {
    id: string;
    isPlatformAdmin: boolean;
    activeOrgId?: string;
    memberships: Array<{
      orgId: string;
      orgName: string;
      orgType: OrgType;
      role: OrgRole;
    }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isPlatformAdmin: boolean;
    activeOrgId?: string;
    memberships: Array<{
      orgId: string;
      orgName: string;
      orgType: OrgType;
      role: OrgRole;
    }>;
  }
}
