import { OrgRole } from "@prisma/client";
import { z } from "zod";

import { payments } from "@/server/payments";
import { withRouteError } from "@/server/http";
import { requireOrgAccess, requireUser } from "@/server/session";

const checkoutSchema = z.object({
  buyerOrgId: z.string().min(1),
  datasetId: z.string().min(1),
  planId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD")
});

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = checkoutSchema.parse(await request.json());

    await requireOrgAccess(user.id, payload.buyerOrgId, OrgRole.MEMBER);

    if (!payments.isStripeEnabled()) {
      return {
        mode: "TEST_ONLY",
        message: "Stripe is disabled. Use /api/purchases/test."
      };
    }

    const session = await payments.createCheckoutSession({
      amount: payload.amount,
      currency: payload.currency,
      description: `Dataset purchase ${payload.datasetId}`,
      successUrl: `${process.env.NEXTAUTH_URL}/org/${payload.buyerOrgId}/purchases?success=1`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/datasets/${payload.datasetId}?cancel=1`
    });

    return {
      mode: "STRIPE",
      checkoutUrl: session.url,
      stripeSessionId: session.id
    };
  });
