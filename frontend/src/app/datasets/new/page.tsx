import { redirect } from "next/navigation";

import { DatasetCreateForm } from "@/components/forms/dataset-create-form";
import { TopNav } from "@/components/layout/top-nav";
import { prisma } from "@/lib/prisma";
import { requirePageSession } from "@/server/page-auth";

const NewDatasetPage = async () => {
  const user = await requirePageSession();
  const sellerMembership = user.memberships.find(
    (membership) => membership.orgType === "SELLER" || membership.orgType === "BOTH"
  );

  if (!sellerMembership) {
    redirect("/marketplace");
  }

  const templates = await prisma.licenseTemplate.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell py-10">
        <h1 className="page-title">Publish New Dataset</h1>
        <p className="mt-2 text-textMuted">Create draft listing, attach schema preview, and configure pricing.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {["Basic Info", "Connect Source", "Pricing", "Compliance"].map((step, index) => (
            <div
              key={step}
              className={`rounded-lg border p-4 ${index === 0 ? "border-brand bg-brandSoft" : "border-border bg-surface"}`}
            >
              <p className="kicker">Step {index + 1}</p>
              <p className="mt-1 font-semibold">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 panel p-5 md:p-6">
          <DatasetCreateForm orgId={sellerMembership.orgId} templates={templates} />
        </div>
      </main>
    </div>
  );
};

export default NewDatasetPage;
