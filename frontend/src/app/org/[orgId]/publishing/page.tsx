import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

const PublishingPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  await requireOrgInSession(orgId);

  const datasets = await prisma.dataset.findMany({
    where: { orgId },
    include: { pricePlans: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div>
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="publishing" title="Manage Listings">
        {datasets.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Create your first dataset listing to start selling."
            ctaHref="/datasets/new"
            ctaLabel="Publish Dataset"
          />
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td className="px-3 py-2 font-medium">{dataset.title}</td>
                    <td className="px-3 py-2">
                      <Badge variant={dataset.status === "PUBLISHED" ? "success" : "default"}>{dataset.status}</Badge>
                    </td>
                    <td className="px-3 py-2">${Number(dataset.pricePlans[0]?.price ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{new Date(dataset.updatedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <Link className="text-brand" href={`/datasets/${dataset.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OrgConsoleLayout>
    </div>
  );
};

export default PublishingPage;
