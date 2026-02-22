import Link from "next/link";
import { cookies } from "next/headers";

import { DatasetPublishActions } from "@/components/forms/dataset-publish-actions";
import { PurchaseTicket } from "@/components/forms/purchase-ticket";
import { ReportFlagButton } from "@/components/forms/report-flag-button";
import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WarningBanner } from "@/components/ui/warning-banner";
import { DatasetPricingPanel } from "@/components/pricing/dataset-pricing-panel";
import { prisma } from "@/lib/prisma";
import { env } from "@/server/env";
import { requirePageSession } from "@/server/page-auth";
import { getOrComputeRecommendation } from "@/server/services/dynamic-pricing";

const DatasetDetailPage = async ({ params }: { params: Promise<{ datasetId: string }> }) => {
  const user = await requirePageSession();
  const { datasetId } = await params;

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      org: true,
      schemaFields: true,
      sampleRows: true,
      pricePlans: true,
      purchases: {
        where: {
          buyerOrgId: {
            in: user.memberships.map((membership) => membership.orgId)
          },
          status: "PAID"
        },
        include: {
          entitlement: true,
          invoice: true
        },
        orderBy: { createdAt: "desc" },
        take: 1
      },
      license: {
        include: { template: true }
      }
    }
  });

  if (!dataset) {
    return <div>Not found</div>;
  }

  const activeOrgCookie = (await cookies()).get("activeOrgId")?.value;
  const activeOrgId = activeOrgCookie ?? user.activeOrgId ?? user.memberships[0]?.orgId;
  const isSeller = user.memberships.some((membership) => membership.orgId === dataset.orgId);
  const entitlement = dataset.purchases[0]?.entitlement;
  const invoice = dataset.purchases[0]?.invoice;

  // Load dynamic pricing data for the seller (feature-flagged)
  let pricingSnapshot: Awaited<ReturnType<typeof getOrComputeRecommendation>> | null = null;
  let pricingConfig: {
    id: string;
    autoPricingEnabled: boolean;
    minPrice: number;
    maxPrice: number;
    maxWeeklyChangePct: number;
    lastAppliedAt: string | null;
  } | null = null;

  if (isSeller && env.dynamicPricingEnabled) {
    const [snap, cfg] = await Promise.all([
      getOrComputeRecommendation(datasetId).catch(() => null),
      prisma.datasetPricingConfig.findUnique({ where: { datasetId } })
    ]);
    pricingSnapshot = snap;
    if (cfg) {
      pricingConfig = {
        id: cfg.id,
        autoPricingEnabled: cfg.autoPricingEnabled,
        minPrice: cfg.minPrice.toNumber(),
        maxPrice: cfg.maxPrice.toNumber(),
        maxWeeklyChangePct: cfg.maxWeeklyChangePct,
        lastAppliedAt: cfg.lastAppliedAt?.toISOString() ?? null
      };
    }
  }

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-textMuted">
              <Link href="/marketplace">Marketplace</Link> / <span>{dataset.categories[0]}</span>
            </div>
            <h1 className="page-title">{dataset.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-brand">{dataset.org.name}</span>
              {dataset.org.verificationStatus === "VERIFIED" ? <Badge variant="success">Verified</Badge> : null}
              <Badge>{dataset.status}</Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Card variant="stat" className="p-3">
              <p className="kicker">Rows</p>
              <p className="text-2xl font-semibold">4.2B</p>
            </Card>
            <Card variant="stat" className="p-3">
              <p className="kicker">Frequency</p>
              <p className="text-2xl font-semibold">Daily</p>
            </Card>
            <Card variant="stat" className="p-3">
              <p className="kicker">Coverage</p>
              <p className="text-2xl font-semibold">Global</p>
            </Card>
            <Card variant="stat" className="p-3">
              <p className="kicker">Format</p>
              <p className="text-2xl font-semibold">Parquet/CSV</p>
            </Card>
          </div>

          <Card className="p-5 md:p-6">
            <div className="mb-4 flex gap-4 border-b border-border pb-3 text-sm">
              <span className="border-b-2 border-brand pb-2 font-semibold text-brand">Overview</span>
              <span className="pb-2 text-textMuted">Schema</span>
              <span className="pb-2 text-textMuted">Sample Data</span>
            </div>
            <p className="text-textSecondary">{dataset.description}</p>

            <h3 className="mt-5 text-xl font-semibold">Schema preview</h3>
            <div className="data-table-shell mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Required</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.schemaFields.map((field) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2 font-medium">{field.name}</td>
                      <td className="px-3 py-2 text-brand">{field.type}</td>
                      <td className="px-3 py-2">{field.required ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{field.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {entitlement ? (
              <div className="mt-6 rounded-md border border-[#ccead6] bg-success-soft p-4 text-sm">
                <p className="font-semibold text-success">Access active for your org</p>
                {entitlement.downloadUrl ? <p>Download: {entitlement.downloadUrl}</p> : null}
                {entitlement.apiKey ? <p>API key: {entitlement.apiKey}</p> : null}
                {invoice ? <p>Invoice: {invoice.pdfUrl}</p> : null}
              </div>
            ) : null}
          </Card>

          {dataset.license ? (
            <Card className="p-4 text-sm">
              <p className="font-semibold">License template: {dataset.license.template.name}</p>
              <p className="mt-1 text-textMuted">Version {dataset.license.version}</p>
              <p className="mt-2 text-textSecondary line-clamp-3">
                {dataset.license.customClauses || dataset.license.template.body}
              </p>
            </Card>
          ) : null}

          {dataset.status === "DRAFT" ? (
            <WarningBanner title="Draft listing" description="Dataset must be published before buyers can purchase." />
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          {activeOrgId ? (
            <PurchaseTicket
              orgId={activeOrgId}
              datasetId={dataset.id}
              plans={dataset.pricePlans.map((plan) => ({ ...plan, price: Number(plan.price) }))}
              stripeEnabled={env.enableStripe}
            />
          ) : null}
          {isSeller ? (
            <Card className="p-4">
              <h3 className="font-semibold">Seller actions</h3>
              <div className="mt-3">
                <DatasetPublishActions
                  datasetId={dataset.id}
                  orgId={dataset.orgId}
                  status={dataset.status}
                />
              </div>
            </Card>
          ) : null}
          {isSeller && env.dynamicPricingEnabled ? (
            <DatasetPricingPanel
              datasetId={dataset.id}
              orgId={dataset.orgId}
              currentOneTimePrice={
                dataset.pricePlans.find((p) => p.type === "ONE_TIME")
                  ? Number(dataset.pricePlans.find((p) => p.type === "ONE_TIME")!.price)
                  : null
              }
              snapshot={
                pricingSnapshot
                  ? {
                    id: pricingSnapshot.id,
                    recommendedPrice: pricingSnapshot.recommendedPrice.toNumber(),
                    appliedPrice: pricingSnapshot.appliedPrice?.toNumber() ?? null,
                    explanationJson: pricingSnapshot.explanationJson,
                    computedAt: pricingSnapshot.computedAt.toISOString()
                  }
                  : null
              }
              config={pricingConfig}
            />
          ) : null}
          <Card className="p-4">
            <h3 className="font-semibold">Moderation</h3>
            <div className="mt-3">
              <ReportFlagButton entityType="DATASET" entityId={dataset.id} />
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
};

export default DatasetDetailPage;
