import { TopNav } from "@/components/layout/top-nav";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

const BillingPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  const { membership } = await requireOrgInSession(orgId);
  const org = await prisma.org.findUnique({ where: { id: orgId } });

  if (!org) {
    return <div>Organization not found</div>;
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [{ purchase: { is: { buyerOrgId: orgId } } }, { contract: { is: { buyerOrgId: orgId } } }]
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <div>
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="billing" title="Billing">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-xl font-semibold">Payment Methods</h2>
            <p className="mt-2 text-sm text-textMuted">Manage payment instruments and billing controls for this organization.</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="rounded-md border border-border bg-mutedSurface p-3">Primary card on file •••• 4242</div>
              <div className="rounded-md border border-border bg-mutedSurface p-3">Purchase order billing support available</div>
              <div className="rounded-md border border-border bg-mutedSurface p-3">Tax ID collection available</div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-semibold">Billing Contact</h2>
            <p className="mt-2 text-sm text-textMuted">Role required: Admin or Owner for edits.</p>
            <input defaultValue={org.billingEmail} readOnly={membership.role === "VIEWER"} className="mt-3 w-full" />
          </Card>
        </div>

        <Card className="mt-5 p-4">
          <h2 className="mb-3 text-xl font-semibold">Invoices</h2>
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-2 py-2">Number</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Currency</th>
                  <th className="px-2 py-2">PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-2 py-2">{invoice.number}</td>
                    <td className="px-2 py-2">
                      <Badge variant={invoice.status === "PAID" ? "success" : "default"}>{invoice.status}</Badge>
                    </td>
                    <td className="px-2 py-2">${Number(invoice.amount).toLocaleString()}</td>
                    <td className="px-2 py-2">{invoice.currency}</td>
                    <td className="px-2 py-2">{invoice.pdfUrl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </OrgConsoleLayout>
    </div>
  );
};

export default BillingPage;
