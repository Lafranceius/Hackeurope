import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

const ComplianceDocsPage = async () => {
  const [sensitiveRequests, verifiedSuppliers, templates] = await Promise.all([
    prisma.request.count({ where: { OR: [{ flagsMinors: true }, { flagsPii: true }] } }),
    prisma.org.count({ where: { verificationStatus: "VERIFIED", type: { in: ["SELLER", "BOTH"] } } }),
    prisma.licenseTemplate.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  return (
    <div>
      <TopNav />
      <main className="container-shell py-8">
        <h1 className="page-title">Compliance Guide</h1>
        <p className="mt-2 text-sm text-textMuted">
          Policy controls for minors/PII requests, supplier verification, and license governance.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="kicker">Sensitive Requests</p>
            <p className="mt-1 text-3xl font-bold">{sensitiveRequests}</p>
          </Card>
          <Card className="p-4">
            <p className="kicker">Verified Suppliers</p>
            <p className="mt-1 text-3xl font-bold">{verifiedSuppliers}</p>
          </Card>
          <Card className="p-4">
            <p className="kicker">Active License Templates</p>
            <p className="mt-1 text-3xl font-bold">{templates.length}</p>
          </Card>
        </div>

        <Card className="mt-5 p-4">
          <h2 className="text-xl font-semibold">License Templates</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {templates.map((template) => (
              <li key={template.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{template.name} (v{template.version})</p>
                <p className="mt-1 text-textMuted">{template.body}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Link href="/requests" className="mt-4 inline-block text-sm font-semibold text-brand">
          Back to Requests
        </Link>
      </main>
    </div>
  );
};

export default ComplianceDocsPage;
