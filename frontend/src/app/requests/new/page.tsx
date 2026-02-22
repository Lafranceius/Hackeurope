import { redirect } from "next/navigation";

import { RequestCreateForm } from "@/components/forms/request-create-form";
import { TopNav } from "@/components/layout/top-nav";
import { requirePageSession } from "@/server/page-auth";

const NewRequestPage = async () => {
  const user = await requirePageSession();

  const buyer = user.memberships.find((membership) => membership.orgType === "BUYER" || membership.orgType === "BOTH");
  if (!buyer) {
    redirect("/requests");
  }

  return (
    <div className="app-shell">
      <TopNav />
      <main className="container-shell py-10">
        <h1 className="page-title">Create Collection Request</h1>
        <p className="mt-2 text-textMuted">Post a detailed RFP and accept supplier bids.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {["Scope", "Compliance", "Review"].map((step, index) => (
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
          <RequestCreateForm orgId={buyer.orgId} />
        </div>
      </main>
    </div>
  );
};

export default NewRequestPage;
