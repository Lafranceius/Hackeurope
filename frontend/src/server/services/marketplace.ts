import { AttachmentOwnerType, DatasetStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/server/audit";
import { makeDownloadUrl } from "@/server/storage";

const invoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const createDataset = async (
  actorUserId: string,
  payload: {
    orgId: string;
    title: string;
    description: string;
    tags: string[];
    categories: string[];
    deliveryMethods: string[];
    schemaFields: Array<{ name: string; type: string; required: boolean; notes?: string }>;
    sampleRows: Array<Record<string, unknown>>;
    pricePlans: Array<{ type: "ONE_TIME" | "SUBSCRIPTION"; price: number; interval?: string; tierName: string }>;
    licenseTemplateId: string;
    customClauses?: string;
    datasetFile?: {
      fileUrl: string;
      fileName: string;
      fileSize: number;
    };
  }
) => {
  const dataset = await prisma.dataset.create({
    data: {
      orgId: payload.orgId,
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      categories: payload.categories,
      status: DatasetStatus.DRAFT,
      deliveryMethods: payload.deliveryMethods,
      schemaFields: {
        create: payload.schemaFields
      },
      sampleRows: {
        create: payload.sampleRows.map((row) => ({ jsonRow: row as Prisma.InputJsonObject }))
      },
      pricePlans: {
        create: payload.pricePlans.map((plan) => ({
          type: plan.type,
          price: new Prisma.Decimal(plan.price),
          interval: plan.interval,
          tierName: plan.tierName
        }))
      },
      license: {
        create: {
          templateId: payload.licenseTemplateId,
          version: "1.0",
          customClauses: payload.customClauses
        }
      }
    },
    include: {
      pricePlans: true,
      schemaFields: true
    }
  });

  await writeAuditEvent({
    actorUserId,
    orgId: payload.orgId,
    entityType: "Dataset",
    entityId: dataset.id,
    action: "listing.created",
    metadataJson: { title: dataset.title }
  });

  if (payload.datasetFile) {
    await prisma.attachment.create({
      data: {
        ownerType: AttachmentOwnerType.DATASET,
        ownerId: dataset.id,
        fileUrl: payload.datasetFile.fileUrl,
        name: payload.datasetFile.fileName
      }
    });
  }

  return dataset;
};

export const updateDataset = async (
  actorUserId: string,
  datasetId: string,
  orgId: string,
  payload: Partial<{
    title: string;
    description: string;
    tags: string[];
    categories: string[];
    status: DatasetStatus;
  }>
) => {
  const updated = await prisma.dataset.updateMany({
    where: { id: datasetId, orgId },
    data: {
      ...payload,
      lastUpdatedAt: new Date()
    }
  });

  if (updated.count === 0) {
    throw new Error("Dataset not found");
  }

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId }
  });

  if (!dataset) {
    throw new Error("Dataset not found");
  }

  await writeAuditEvent({
    actorUserId,
    orgId,
    entityType: "Dataset",
    entityId: datasetId,
    action: "listing.updated",
    metadataJson: { fields: Object.keys(payload) }
  });

  return dataset;
};

export const publishDataset = async (actorUserId: string, datasetId: string, orgId: string) => {
  const fileAttachment = await prisma.attachment.findFirst({
    where: {
      ownerType: AttachmentOwnerType.DATASET,
      ownerId: datasetId
    },
    select: { id: true, fileUrl: true }
  });

  if (!fileAttachment) {
    throw new Error("Upload a dataset file before publishing");
  }

  const updated = await prisma.dataset.updateMany({
    where: { id: datasetId, orgId },
    data: {
      status: DatasetStatus.PUBLISHED,
      lastUpdatedAt: new Date()
    }
  });

  if (updated.count === 0) {
    throw new Error("Dataset not found");
  }

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId }
  });

  if (!dataset) {
    throw new Error("Dataset not found");
  }

  await writeAuditEvent({
    actorUserId,
    orgId,
    entityType: "Dataset",
    entityId: datasetId,
    action: "listing.published",
    metadataJson: { fileUrl: fileAttachment.fileUrl }
  });

  return dataset;
};

export const completePurchase = async (args: {
  actorUserId: string;
  buyerOrgId: string;
  datasetId: string;
  planId: string;
  stripePaymentId?: string;
}) => {
  const dataset = await prisma.dataset.findUnique({
    where: { id: args.datasetId },
    include: {
      license: true,
      pricePlans: true
    }
  });

  if (!dataset || dataset.status !== DatasetStatus.PUBLISHED) {
    throw new Error("Dataset not available");
  }
  if (dataset.orgId === args.buyerOrgId) {
    throw new Error("Seller org cannot purchase its own dataset");
  }

  const selectedPlan = dataset.pricePlans.find((plan) => plan.id === args.planId);
  if (!selectedPlan) {
    throw new Error("Invalid plan");
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        datasetId: dataset.id,
        buyerOrgId: args.buyerOrgId,
        planId: selectedPlan.id,
        status: "PAID",
        stripePaymentId: args.stripePaymentId
      }
    });

    if (!dataset.license) {
      throw new Error("Dataset license is missing");
    }

    await tx.licenseAcceptance.create({
      data: {
        userId: args.actorUserId,
        purchaseId: created.id,
        datasetLicenseId: dataset.license.id,
        version: dataset.license.version
      }
    });

    await tx.entitlement.create({
      data: {
        purchaseId: created.id,
        buyerOrgId: args.buyerOrgId,
        datasetId: dataset.id,
        accessType: dataset.deliveryMethods.includes("API") ? "API" : "DOWNLOAD",
        apiKey: dataset.deliveryMethods.includes("API") ? `api_${randomUUID().replace(/-/g, "")}` : null,
        downloadUrl: dataset.deliveryMethods.includes("DOWNLOAD") ? makeDownloadUrl(dataset.id) : null,
        active: true
      }
    });

    await tx.invoice.create({
      data: {
        purchaseId: created.id,
        number: invoiceNumber(),
        status: "ISSUED",
        amount: selectedPlan.price,
        currency: "USD",
        pdfUrl: `/invoices/${created.id}.pdf`
      }
    });

    return created;
  });

  await writeAuditEvent({
    actorUserId: args.actorUserId,
    orgId: args.buyerOrgId,
    entityType: "Purchase",
    entityId: purchase.id,
    action: "purchase.completed",
    metadataJson: { datasetId: args.datasetId }
  });

  await writeAuditEvent({
    actorUserId: args.actorUserId,
    orgId: args.buyerOrgId,
    entityType: "License",
    entityId: dataset.license!.id,
    action: "license.accepted",
    metadataJson: { version: dataset.license!.version }
  });

  return purchase;
};
