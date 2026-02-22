import Link from "next/link";
import { BriefcaseBusiness, CalendarClock, CircleDollarSign, FileSearch, Plus } from "lucide-react";

import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type SortOption = "deadline" | "budget_high" | "budget_low";

const asString = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const isSortOption = (value: string | undefined): value is SortOption =>
  value === "deadline" || value === "budget_high" || value === "budget_low";

const RequestsBrowsePage = async ({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const params = await searchParams;
  const q = asString(params.q);
  const requestedSort = asString(params.sort);
  const sort: SortOption = isSortOption(requestedSort) ? requestedSort : "deadline";

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

  const totalBids = requests.reduce((sum, request) => sum + request.bids.length, 0);
  const avgBudgetMidpoint =
    requests.length > 0
      ? Math.round(
          requests.reduce((sum, request) => sum + (Number(request.budgetMin) + Number(request.budgetMax)) / 2, 0)
            / requests.length
        )
      : 0;
  const flaggedRequests = requests.filter((request) => request.flagsPii || request.flagsMinors).length;
  const nearestDeadline =
    requests.length > 0
      ? requests.reduce((earliest, request) =>
          new Date(request.deadlineAt) < new Date(earliest.deadlineAt) ? request : earliest
        )
      : null;
  const daysUntilNearest = nearestDeadline
    ? Math.ceil((+new Date(nearestDeadline.deadlineAt) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="app-shell">
      <TopNav />
      <main className="mx-auto max-w-[1380px] px-4 py-5 md:px-6">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Open requests</p>
              <FileSearch className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">{requests.length}</p>
            <p className="mt-2 text-xs text-textMuted">Buyer demand currently live</p>
          </Card>
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Incoming bids</p>
              <BriefcaseBusiness className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">{totalBids}</p>
            <p className="mt-2 text-xs text-textMuted">Across all open requests</p>
          </Card>
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Avg target budget</p>
              <CircleDollarSign className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">${avgBudgetMidpoint.toLocaleString()}</p>
            <p className="mt-2 text-xs text-textMuted">Midpoint of min/max ranges</p>
          </Card>
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Nearest deadline</p>
              <CalendarClock className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">{daysUntilNearest === null ? "-" : `${daysUntilNearest}d`}</p>
            <p className="mt-2 text-xs text-textMuted">
              {nearestDeadline ? new Date(nearestDeadline.deadlineAt).toLocaleDateString() : "No open requests"}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4">
            <div className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="kicker">Buyer Requests Console</p>
                  <h1 className="page-title mt-1">Collection Requests</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{requests.length} open</Badge>
                  {flaggedRequests > 0 ? <Badge variant="warning">{flaggedRequests} flagged</Badge> : <Badge>No flags</Badge>}
                  <Link href="/requests/new">
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      Create Request
                    </Button>
                  </Link>
                </div>
              </div>

              <form className="mt-4 grid gap-2 md:grid-cols-[1fr_200px_auto]">
                <input name="q" defaultValue={q} placeholder="Search requests by title, objective, geography..." />
                <select name="sort" defaultValue={sort}>
                  <option value="deadline">Deadline</option>
                  <option value="budget_high">Highest budget</option>
                  <option value="budget_low">Lowest budget</option>
                </select>
                <Button size="sm" type="submit">
                  Apply
                </Button>
              </form>
            </div>

            {requests.length === 0 ? (
              <EmptyState
                title="No active requests"
                description="When buyers publish RFPs they appear here."
                ctaHref="/requests/new"
                ctaLabel="Create Request"
              />
            ) : (
              <div className="data-table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Buyer</th>
                      <th>Budget</th>
                      <th>Deadline</th>
                      <th>Risk</th>
                      <th>Bids</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => {
                      const budgetMin = Number(request.budgetMin);
                      const budgetMax = Number(request.budgetMax);
                      const riskBadges = [
                        request.flagsMinors ? { label: "Minors", variant: "warning" as const } : null,
                        request.flagsPii ? { label: "PII", variant: "danger" as const } : null
                      ].filter(Boolean) as Array<{ label: string; variant: "warning" | "danger" }>;

                      return (
                        <tr key={request.id}>
                          <td>
                            <div className="max-w-[340px]">
                              <Link
                                href={`/requests/${request.id}`}
                                className="line-clamp-1 font-medium text-textPrimary hover:text-brand"
                              >
                                {request.title}
                              </Link>
                              <p className="mt-1 line-clamp-2 text-xs text-textMuted">{request.objective}</p>
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="font-medium">{request.buyerOrg.name}</p>
                              <p className="text-xs text-textMuted">{request.geography || "Global"}</p>
                            </div>
                          </td>
                          <td>${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}</td>
                          <td>
                            <div>
                              <p>{new Date(request.deadlineAt).toLocaleDateString()}</p>
                              <p className="text-xs text-textMuted">Sample {request.sampleSize.toLocaleString()}</p>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {riskBadges.length === 0 ? <Badge>None</Badge> : riskBadges.map((risk) => (
                                <Badge key={risk.label} variant={risk.variant}>{risk.label}</Badge>
                              ))}
                            </div>
                          </td>
                          <td>
                            <Badge variant={request.bids.length > 0 ? "info" : "default"}>{request.bids.length}</Badge>
                          </td>
                          <td>
                            <Link href={`/requests/${request.id}`} className="text-sm font-medium text-brand">
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="panel p-4">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">Request Playbook</h2>
              <p className="mt-1 text-sm text-textMuted">Console-style operating notes for suppliers reviewing opportunities.</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-md border border-border bg-mutedSurface p-3">
                  <p className="font-medium text-textPrimary">1. Qualify scope</p>
                  <p className="mt-1 text-textMuted">Check geography, sample size, and objective fit before preparing pricing.</p>
                </div>
                <div className="rounded-md border border-border bg-mutedSurface p-3">
                  <p className="font-medium text-textPrimary">2. Price against risk</p>
                  <p className="mt-1 text-textMuted">Flagged requests (PII / minors) usually require stronger controls and higher effort.</p>
                </div>
                <div className="rounded-md border border-border bg-mutedSurface p-3">
                  <p className="font-medium text-textPrimary">3. Prioritize deadlines</p>
                  <p className="mt-1 text-textMuted">Short-deadline requests tend to convert faster when a bid is submitted early.</p>
                </div>
              </div>
            </div>

            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-textMuted">Snapshot</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border bg-mutedSurface px-3 py-2">
                  <span className="text-textSecondary">Flagged requests</span>
                  <span className="font-medium text-textPrimary">{flaggedRequests}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-mutedSurface px-3 py-2">
                  <span className="text-textSecondary">Avg bids / request</span>
                  <span className="font-medium text-textPrimary">
                    {requests.length > 0 ? (totalBids / requests.length).toFixed(1) : "0.0"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-mutedSurface px-3 py-2">
                  <span className="text-textSecondary">Sorted by</span>
                  <span className="font-medium text-textPrimary">{sort.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default RequestsBrowsePage;
