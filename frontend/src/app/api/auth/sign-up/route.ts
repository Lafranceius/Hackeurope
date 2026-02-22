import { hash } from "bcryptjs";
import { OrgType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  orgName: z.string().min(2),
  orgType: z.nativeEnum(OrgType).default(OrgType.BOTH),
  billingEmail: z.string().email().optional()
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const payload = signUpSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await hash(payload.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: payload.name,
          passwordHash
        }
      });

      const org = await tx.org.create({
        data: {
          name: payload.orgName,
          type: payload.orgType,
          billingEmail: payload.billingEmail ?? payload.email.toLowerCase()
        }
      });

      await tx.orgMember.create({
        data: {
          userId: createdUser.id,
          orgId: org.id,
          role: "OWNER"
        }
      });

      return { user: createdUser, org };
    });

    return {
      userId: user.user.id,
      orgId: user.org.id
    };
  });
