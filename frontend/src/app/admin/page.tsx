import { redirect } from "next/navigation";
import type { AuditEvent, Dataset, FlagReport, Org, Request as DataRequest, User } from "@prisma/client";

import { ModerateFlagAction, VerifyOrgAction } from "@/components/forms/admin-actions";
import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/server/page-auth";

const AdminPage = async () => {
  const user = await requirePageSession();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPlatformAdmin: true }
  });

  if (!dbUser?.isPlatformAdmin) {
    redirect("/marketplace");
  }

  const [orgs, flags, datasets, requests, users, iconEvents] = await Promise.all([
    prisma.org.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.flagReport.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.dataset.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.request.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.auditEvent.findMany({
      where: { action: "ui.icon.clicked" },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell py-8">
        <h1 className="page-title mb-6">Moderation Dashboard</h1>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-3 text-xl font-semibold">Organization Verification</h2>
            <div className="space-y-3">
              {orgs.map((org: Org) => (
                <div key={org.id} className="rounded-md border border-border bg-mutedSurface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-textMuted">{org.type} • {org.billingEmail}</p>
                    </div>
                    <Badge variant={org.verificationStatus === "VERIFIED" ? "success" : "default"}>{org.verificationStatus}</Badge>
                  </div>
                  <div className="mt-2">
                    <VerifyOrgAction orgId={org.id} verified={org.verificationStatus === "VERIFIED"} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-xl font-semibold">Flag Reports</h2>
            <div className="space-y-3">
              {flags.map((flag: FlagReport) => (
                <div key={flag.id} className="rounded-md border border-border bg-mutedSurface p-3">
                  <p className="font-medium">{flag.entityType} - {flag.entityId}</p>
                  <p className="text-sm text-textMuted">{flag.reason}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge>{flag.status}</Badge>
                    <ModerateFlagAction flagId={flag.id} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <Card className="p-4">
            <h2 className="mb-3 text-xl font-semibold">Datasets Queue</h2>
            <div className="space-y-2 text-sm">
              {datasets.map((dataset: Dataset) => (
                <div key={dataset.id} className="rounded-md border border-border bg-mutedSurface p-2">
                  {dataset.title} • {dataset.status}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-xl font-semibold">Requests Queue</h2>
            <div className="space-y-2 text-sm">
              {requests.map((request: DataRequest) => (
                <div key={request.id} className="rounded-md border border-border bg-mutedSurface p-2">
                  {request.title} • {request.status}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-xl font-semibold">Users Queue</h2>
            <div className="space-y-2 text-sm">
              {users.map((record: User) => (
                <div key={record.id} className="rounded-md border border-border bg-mutedSurface p-2">
                  {record.name} • {record.email} {record.isPlatformAdmin ? "(Admin)" : ""}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-xl font-semibold">Icon Interaction Audit</h2>
            <div className="space-y-2 text-sm">
              {iconEvents.map((event: AuditEvent) => (
                <div key={event.id} className="rounded-md border border-border bg-mutedSurface p-2">
                  <p className="font-medium">{event.entityId}</p>
                  <p className="text-xs text-textMuted">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
