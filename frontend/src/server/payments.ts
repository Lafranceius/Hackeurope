import Stripe from "stripe";

import { env } from "@/server/env";

let stripeClient: Stripe | null = null;

if (env.enableStripe && env.stripeSecretKey) {
  stripeClient = new Stripe(env.stripeSecretKey, {
    apiVersion: "2025-08-27.basil"
  });
}

export const payments = {
  isStripeEnabled: () => Boolean(stripeClient),
  createCheckoutSession: async (args: {
    amount: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    description: string;
  }) => {
    if (!stripeClient) {
      throw new Error("Stripe is disabled");
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: args.currency.toLowerCase(),
            unit_amount: Math.round(args.amount * 100),
            product_data: {
              name: args.description
            }
          }
        }
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl
    });

    return session;
  }
};
