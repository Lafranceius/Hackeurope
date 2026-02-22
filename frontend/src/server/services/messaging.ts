import { prisma } from "@/lib/prisma";

export const createThread = async (input: {
  type: "REQUEST" | "CONTRACT";
  requestId?: string;
  contractId?: string;
}) => {
  return prisma.messageThread.create({
    data: {
      type: input.type,
      requestId: input.requestId,
      contractId: input.contractId
    }
  });
};

export const addMessage = async (input: {
  threadId: string;
  senderUserId: string;
  body: string;
}) => {
  return prisma.message.create({
    data: {
      threadId: input.threadId,
      senderUserId: input.senderUserId,
      body: input.body
    }
  });
};
