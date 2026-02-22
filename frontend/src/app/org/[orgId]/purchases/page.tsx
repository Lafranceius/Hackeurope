import { TopNav } from "@/components/layout/top-nav";
import { Badge } from "@/components/ui/badge";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

const PurchasesPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  await requireOrgInSession(orgId);

  const purchases = await prisma.purchase.findMany({
    where: { buyerOrgId: orgId },
    include: {
      dataset: true,
      entitlement: true,
      invoice: true,
      plan: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="purchases" title="Purchases">
        {purchases.length === 0 ? (
          <EmptyState title="No purchases yet" description="Dataset purchases will appear here with access details and invoices." />
        ) : (
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-3 py-2">Dataset</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Access</th>
                  <th className="px-3 py-2">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-3 py-2 font-medium">{purchase.dataset.title}</td>
                    <td className="px-3 py-2">{purchase.plan.tierName}</td>
                    <td className="px-3 py-2">
                      <Badge variant={purchase.status === "PAID" ? "success" : "default"}>{purchase.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {purchase.entitlement?.downloadUrl ? <div>Download: {purchase.entitlement.downloadUrl}</div> : null}
                      {purchase.entitlement?.apiKey ? <div>API key: {purchase.entitlement.apiKey}</div> : null}
                    </td>
                    <td className="px-3 py-2">{purchase.invoice?.pdfUrl ?? "-"}</td>
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

export default PurchasesPage;
