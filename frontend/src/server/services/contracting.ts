import { BidStatus, Prisma, RequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/server/audit";

const invoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const createRequest = async (
  actorUserId: string,
  payload: {
    orgId: string;
    title: string;
    objective: string;
    population: string;
    sampleSize: number;
    geography: string;
    dataType: string;
    budgetMin: number;
    budgetMax: number;
    deadlineAt: string;
    flagsMinors: boolean;
    flagsPii: boolean;
    consentRequired: boolean;
    extraComplianceDetails?: string;
    schemaFields: Array<{ name: string; type: string; required: boolean; notes?: string }>;
  }
) => {
  const request = await prisma.request.create({
    data: {
      buyerOrgId: payload.orgId,
      title: payload.title,
      objective: payload.objective,
      population: payload.population,
      sampleSize: payload.sampleSize,
      geography: payload.geography,
      dataType: payload.dataType,
      budgetMin: new Prisma.Decimal(payload.budgetMin),
      budgetMax: new Prisma.Decimal(payload.budgetMax),
      deadlineAt: new Date(payload.deadlineAt),
      flagsMinors: payload.flagsMinors,
      flagsPii: payload.flagsPii,
      consentRequired: payload.consentRequired,
      extraComplianceDetails: payload.extraComplianceDetails,
      status: RequestStatus.OPEN,
      schemaFields: {
        create: payload.schemaFields
      }
    }
  });

  await writeAuditEvent({
    actorUserId,
    orgId: payload.orgId,
    entityType: "Request",
    entityId: request.id,
    action: "request.created",
    metadataJson: {
      flagsMinors: payload.flagsMinors,
      flagsPii: payload.flagsPii
    }
  });

  return request;
};

export const submitBid = async (
  actorUserId: string,
  payload: {
    requestId: string;
    orgId: string;
    status: "DRAFT" | "SUBMITTED";
    totalPrice: number;
    currency: string;
    timelineStart: string;
    timelineEnd: string;
    planText: string;
    complianceJson: Record<string, unknown>;
    teamJson: Record<string, unknown>;
    milestones: Array<{ name: string; amount: number; dueDate: string; acceptanceCriteria: string }>;
  }
) => {
  const bid = await prisma.bid.create({
    data: {
      requestId: payload.requestId,
      supplierOrgId: payload.orgId,
      status: payload.status,
      totalPrice: new Prisma.Decimal(payload.totalPrice),
      currency: payload.currency,
      timelineStart: new Date(payload.timelineStart),
      timelineEnd: new Date(payload.timelineEnd),
      planText: payload.planText,
      complianceJson: payload.complianceJson as Prisma.InputJsonObject,
      teamJson: payload.teamJson as Prisma.InputJsonObject,
      milestones: {
        create: payload.milestones.map((milestone) => ({
          name: milestone.name,
          amount: new Prisma.Decimal(milestone.amount),
          dueDate: new Date(milestone.dueDate),
          acceptanceCriteria: milestone.acceptanceCriteria
        }))
      }
    }
  });

  if (payload.status === "SUBMITTED") {
    await writeAuditEvent({
      actorUserId,
      orgId: payload.orgId,
      entityType: "Bid",
      entityId: bid.id,
      action: "bid.submitted",
      metadataJson: { requestId: payload.requestId }
    });
  }

  return bid;
};

export const awardBid = async (args: {
  actorUserId: string;
  requestId: string;
  bidId: string;
  buyerOrgId: string;
}) => {
  const result = await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.findUnique({
      where: { id: args.bidId },
      include: { milestones: true }
    });

    if (!bid || bid.requestId !== args.requestId) {
      throw new Error("Bid not found for request");
    }

    if (bid.supplierOrgId === args.buyerOrgId) {
      throw new Error("Buyer cannot award own bid");
    }

    await tx.bid.updateMany({
      where: { requestId: args.requestId, status: BidStatus.SUBMITTED },
      data: { status: BidStatus.UNDER_REVIEW }
    });

    await tx.bid.update({
      where: { id: args.bidId },
      data: { status: BidStatus.AWARDED }
    });

    await tx.request.update({
      where: { id: args.requestId },
      data: { status: RequestStatus.AWARDED }
    });

    const contract = await tx.contract.create({
      data: {
        requestId: args.requestId,
        bidId: args.bidId,
        buyerOrgId: args.buyerOrgId,
        supplierOrgId: bid.supplierOrgId,
        status: "ACTIVE",
        milestones: {
          create: bid.milestones.map((milestone) => ({
            name: milestone.name,
            amount: milestone.amount,
            dueDate: milestone.dueDate,
            acceptanceCriteria: milestone.acceptanceCriteria,
            status: "PENDING"
          }))
        }
      }
    });

    await tx.invoice.create({
      data: {
        contractId: contract.id,
        number: invoiceNumber(),
        status: "ISSUED",
        amount: bid.totalPrice,
        currency: bid.currency,
        pdfUrl: `/invoices/contracts/${contract.id}.pdf`
      }
    });

    return contract;
  });

  await writeAuditEvent({
    actorUserId: args.actorUserId,
    orgId: args.buyerOrgId,
    entityType: "Contract",
    entityId: result.id,
    action: "contract.awarded",
    metadataJson: { requestId: args.requestId, bidId: args.bidId }
  });

  return result;
};

export const uploadDelivery = async (args: {
  actorUserId: string;
  orgId: string;
  contractId: string;
  milestoneId: string;
  fileUrl: string;
  notes?: string;
}) => {
  const milestone = await prisma.contractMilestone.findUnique({
    where: { id: args.milestoneId },
    include: { contract: true }
  });

  if (!milestone || milestone.contractId !== args.contractId) {
    throw new Error("Milestone not found");
  }

  const delivery = await prisma.$transaction(async (tx) => {
    const created = await tx.delivery.create({
      data: {
        contractMilestoneId: args.milestoneId,
        fileUrl: args.fileUrl,
        notes: args.notes
      }
    });

    await tx.contractMilestone.update({
      where: { id: args.milestoneId },
      data: { status: "SUBMITTED" }
    });

    return created;
  });

  await writeAuditEvent({
    actorUserId: args.actorUserId,
    orgId: args.orgId,
    entityType: "Delivery",
    entityId: delivery.id,
    action: "delivery.uploaded",
    metadataJson: { contractId: args.contractId, milestoneId: args.milestoneId }
  });

  return delivery;
};

export const acceptMilestone = async (args: {
  actorUserId: string;
  orgId: string;
  milestoneId: string;
  accepted: boolean;
  comment?: string;
}) => {
  const status = args.accepted ? "ACCEPTED" : "CHANGES_REQUESTED";

  const milestone = await prisma.contractMilestone.update({
    where: { id: args.milestoneId },
    data: { status }
  });

  if (args.accepted) {
    await writeAuditEvent({
      actorUserId: args.actorUserId,
      orgId: args.orgId,
      entityType: "ContractMilestone",
      entityId: args.milestoneId,
      action: "milestone.accepted",
      metadataJson: { comment: args.comment }
    });
  }

  return milestone;
};
