import Link from "next/link";

import { MessageThreadPanel } from "@/components/forms/message-thread-panel";
import { ReportFlagButton } from "@/components/forms/report-flag-button";
import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { WarningBanner } from "@/components/ui/warning-banner";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/server/page-auth";

const RequestDetailPage = async ({ params }: { params: Promise<{ requestId: string }> }) => {
  const { requestId } = await params;
  const user = await requirePageSession();

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      buyerOrg: true,
      schemaFields: true,
      bids: {
        include: { supplierOrg: true },
        orderBy: { createdAt: "desc" }
      },
      threads: {
        include: {
          messages: {
            include: { sender: true },
            orderBy: { createdAt: "asc" }
          }
        },
        take: 1
      }
    }
  });

  if (!request) {
    return <div>Request not found</div>;
  }

  const viewerOrgIds = user.memberships.map((membership) => membership.orgId);
  const canManageAllBids = viewerOrgIds.includes(request.buyerOrgId);
  const visibleBids = canManageAllBids
    ? request.bids
    : request.bids.filter((bid) => viewerOrgIds.includes(bid.supplierOrgId));

  const canBid = user.memberships.some(
    (membership) =>
      membership.orgId !== request.buyerOrgId && (membership.orgType === "SELLER" || membership.orgType === "BOTH")
  );

  const supplierMembership = user.memberships.find(
    (membership) =>
      membership.orgId !== request.buyerOrgId && (membership.orgType === "SELLER" || membership.orgType === "BOTH")
  );

  const thread = request.threads[0];

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <section className="panel p-5 md:p-6">
          <h1 className="page-title">{request.title}</h1>
          <p className="mt-2 text-sm text-textMuted">Posted by {request.buyerOrg.name}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{request.status}</Badge>
            {request.flagsMinors ? <Badge variant="warning">Minors</Badge> : null}
            {request.flagsPii ? <Badge variant="danger">PII</Badge> : null}
            {request.consentRequired ? <Badge variant="info">Consent required</Badge> : null}
          </div>

          {(request.flagsMinors || request.flagsPii) && request.extraComplianceDetails ? (
            <div className="mt-4">
              <WarningBanner
                title="Compliance sensitive request"
                description={`Additional requirements: ${request.extraComplianceDetails}`}
              />
            </div>
          ) : null}

          <p className="mt-5 text-textSecondary">{request.objective}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border bg-mutedSurface p-3 text-sm">
              <p className="kicker">Budget range</p>
              <p className="text-lg font-semibold">${Number(request.budgetMin).toLocaleString()} - ${Number(request.budgetMax).toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-border bg-mutedSurface p-3 text-sm">
              <p className="kicker">Bid deadline</p>
              <p className="text-lg font-semibold">{new Date(request.deadlineAt).toLocaleDateString()}</p>
            </div>
          </div>

          <h2 className="mt-6 text-xl font-semibold">Requested Variables</h2>
          <div className="data-table-shell mt-3">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {request.schemaFields.map((field) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">{field.name}</td>
                    <td className="px-3 py-2">{field.type}</td>
                    <td className="px-3 py-2">{field.required ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{field.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <MessageThreadPanel
              initialThreadId={thread?.id}
              mode="REQUEST"
              requestId={request.id}
              initialMessages={(thread?.messages ?? []).map((message) => ({
                id: message.id,
                body: message.body,
                senderName: message.sender.name,
                createdAt: message.createdAt.toISOString()
              }))}
            />
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <div className="panel p-4">
            <h3 className="text-xl font-semibold">Bids</h3>
            <p className="mt-1 text-sm text-textMuted">
              {canManageAllBids ? request.bids.length : visibleBids.length} visible bids
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {visibleBids.slice(0, 4).map((bid) => (
                <div key={bid.id} className="rounded-md border border-border bg-mutedSurface p-2">
                  <p className="font-medium">{bid.supplierOrg.name}</p>
                  <p className="text-textMuted">${Number(bid.totalPrice).toLocaleString()} • {bid.status}</p>
                </div>
              ))}
            </div>
          </div>
          {canBid && supplierMembership ? (
            <Link href={`/requests/${request.id}/bid?orgId=${supplierMembership.orgId}`} className="block">
              <div className="panel p-4 text-center font-semibold text-brand">Submit a bid</div>
            </Link>
          ) : null}
          <div className="panel p-4">
            <h3 className="font-semibold">Moderation</h3>
            <div className="mt-3">
              <ReportFlagButton entityType="REQUEST" entityId={request.id} label="Report request" />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default RequestDetailPage;
