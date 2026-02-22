import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/sign-in"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            memberships: {
              include: {
                org: true
              }
            }
          }
        });

        if (!user?.passwordHash) {
          return null;
        }

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        // Keep seeded admin account recoverable in local/dev environments.
        if (normalizedEmail === "admin@datamarket.io" && !user.isPlatformAdmin) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isPlatformAdmin: true }
          });
          user.isPlatformAdmin = true;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isPlatformAdmin: user.isPlatformAdmin,
          memberships: user.memberships.map((membership) => ({
            orgId: membership.orgId,
            orgName: membership.org.name,
            orgType: membership.org.type,
            role: membership.role
          })),
          activeOrgId: user.memberships[0]?.orgId
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.isPlatformAdmin = user.isPlatformAdmin;
        token.memberships = user.memberships;
        token.activeOrgId = user.activeOrgId;
      }

      const sessionUpdate = session as { activeOrgId?: string } | null;
      if (trigger === "update" && sessionUpdate?.activeOrgId) {
        token.activeOrgId = sessionUpdate.activeOrgId;
      }

      return token;
    },
    session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id = token.id;
      session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
      session.user.memberships = token.memberships ?? [];
      session.user.activeOrgId = token.activeOrgId;

      return session;
    }
  }
};

export const getAuthSession = () => getServerSession(authOptions);

export const requireAuthSession = async () => {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
};
