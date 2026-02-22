import { ArrowUpRight } from "lucide-react";

import { TopNav } from "@/components/layout/top-nav";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { AnalyticsChart } from "@/components/marketplace/analytics-chart";
import { Card } from "@/components/ui/card";
import { TrackedIconLink } from "@/components/ui/tracked-icon-link";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

type SearchParams = {
  focus?: "published" | "purchases";
};

const OrgAnalyticsPage = async ({
  params,
  searchParams
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<SearchParams>;
}) => {
  const { orgId } = await params;
  const { focus } = await searchParams;
  await requireOrgInSession(orgId);

  const [published, purchases, requests, bids, recentPublished, recentPurchases] = await Promise.all([
    prisma.dataset.count({ where: { orgId, status: "PUBLISHED" } }),
    prisma.purchase.count({ where: { buyerOrgId: orgId, status: "PAID" } }),
    prisma.request.count({ where: { buyerOrgId: orgId } }),
    prisma.bid.count({ where: { supplierOrgId: orgId } }),
    prisma.dataset.findMany({
      where: { orgId, status: "PUBLISHED" },
      orderBy: { lastUpdatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, lastUpdatedAt: true }
    }),
    prisma.purchase.findMany({
      where: { buyerOrgId: orgId, status: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { dataset: { select: { title: true } }, plan: { select: { tierName: true } } }
    })
  ]);

  return (
    <div className="app-shell">
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="analytics" title="Seller Performance">
        <div className="grid gap-4 md:grid-cols-4">
          <Card variant="stat" className="p-4">
            <p className="text-sm text-textMuted">Published datasets</p>
            <p className="mt-1 text-3xl font-semibold">{published}</p>
            <TrackedIconLink
              href={`/org/${orgId}/analytics?focus=published`}
              action="analytics.published.trend.icon"
              metadata={{ orgId }}
              className={`mt-2 inline-flex items-center gap-1 text-xs ${
                focus === "published" ? "text-brand" : "text-success"
              }`}
              ariaLabel="View published dataset trend details"
            >
              <ArrowUpRight className="h-3 w-3" /> +12.5%
            </TrackedIconLink>
          </Card>
          <Card variant="stat" className="p-4">
            <p className="text-sm text-textMuted">Purchases</p>
            <p className="mt-1 text-3xl font-semibold">{purchases}</p>
            <TrackedIconLink
              href={`/org/${orgId}/analytics?focus=purchases`}
              action="analytics.purchases.trend.icon"
              metadata={{ orgId }}
              className={`mt-2 inline-flex items-center gap-1 text-xs ${
                focus === "purchases" ? "text-brand" : "text-success"
              }`}
              ariaLabel="View purchase trend details"
            >
              <ArrowUpRight className="h-3 w-3" /> +0.8%
            </TrackedIconLink>
          </Card>
          <Card variant="stat" className="p-4">
            <p className="text-sm text-textMuted">Buyer requests</p>
            <p className="mt-1 text-3xl font-semibold">{requests}</p>
          </Card>
          <Card variant="stat" className="p-4">
            <p className="text-sm text-textMuted">Supplier bids</p>
            <p className="mt-1 text-3xl font-semibold">{bids}</p>
          </Card>
        </div>

        {focus ? (
          <Card className="mt-5 p-4">
            <h2 className="text-xl font-semibold">
              {focus === "published" ? "Published Dataset Activity" : "Recent Purchase Activity"}
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              {focus === "published"
                ? recentPublished.map((record) => (
                    <div key={record.id} className="rounded-md border border-border bg-mutedSurface p-3">
                      <p className="font-medium">{record.title}</p>
                      <p className="text-textMuted">Updated {new Date(record.lastUpdatedAt).toLocaleString()}</p>
                    </div>
                  ))
                : recentPurchases.map((purchase) => (
                    <div key={purchase.id} className="rounded-md border border-border bg-mutedSurface p-3">
                      <p className="font-medium">{purchase.dataset.title}</p>
                      <p className="text-textMuted">
                        {purchase.plan.tierName} • {new Date(purchase.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
            </div>
          </Card>
        ) : null}

        <Card className="mt-5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Revenue Trend</h2>
            <div className="flex gap-2 text-sm">
              <span className="rounded-md bg-altSurface px-3 py-1">Daily</span>
              <span className="rounded-md bg-brand px-3 py-1 text-white">Monthly</span>
              <span className="rounded-md bg-altSurface px-3 py-1">Yearly</span>
            </div>
          </div>
          <AnalyticsChart />
        </Card>
      </OrgConsoleLayout>
    </div>
  );
};

export default OrgAnalyticsPage;
