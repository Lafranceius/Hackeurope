import { redirect } from "next/navigation";

import { BidSubmitForm } from "@/components/forms/bid-submit-form";
import { TopNav } from "@/components/layout/top-nav";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/server/page-auth";

const BidWizardPage = async ({
  params,
  searchParams
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ orgId?: string }>;
}) => {
  const { requestId } = await params;
  const { orgId } = await searchParams;
  const user = await requirePageSession();

  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) {
    redirect("/requests");
  }

  const supplierMembership = user.memberships.find(
    (membership) => membership.orgId === orgId || (membership.orgType === "SELLER" || membership.orgType === "BOTH")
  );

  if (!supplierMembership) {
    redirect(`/requests/${requestId}`);
  }

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell py-10">
        <h1 className="page-title">Submit Bid</h1>
        <p className="mt-2 text-textMuted">Pricing, execution plan, compliance, team, and review.</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="panel p-5 md:p-6">
            <BidSubmitForm
              requestId={requestId}
              orgId={supplierMembership.orgId}
              sensitive={request.flagsMinors || request.flagsPii}
            />
          </div>
          <aside className="space-y-3">
            <div className="sticky top-20 panel p-4">
              <h3 className="text-xl font-semibold">Bid Ticket</h3>
              <p className="mt-2 text-sm text-textMuted">Request: {request.title}</p>
              <p className="mt-2 text-sm text-textMuted">Budget: ${Number(request.budgetMin).toLocaleString()} - ${Number(request.budgetMax).toLocaleString()}</p>
              <p className="mt-2 text-sm text-textMuted">Deadline: {new Date(request.deadlineAt).toLocaleDateString()}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BidWizardPage;
