import { addDays, isAfter, isBefore } from "date-fns";
import { z } from "zod";

const schemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  notes: z.string().optional()
});

const datasetFileSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive()
});

export const datasetPlanSchema = z.object({
  type: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
  price: z.number().positive(),
  interval: z.string().optional(),
  tierName: z.string().min(1)
});

export const createDatasetSchema = z.object({
  orgId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(10),
  tags: z.array(z.string()).min(1),
  categories: z.array(z.string()).min(1),
  deliveryMethods: z.array(z.string()).min(1),
  schemaFields: z.array(schemaFieldSchema).min(1),
  sampleRows: z.array(z.record(z.unknown())).max(10),
  pricePlans: z.array(datasetPlanSchema).min(1),
  licenseTemplateId: z.string().min(1),
  customClauses: z.string().optional(),
  datasetFile: datasetFileSchema.optional()
});

export const assessDatasetSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1).optional(),
  fileSize: z.number().int().positive().optional()
});

export const createRequestSchema = z
  .object({
    orgId: z.string().min(1),
    title: z.string().min(3),
    objective: z.string().min(10),
    population: z.string().min(3),
    sampleSize: z.number().int().positive(),
    geography: z.string().min(2),
    dataType: z.string().min(2),
    budgetMin: z.number().positive(),
    budgetMax: z.number().positive(),
    deadlineAt: z.string().datetime(),
    flagsMinors: z.boolean(),
    flagsPii: z.boolean(),
    consentRequired: z.boolean(),
    extraComplianceDetails: z.string().optional(),
    schemaFields: z.array(schemaFieldSchema).min(1)
  })
  .superRefine((data, ctx) => {
    if (data.budgetMax < data.budgetMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "budgetMax must be greater than budgetMin",
        path: ["budgetMax"]
      });
    }

    const deadline = new Date(data.deadlineAt);
    if (isBefore(deadline, addDays(new Date(), 1))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deadline must be in the future",
        path: ["deadlineAt"]
      });
    }

    if ((data.flagsMinors || data.flagsPii) && !data.extraComplianceDetails?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Extra compliance details are required for minors/PII requests",
        path: ["extraComplianceDetails"]
      });
    }

    if (data.flagsMinors && !data.consentRequired) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Consent must be required when minors are targeted",
        path: ["consentRequired"]
      });
    }
  });

const bidMilestoneSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  acceptanceCriteria: z.string().min(4)
});

export const createBidSchema = z
  .object({
    requestId: z.string().min(1),
    orgId: z.string().min(1),
    status: z.enum(["DRAFT", "SUBMITTED"]).default("SUBMITTED"),
    pricingMode: z.enum(["FIXED", "MILESTONE"]),
    totalPrice: z.number().positive(),
    currency: z.string().default("USD"),
    timelineStart: z.string().datetime(),
    timelineEnd: z.string().datetime(),
    planText: z.string().min(10),
    complianceJson: z.record(z.unknown()),
    teamJson: z.record(z.unknown()),
    milestones: z.array(bidMilestoneSchema).min(1)
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.timelineStart);
    const end = new Date(data.timelineEnd);

    if (!isBefore(start, end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timelineStart must be before timelineEnd",
        path: ["timelineStart"]
      });
    }

    const sorted = [...data.milestones].sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
    for (let i = 0; i < sorted.length; i += 1) {
      const due = new Date(sorted[i].dueDate);
      if (isBefore(due, start) || isAfter(due, end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Milestone dueDate must be within timeline",
          path: ["milestones", i, "dueDate"]
        });
      }
      if (i > 0) {
        const prev = new Date(sorted[i - 1].dueDate);
        if (+prev === +due) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Milestone dueDates must be non-overlapping",
            path: ["milestones", i, "dueDate"]
          });
        }
      }
    }

    if (data.pricingMode === "MILESTONE") {
      const sum = data.milestones.reduce((acc, milestone) => acc + milestone.amount, 0);
      if (Math.abs(sum - data.totalPrice) > 0.001) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Milestone total must match totalPrice",
          path: ["milestones"]
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// Dynamic Pricing
// ---------------------------------------------------------------------------

export const updatePricingConfigSchema = z.object({
  orgId: z.string().min(1),
  autoPricingEnabled: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().positive().optional(),
  maxWeeklyChangePct: z.number().int().min(1).max(50).optional()
});

export const applyPriceSchema = z.object({
  orgId: z.string().min(1),
  snapshotId: z.string().min(1),
  reason: z.string().optional()
});

export const pricingPreviewSchema = z.object({
  qualityPercent: z.number().min(0).max(100),
  complexityTag: z.enum(["A", "B", "C", "D"]),
  cleaningCostUsd: z.number().min(0),
  categories: z.array(z.string()).optional(),
  currentPriceUsd: z.number().positive().optional()
});

export const createMessageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(5000)
});

export const createThreadSchema = z
  .object({
    type: z.enum(["REQUEST", "CONTRACT"]),
    requestId: z.string().optional(),
    contractId: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.type === "REQUEST" && !data.requestId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "requestId required", path: ["requestId"] });
    }

    if (data.type === "CONTRACT" && !data.contractId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "contractId required", path: ["contractId"] });
    }
  });
