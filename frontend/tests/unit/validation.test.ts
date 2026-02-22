import { describe, expect, it } from "vitest";

import { createBidSchema, createRequestSchema } from "@/server/validation";

describe("request validation", () => {
  it("requires compliance details when minors are flagged", () => {
    const result = createRequestSchema.safeParse({
      orgId: "org_1",
      title: "Test Request",
      objective: "Objective long enough",
      population: "Students",
      sampleSize: 100,
      geography: "US",
      dataType: "Survey",
      budgetMin: 1000,
      budgetMax: 2000,
      deadlineAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      flagsMinors: true,
      flagsPii: false,
      consentRequired: true,
      schemaFields: [{ name: "x", type: "STRING", required: true }]
    });

    expect(result.success).toBe(false);
  });
});

describe("bid validation", () => {
  it("fails when milestone sum does not match total", () => {
    const result = createBidSchema.safeParse({
      requestId: "req_1",
      orgId: "org_1",
      status: "SUBMITTED",
      pricingMode: "MILESTONE",
      totalPrice: 100,
      currency: "USD",
      timelineStart: new Date(Date.now() + 86400000).toISOString(),
      timelineEnd: new Date(Date.now() + 5 * 86400000).toISOString(),
      planText: "Detailed plan text",
      complianceJson: { complianceOfficer: "Officer" },
      teamJson: { lead: "Lead" },
      milestones: [
        {
          name: "one",
          amount: 50,
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          acceptanceCriteria: "ok"
        },
        {
          name: "two",
          amount: 20,
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          acceptanceCriteria: "ok"
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
