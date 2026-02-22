import Link from "next/link";

import { BidManagementTable } from "@/components/forms/bid-management-table";
import { TopNav } from "@/components/layout/top-nav";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

const OrgRequestsPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  await requireOrgInSession(orgId);

  const requests = await prisma.request.findMany({
    where: { buyerOrgId: orgId },
    include: {
      bids: {
        include: {
          supplierOrg: true
        },
        orderBy: { totalPrice: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const selectedRequest = requests[0];

  return (
    <div>
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="requests" title="Buyer Request Management">
        {requests.length === 0 ? (
          <EmptyState
            title="No requests posted"
            description="Create a request to start receiving supplier bids."
            ctaHref="/requests/new"
            ctaLabel="Create request"
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {requests.map((request) => (
                <Link key={request.id} href={`/requests/${request.id}`} className="panel block p-4 hover:border-borderStrong">
                  <p className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">{request.title}</p>
                  <p className="mt-1 text-sm text-textMuted">{request.status} • {request.bids.length} bids</p>
                </Link>
              ))}
            </div>
            {selectedRequest ? (
              <BidManagementTable
                requestId={selectedRequest.id}
                buyerOrgId={orgId}
                bids={selectedRequest.bids.map((bid) => ({
                  id: bid.id,
                  supplier: bid.supplierOrg.name,
                  status: bid.status,
                  totalPrice: Number(bid.totalPrice),
                  timelineEnd: bid.timelineEnd.toISOString()
                }))}
              />
            ) : null}
          </div>
        )}
      </OrgConsoleLayout>
    </div>
  );
};

export default OrgRequestsPage;
