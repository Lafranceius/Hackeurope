import { prisma } from "@/lib/prisma";
import { withRouteError } from "@/server/http";
import { requireUser } from "@/server/session";
import { addMessage } from "@/server/services/messaging";
import { createMessageSchema } from "@/server/validation";

export const POST = async (request: Request) =>
  withRouteError(async () => {
    const user = await requireUser();
    const payload = createMessageSchema.parse(await request.json());

    const thread = await prisma.messageThread.findUnique({
      where: { id: payload.threadId },
      include: {
        request: true,
        contract: true
      }
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    let permitted = false;
    if (thread.request) {
      const inBuyerOrg = user.memberships.some((membership) => membership.orgId === thread.request?.buyerOrgId);
      const supplierBid = await prisma.bid.findFirst({
        where: {
          requestId: thread.request.id,
          supplierOrgId: {
            in: user.memberships.map((membership) => membership.orgId)
          }
        }
      });
      permitted = Boolean(inBuyerOrg || supplierBid);
    }

    if (thread.contract) {
      permitted = user.memberships.some(
        (membership) =>
          membership.orgId === thread.contract?.buyerOrgId || membership.orgId === thread.contract?.supplierOrgId
      );
    }

    if (!permitted) {
      throw new Error("Forbidden");
    }

    return addMessage({
      threadId: payload.threadId,
      senderUserId: user.id,
      body: payload.body
    });
  });
