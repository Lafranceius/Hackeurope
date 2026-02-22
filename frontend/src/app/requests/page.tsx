import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";

const RequestsBrowsePage = async ({
  searchParams
}: {
  searchParams: Promise<{ q?: string; sort?: "deadline" | "budget_high" | "budget_low" }>;
}) => {
  const { q, sort } = await searchParams;
  const requests = await prisma.request.findMany({
    where: {
      status: "OPEN",
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { objective: { contains: q, mode: "insensitive" } },
            { geography: { contains: q, mode: "insensitive" } }
          ]
        : undefined
    },
    include: { buyerOrg: true, bids: true },
    orderBy:
      sort === "budget_high"
        ? { budgetMax: "desc" }
        : sort === "budget_low"
          ? { budgetMin: "asc" }
          : { deadlineAt: "asc" }
  });

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="page-title">Collection Requests</h1>
          <p className="text-sm text-textMuted">{requests.length} open opportunities</p>
        </div>
        <form className="mb-4 grid gap-2 panel p-3 md:grid-cols-[1fr_200px_auto]">
          <input name="q" defaultValue={q} placeholder="Search requests..." />
          <select name="sort" defaultValue={sort ?? "deadline"}>
            <option value="deadline">Deadline</option>
            <option value="budget_high">Highest budget</option>
            <option value="budget_low">Lowest budget</option>
          </select>
          <Button size="sm" type="submit">
            Apply
          </Button>
        </form>
        {requests.length === 0 ? (
          <EmptyState
            title="No active requests"
            description="When buyers publish RFPs they appear here."
            ctaHref="/requests/new"
            ctaLabel="Create Request"
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Link key={request.id} href={`/requests/${request.id}`} className="block panel p-4 hover:border-borderStrong">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[28px] leading-8 font-semibold tracking-[-0.01em]">{request.title}</h2>
                    <p className="mt-1 text-sm text-textMuted">{request.buyerOrg.name}</p>
                    <p className="mt-3 text-sm text-textSecondary line-clamp-2">{request.objective}</p>
                  </div>
                  <div className="flex gap-2">
                    {request.flagsMinors ? <Badge variant="warning">Minors</Badge> : null}
                    {request.flagsPii ? <Badge variant="danger">PII</Badge> : null}
                    <Badge>{request.status}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-textSecondary">
                  <span>Budget: ${Number(request.budgetMin).toLocaleString()} - ${Number(request.budgetMax).toLocaleString()}</span>
                  <span>Sample: {request.sampleSize.toLocaleString()}</span>
                  <span>Deadline: {new Date(request.deadlineAt).toLocaleDateString()}</span>
                  <span>Bids: {request.bids.length}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RequestsBrowsePage;
