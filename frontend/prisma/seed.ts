import { hash } from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const licenseBodies = {
  commercial:
    "This license permits internal commercial analytics use with redistribution prohibited without explicit addendum.",
  evaluation: "Evaluation use for 30 days, no production deployment without upgrade to commercial terms.",
  restricted:
    "Data containing sensitive segments requires explicit consent controls and annual compliance attestation."
};

const toDecimal = (n: number) => new Prisma.Decimal(n);

async function main() {
  await prisma.delivery.deleteMany();
  await prisma.contractMilestone.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.bidMilestone.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.requestSchemaField.deleteMany();
  await prisma.request.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.entitlement.deleteMany();
  await prisma.licenseAcceptance.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.datasetPricePlan.deleteMany();
  await prisma.datasetSampleRow.deleteMany();
  await prisma.datasetSchemaField.deleteMany();
  await prisma.datasetLicense.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.licenseTemplate.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.flagReport.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.org.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@datamarket.io",
      passwordHash,
      isPlatformAdmin: true
    }
  });

  const buyerOrgs = await Promise.all([
    prisma.org.create({ data: { name: "Acme Insights", type: "BUYER", billingEmail: "finance@acmeinsights.com" } }),
    prisma.org.create({ data: { name: "Northstar Capital", type: "BUYER", billingEmail: "ops@northstar.com" } }),
    prisma.org.create({ data: { name: "Helio Retail Labs", type: "BOTH", billingEmail: "billing@helioretail.com" } })
  ]);

  const supplierOrgs = await Promise.all([
    prisma.org.create({ data: { name: "Datastream Corp", type: "SELLER", billingEmail: "billing@datastream.com", verificationStatus: "VERIFIED" } }),
    prisma.org.create({ data: { name: "Volt Analytics", type: "SELLER", billingEmail: "billing@volta.com", verificationStatus: "VERIFIED" } }),
    prisma.org.create({ data: { name: "HealthData Inc", type: "SELLER", billingEmail: "billing@healthdata.com" } }),
    prisma.org.create({ data: { name: "Global Insights", type: "SELLER", billingEmail: "billing@globalinsights.com" } }),
    prisma.org.create({ data: { name: "AgriView", type: "SELLER", billingEmail: "billing@agriview.com" } }),
    prisma.org.create({ data: { name: "CodeStream", type: "SELLER", billingEmail: "billing@codestream.com" } })
  ]);

  const users = await Promise.all([
    prisma.user.create({ data: { name: "Alicia Chen", email: "alicia@acmeinsights.com", passwordHash } }),
    prisma.user.create({ data: { name: "Marcus Reed", email: "marcus@northstar.com", passwordHash } }),
    prisma.user.create({ data: { name: "Priya Singh", email: "priya@helioretail.com", passwordHash } }),
    prisma.user.create({ data: { name: "Darius Cole", email: "darius@datastream.com", passwordHash } }),
    prisma.user.create({ data: { name: "Lina Gomez", email: "lina@volta.com", passwordHash } }),
    prisma.user.create({ data: { name: "Noah Patel", email: "noah@healthdata.com", passwordHash } }),
    prisma.user.create({ data: { name: "Sara Kim", email: "sara@globalinsights.com", passwordHash } }),
    prisma.user.create({ data: { name: "Mateo Ruiz", email: "mateo@agriview.com", passwordHash } }),
    prisma.user.create({ data: { name: "Eva Stein", email: "eva@codestream.com", passwordHash } })
  ]);

  await prisma.orgMember.createMany({
    data: [
      { userId: users[0].id, orgId: buyerOrgs[0].id, role: "OWNER" },
      { userId: users[1].id, orgId: buyerOrgs[1].id, role: "OWNER" },
      { userId: users[2].id, orgId: buyerOrgs[2].id, role: "OWNER" },
      { userId: users[3].id, orgId: supplierOrgs[0].id, role: "OWNER" },
      { userId: users[4].id, orgId: supplierOrgs[1].id, role: "OWNER" },
      { userId: users[5].id, orgId: supplierOrgs[2].id, role: "OWNER" },
      { userId: users[6].id, orgId: supplierOrgs[3].id, role: "OWNER" },
      { userId: users[7].id, orgId: supplierOrgs[4].id, role: "OWNER" },
      { userId: users[8].id, orgId: supplierOrgs[5].id, role: "OWNER" },
      { userId: users[0].id, orgId: buyerOrgs[2].id, role: "ADMIN" }
    ]
  });

  const templates = await Promise.all([
    prisma.licenseTemplate.create({ data: { name: "Commercial Standard", body: licenseBodies.commercial, version: "1.0" } }),
    prisma.licenseTemplate.create({ data: { name: "Evaluation", body: licenseBodies.evaluation, version: "1.2" } }),
    prisma.licenseTemplate.create({ data: { name: "Restricted Personal Data", body: licenseBodies.restricted, version: "2.0" } })
  ]);

  const categoryConfigs = [
    {
      category: "Finance",
      titleSeeds: [
        "Equity OHLCV Time Series",
        "FX Spot Rate Time Series",
        "Index Futures Order Book Snapshots",
        "Options Implied Volatility Surface",
        "Corporate Bond Spread Monitor"
      ],
      intervals: ["5m", "15m", "1h", "1d", "30s"],
      regionLabels: ["US Large Cap", "Nordics", "DACH", "APAC Composite", "UK Midcap"],
      descriptionNotes: [
        "normalized market timestamps and venue harmonization",
        "gap flags, split-adjustments, and holiday calendar alignment",
        "exchange session metadata and liquidity markers"
      ],
      tags: ["finance", "equities", "tick"],
      basePrice: 6000,
      primaryPlanType: "SUBSCRIPTION" as const
    },
    {
      category: "Healthcare",
      titleSeeds: [
        "Hospital Bed Utilization Time Series",
        "Clinical Lab Turnaround Metrics",
        "ER Queue and Triage Throughput Feed",
        "Claims Adjudication Latency Panel",
        "Pharmacy Dispense Volume Index"
      ],
      intervals: ["1h", "6h", "1d", "12h", "30m"],
      regionLabels: ["US Northeast", "US West", "Benelux", "Nordic Hospitals", "UK NHS Trust Sample"],
      descriptionNotes: [
        "de-identified aggregates with compliance-safe segmentation",
        "facility-level trend normalization and anomaly flags",
        "weekly and seasonal adjustment fields for operational analytics"
      ],
      tags: ["healthcare", "claims", "outcomes"],
      basePrice: 18000,
      primaryPlanType: "ONE_TIME" as const
    },
    {
      category: "Retail",
      titleSeeds: [
        "Store Footfall Sensor Time Series",
        "Point-of-Sale Basket Velocity Feed",
        "Shopping Mall Dwell-Time Aggregates",
        "Regional Retail Inventory Pulse",
        "Promo Conversion and Coupon Redemption Stream"
      ],
      intervals: ["15m", "1h", "1d", "30m", "5m"],
      regionLabels: ["Nordic Urban Centers", "US Suburban Malls", "DACH Grocery Chain", "UK High Street", "Iberia Retail Parks"],
      descriptionNotes: [
        "store-level traffic and spend normalization with calendar tagging",
        "promotion windows, closure flags, and holiday uplift markers",
        "aggregated device-count and transaction proxies for demand modeling"
      ],
      tags: ["retail", "transactions", "consumer"],
      basePrice: 9000,
      primaryPlanType: "SUBSCRIPTION" as const
    },
    {
      category: "Energy",
      titleSeeds: [
        "Grid Load and Generation Time Series",
        "Solar Panel Output Telemetry",
        "Wind Turbine SCADA Performance Feed",
        "Substation Voltage and Frequency Monitor",
        "Offshore Maritime Sonar and Vessel Proximity Stream"
      ],
      intervals: ["5m", "1h", "10m", "30s", "10s"],
      regionLabels: ["Nordic Grid Zones", "Southern Europe Solar Farms", "North Sea Offshore Assets", "US ISO Hubs", "Baltic Marine Corridors"],
      descriptionNotes: [
        "plant and feeder telemetry with quality-controlled resampling",
        "weather-aligned generation metrics and outage annotations",
        "sensor drift checks, calibration markers, and downtime labels"
      ],
      tags: ["energy", "grid", "forecast"],
      basePrice: 12000,
      primaryPlanType: "SUBSCRIPTION" as const
    }
  ] as const;

  const datasets = [];
  let datasetIndex = 0;

  for (let categoryIndex = 0; categoryIndex < categoryConfigs.length; categoryIndex += 1) {
    const config = categoryConfigs[categoryIndex];

    for (let item = 1; item <= 20; item += 1) {
      const supplier = supplierOrgs[(datasetIndex + item) % supplierOrgs.length];
      const seedTitle = config.titleSeeds[(item - 1) % config.titleSeeds.length];
      const interval = config.intervals[(item - 1) % config.intervals.length];
      const region = config.regionLabels[(datasetIndex + item) % config.regionLabels.length];
      const note = config.descriptionNotes[(item + categoryIndex) % config.descriptionNotes.length];
      const title = `${seedTitle} (${interval} interval) - ${region} ${String(item).padStart(2, "0")}`;
      const price = config.basePrice + item * 350 + categoryIndex * 600;
      const isSensitiveCategory = config.category === "Healthcare";

      const dataset = await prisma.dataset.create({
        data: {
          orgId: supplier.id,
          title,
          description: `${title} includes normalized records with ${note}. Delivery supports bulk export and API access with enterprise-grade QC automation.`,
          tags: [...config.tags, `batch-${item}`],
          categories: [config.category],
          status: "PUBLISHED",
          deliveryMethods: ["DOWNLOAD", "API"],
          verificationStatus: supplier.verificationStatus === "VERIFIED" && item % 2 === 0 ? "VERIFIED" : "UNVERIFIED",
          schemaFields: {
            create: [
              { name: "timestamp_utc", type: "TIMESTAMP", required: true, notes: "Event timestamp" },
              { name: "entity_id", type: "STRING", required: true, notes: "Source identifier" },
              { name: "value", type: "FLOAT", required: false, notes: "Observation value" }
            ]
          },
          sampleRows: {
            create: [{ jsonRow: { timestamp_utc: "2025-01-10T12:00:00Z", entity_id: `A${100 + item}`, value: 80 + item / 10 } }]
          },
          pricePlans: {
            create: [
              {
                type: config.primaryPlanType,
                price: toDecimal(price),
                interval: config.primaryPlanType === "SUBSCRIPTION" ? "month" : null,
                tierName: "Enterprise"
              },
              {
                type: "ONE_TIME",
                price: toDecimal(Math.round(price * 1.6)),
                interval: null,
                tierName: "Bulk Export"
              }
            ]
          },
          license: {
            create: {
              templateId: isSensitiveCategory ? templates[2].id : templates[0].id,
              version: isSensitiveCategory ? "2.0" : "1.0",
              customClauses: isSensitiveCategory
                ? "Sensitive segments require annual audit attestation."
                : "Redistribution prohibited without explicit addendum."
            }
          }
        },
        include: { pricePlans: true, license: true }
      });

      datasets.push(dataset);
      datasetIndex += 1;
    }
  }

  const requestSpecs = [
    {
      title: "Student Intellectual Stimulation Survey Dataset (Grades 5–7)",
      objective: "Collect survey data measuring intellectual stimulation in school classrooms and home support contexts.",
      population: "Students grade 5-7",
      sampleSize: 1000,
      geography: "United States",
      dataType: "Survey",
      budgetMin: 45000,
      budgetMax: 120000,
      daysOut: 28,
      flagsMinors: true,
      flagsPii: false,
      consentRequired: true,
      details: "Parental consent artifacts and school district approvals are mandatory.",
      buyerOrgId: buyerOrgs[0].id
    },
    {
      title: "SMB Cloud Spend Panel Study",
      objective: "Quarterly cloud spend benchmarks for SMB segment by industry vertical.",
      population: "US SMB finance leaders",
      sampleSize: 600,
      geography: "US + Canada",
      dataType: "Panel",
      budgetMin: 30000,
      budgetMax: 75000,
      daysOut: 18,
      flagsMinors: false,
      flagsPii: false,
      consentRequired: false,
      details: "No personally identifying fields should be collected.",
      buyerOrgId: buyerOrgs[1].id
    },
    {
      title: "Urban Mobility Device Usage Diary",
      objective: "Gather app-based mobility diary data for scooter, ride-share, and transit usage.",
      population: "Adults 18+",
      sampleSize: 1200,
      geography: "US metro areas",
      dataType: "Diary",
      budgetMin: 60000,
      budgetMax: 130000,
      daysOut: 24,
      flagsMinors: false,
      flagsPii: true,
      consentRequired: true,
      details: "PII handling and retention policy documentation required.",
      buyerOrgId: buyerOrgs[2].id
    },
    {
      title: "Regional Retail Inventory Pulse",
      objective: "Weekly in-store inventory observations across key consumer categories.",
      population: "Retail outlets",
      sampleSize: 400,
      geography: "EU5",
      dataType: "Observation",
      budgetMin: 25000,
      budgetMax: 58000,
      daysOut: 14,
      flagsMinors: false,
      flagsPii: false,
      consentRequired: false,
      details: "Store anonymization mandatory.",
      buyerOrgId: buyerOrgs[1].id
    },
    {
      title: "Clinical Appointment Accessibility Study",
      objective: "Time-to-appointment and specialist access patterns by region.",
      population: "Outpatient clinics",
      sampleSize: 700,
      geography: "North America",
      dataType: "Operational",
      budgetMin: 52000,
      budgetMax: 110000,
      daysOut: 30,
      flagsMinors: false,
      flagsPii: true,
      consentRequired: true,
      details: "HIPAA-aligned de-identification required.",
      buyerOrgId: buyerOrgs[0].id
    }
  ];

  const requests = [];
  for (const spec of requestSpecs) {
    const request = await prisma.request.create({
      data: {
        buyerOrgId: spec.buyerOrgId,
        title: spec.title,
        objective: spec.objective,
        population: spec.population,
        sampleSize: spec.sampleSize,
        geography: spec.geography,
        dataType: spec.dataType,
        budgetMin: toDecimal(spec.budgetMin),
        budgetMax: toDecimal(spec.budgetMax),
        deadlineAt: new Date(Date.now() + spec.daysOut * 86400000),
        flagsMinors: spec.flagsMinors,
        flagsPii: spec.flagsPii,
        consentRequired: spec.consentRequired,
        extraComplianceDetails: spec.details,
        status: "OPEN",
        schemaFields: {
          create: [
            { name: "respondent_id", type: "STRING", required: true, notes: "Anonymized ID" },
            { name: "region", type: "STRING", required: true, notes: "Geo segment" },
            { name: "outcome_score", type: "FLOAT", required: true, notes: "Main outcome field" }
          ]
        }
      }
    });
    requests.push(request);
  }

  const supplierIds = supplierOrgs.map((org) => org.id);
  const bidRecords = [];
  for (let i = 0; i < requests.length; i += 1) {
    const request = requests[i];
    const bidCount = 2 + (i % 3);
    for (let j = 0; j < bidCount; j += 1) {
      const supplierOrgId = supplierIds[(i + j) % supplierIds.length];
      const total = 42000 + i * 9000 + j * 4500;
      const bid = await prisma.bid.create({
        data: {
          requestId: request.id,
          supplierOrgId,
          status: "SUBMITTED",
          totalPrice: toDecimal(total),
          currency: "USD",
          timelineStart: new Date(Date.now() + 3 * 86400000),
          timelineEnd: new Date(Date.now() + (35 + i * 5 + j * 4) * 86400000),
          planText: "Sampling, recruitment, instrument QA, pilot launch, and delivery review.",
          complianceJson: {
            complianceOfficer: "Dana Mills",
            piiHandling: "encrypted",
            consentControls: "documented"
          },
          teamJson: {
            lead: "Delivery Manager",
            credentials: "10+ years fieldwork"
          },
          milestones: {
            create: [
              {
                name: "Pilot completion",
                amount: toDecimal(total * 0.4),
                dueDate: new Date(Date.now() + 20 * 86400000),
                acceptanceCriteria: "Pilot quality report approved"
              },
              {
                name: "Final delivery",
                amount: toDecimal(total * 0.6),
                dueDate: new Date(Date.now() + 45 * 86400000),
                acceptanceCriteria: "Final validation passed"
              }
            ]
          }
        },
        include: { milestones: true }
      });
      bidRecords.push(bid);
    }
  }

  const winningBid = bidRecords[0];
  const winningRequest = requests.find((request) => request.id === winningBid.requestId)!;

  await prisma.bid.update({ where: { id: winningBid.id }, data: { status: "AWARDED" } });
  await prisma.request.update({ where: { id: winningRequest.id }, data: { status: "AWARDED" } });

  const contract = await prisma.contract.create({
    data: {
      requestId: winningRequest.id,
      bidId: winningBid.id,
      buyerOrgId: winningRequest.buyerOrgId,
      supplierOrgId: winningBid.supplierOrgId,
      status: "ACTIVE",
      milestones: {
        create: winningBid.milestones.map((m, index) => {
          if (index === 0) {
            return {
              name: m.name,
              amount: m.amount,
              dueDate: m.dueDate,
              status: "ACCEPTED" as const,
              acceptanceCriteria: m.acceptanceCriteria,
              deliveries: { create: [{ fileUrl: "/uploads/pilot-delivery.zip", notes: "Pilot package submitted" }] }
            };
          }

          return {
            name: m.name,
            amount: m.amount,
            dueDate: m.dueDate,
            status: "SUBMITTED" as const,
            acceptanceCriteria: m.acceptanceCriteria
          };
        })
      }
    },
    include: { milestones: true }
  });

  await prisma.invoice.create({
    data: {
      contractId: contract.id,
      number: `INV-CON-${Date.now()}`,
      amount: winningBid.totalPrice,
      currency: "USD",
      status: "ISSUED",
      pdfUrl: `/invoices/contracts/${contract.id}.pdf`
    }
  });

  const purchasedDataset = datasets[0];
  const buyerOrgForPurchase = buyerOrgs[0];
  const selectedPlan = purchasedDataset.pricePlans[0];

  const purchase = await prisma.purchase.create({
    data: {
      datasetId: purchasedDataset.id,
      buyerOrgId: buyerOrgForPurchase.id,
      planId: selectedPlan.id,
      status: "PAID"
    }
  });

  await prisma.licenseAcceptance.create({
    data: {
      userId: users[0].id,
      purchaseId: purchase.id,
      datasetLicenseId: purchasedDataset.license!.id,
      version: purchasedDataset.license!.version
    }
  });

  await prisma.entitlement.create({
    data: {
      purchaseId: purchase.id,
      buyerOrgId: buyerOrgForPurchase.id,
      datasetId: purchasedDataset.id,
      accessType: "API",
      apiKey: `api_seed_${Date.now()}`,
      downloadUrl: `/downloads/${purchasedDataset.id}.zip`,
      active: true
    }
  });

  await prisma.invoice.create({
    data: {
      purchaseId: purchase.id,
      number: `INV-PUR-${Date.now()}`,
      amount: selectedPlan.price,
      currency: "USD",
      status: "PAID",
      pdfUrl: `/invoices/${purchase.id}.pdf`
    }
  });

  const thread = await prisma.messageThread.create({
    data: {
      type: "CONTRACT",
      contractId: contract.id,
      messages: {
        create: [
          { senderUserId: users[3].id, body: "Pilot delivery uploaded. Please review." },
          { senderUserId: users[0].id, body: "Pilot accepted. Proceeding to final phase." }
        ]
      }
    }
  });

  await prisma.flagReport.createMany({
    data: [
      {
        reporterUserId: users[1].id,
        entityType: "DATASET",
        entityId: datasets[2].id,
        reason: "Potentially outdated schema sample",
        status: "OPEN"
      },
      {
        reporterUserId: users[2].id,
        entityType: "REQUEST",
        entityId: requests[2].id,
        reason: "PII requirements unclear",
        status: "REVIEWING"
      }
    ]
  });

  await prisma.attachment.createMany({
    data: [
      { ownerType: "REQUEST", ownerId: requests[0].id, fileUrl: "/uploads/consent-template.pdf", name: "consent-template.pdf" },
      { ownerType: "CONTRACT", ownerId: contract.id, fileUrl: "/uploads/delivery-guide.pdf", name: "delivery-guide.pdf" }
    ]
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        actorUserId: users[3].id,
        orgId: supplierOrgs[0].id,
        entityType: "Dataset",
        entityId: purchasedDataset.id,
        action: "listing.created",
        metadataJson: { seed: true }
      },
      {
        actorUserId: users[3].id,
        orgId: supplierOrgs[0].id,
        entityType: "Dataset",
        entityId: purchasedDataset.id,
        action: "listing.published",
        metadataJson: { seed: true }
      },
      {
        actorUserId: users[0].id,
        orgId: buyerOrgs[0].id,
        entityType: "Purchase",
        entityId: purchase.id,
        action: "purchase.completed",
        metadataJson: { datasetId: purchasedDataset.id }
      },
      {
        actorUserId: users[0].id,
        orgId: buyerOrgs[0].id,
        entityType: "License",
        entityId: purchasedDataset.license!.id,
        action: "license.accepted",
        metadataJson: { version: purchasedDataset.license!.version }
      },
      {
        actorUserId: users[4].id,
        orgId: winningBid.supplierOrgId,
        entityType: "Bid",
        entityId: winningBid.id,
        action: "bid.submitted",
        metadataJson: { requestId: winningRequest.id }
      },
      {
        actorUserId: users[0].id,
        orgId: winningRequest.buyerOrgId,
        entityType: "Contract",
        entityId: contract.id,
        action: "contract.awarded",
        metadataJson: { bidId: winningBid.id }
      },
      {
        actorUserId: users[3].id,
        orgId: contract.supplierOrgId,
        entityType: "Delivery",
        entityId: contract.milestones[0].id,
        action: "delivery.uploaded",
        metadataJson: { threadId: thread.id }
      },
      {
        actorUserId: users[0].id,
        orgId: contract.buyerOrgId,
        entityType: "ContractMilestone",
        entityId: contract.milestones[0].id,
        action: "milestone.accepted",
        metadataJson: { seed: true }
      }
    ]
  });

  await prisma.orgMember.create({
    data: {
      userId: admin.id,
      orgId: buyerOrgs[0].id,
      role: "VIEWER"
    }
  });

  console.log("Seed complete.");
  console.log("Admin login: admin@datamarket.io / password123");
  console.log("Buyer login: alicia@acmeinsights.com / password123");
  console.log("Supplier login: darius@datastream.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
