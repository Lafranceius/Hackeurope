import { notFound } from "next/navigation";

import { ContractWorkspaceActions } from "@/components/forms/contract-workspace-actions";
import { MessageThreadPanel } from "@/components/forms/message-thread-panel";
import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/server/page-auth";

const ContractWorkspacePage = async ({ params }: { params: Promise<{ contractId: string }> }) => {
  const { contractId } = await params;
  const user = await requirePageSession();

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      request: true,
      buyerOrg: true,
      supplierOrg: true,
      milestones: {
        include: { deliveries: true }
      },
      thread: {
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

  if (!contract) {
    notFound();
  }

  const buyerMember = user.memberships.find((membership) => membership.orgId === contract.buyerOrgId);
  const supplierMember = user.memberships.find((membership) => membership.orgId === contract.supplierOrgId);
  const participant = buyerMember || supplierMember;

  if (!participant) {
    notFound();
  }

  const role = buyerMember ? "BUYER" : "SUPPLIER";
  const thread = contract.thread[0];

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <section className="panel p-5 md:p-6">
          <h1 className="page-title">Contract Workspace</h1>
          <p className="mt-1 text-sm text-textMuted">{contract.request.title}</p>
          <div className="mt-3 flex gap-2">
            <Badge>{contract.status}</Badge>
            <Badge variant="info">Buyer: {contract.buyerOrg.name}</Badge>
            <Badge variant="default">Supplier: {contract.supplierOrg.name}</Badge>
          </div>

          <h2 className="mt-6 text-xl font-semibold">Milestones</h2>
          <div className="mt-3 space-y-3">
            {contract.milestones.map((milestone) => (
              <div key={milestone.id} className="rounded-md border border-border bg-mutedSurface p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{milestone.name}</p>
                  <Badge
                    variant={
                      milestone.status === "ACCEPTED"
                        ? "success"
                        : milestone.status === "CHANGES_REQUESTED"
                          ? "warning"
                          : "default"
                    }
                  >
                    {milestone.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-textMuted">
                  Amount: ${Number(milestone.amount).toLocaleString()} • Due: {new Date(milestone.dueDate).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm text-textSecondary">Acceptance: {milestone.acceptanceCriteria}</p>
                {milestone.deliveries.length > 0 ? (
                  <div className="mt-2 rounded-md border border-border bg-white px-2.5 py-2 text-xs text-textMuted">
                    Latest delivery:{" "}
                    <a
                      href={milestone.deliveries[milestone.deliveries.length - 1].fileUrl}
                      className="font-medium text-brand hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {milestone.deliveries[milestone.deliveries.length - 1].fileUrl}
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <MessageThreadPanel
              initialThreadId={thread?.id}
              mode="CONTRACT"
              contractId={contract.id}
              initialMessages={(thread?.messages ?? []).map((message) => ({
                id: message.id,
                body: message.body,
                senderName: message.sender.name,
                createdAt: message.createdAt.toISOString()
              }))}
            />
          </div>
        </section>
        <aside className="space-y-4">
          <div className="sticky top-20 panel p-4">
            <h3 className="mb-3 text-xl font-semibold">Milestone Actions</h3>
            <ContractWorkspaceActions
              contractId={contract.id}
              orgId={participant.orgId}
              role={role}
              milestones={contract.milestones.map((milestone) => ({
                id: milestone.id,
                name: milestone.name,
                status: milestone.status
              }))}
            />
          </div>
        </aside>
      </main>
    </div>
  );
};

export default ContractWorkspacePage;
