import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

const OrgBidsPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  await requireOrgInSession(orgId);

  const bids = await prisma.bid.findMany({
    where: { supplierOrgId: orgId },
    include: {
      request: true,
      contract: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="bids" title="Submitted Bids">
        {bids.length === 0 ? (
          <EmptyState title="No bids yet" description="Bid submissions appear here." ctaHref="/requests" ctaLabel="Browse requests" />
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-3 py-2">Request</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Timeline End</th>
                  <th className="px-3 py-2">Contract</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => (
                  <tr key={bid.id}>
                    <td className="px-3 py-2 font-medium">
                      <Link className="text-brand" href={`/requests/${bid.requestId}`}>
                        {bid.request.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={bid.status === "AWARDED" ? "success" : "default"}>{bid.status}</Badge>
                    </td>
                    <td className="px-3 py-2">${Number(bid.totalPrice).toLocaleString()}</td>
                    <td className="px-3 py-2">{new Date(bid.timelineEnd).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      {bid.contract ? (
                        <Link className="text-brand" href={`/contracts/${bid.contract.id}`}>
                          Open
                        </Link>
                      ) : (
                        "-"
                      )}
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

export default OrgBidsPage;
