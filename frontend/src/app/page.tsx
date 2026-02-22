import Link from "next/link";

import { TopNav } from "@/components/layout/top-nav";
import { MarketCard } from "@/components/marketplace/market-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

const LandingPage = async () => {
  const datasets = await prisma.dataset.findMany({
    where: { status: "PUBLISHED" },
    include: { org: true, pricePlans: true },
    take: 3,
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="app-shell">
      <TopNav />
      <section className="subtle-divider bg-gradient-to-b from-[#f8fbff] to-white py-20 md:py-24">
        <div className="container-shell text-center">
          <span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-brand shadow-sm">
            Enterprise-grade data trading + contracting
          </span>
          <h1 className="hero-title mx-auto mt-6 max-w-4xl text-textPrimary">
            Exchange high-fidelity data like financial markets
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-textSecondary">
            Buy and sell premium datasets with automated licensing. Post RFPs, compare supplier bids, and execute
            milestone-based contracts in one console.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/marketplace">
              <Button size="lg">Browse Marketplace</Button>
            </Link>
            <Link href="/requests">
              <Button size="lg" variant="secondary">
                Browse Requests
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="subtle-divider">
        <div className="container-shell flex flex-wrap items-center justify-center gap-x-10 gap-y-5 py-7 text-sm text-textMuted">
          <span className="kicker !tracking-[0.06em]">Trusted by data teams at</span>
          {["ACME Corp", "Globex", "Soylent", "Initech", "Umbrella"].map((name) => (
            <span key={name} className="font-medium text-textSecondary">
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="section-shell subtle-divider">
        <div className="container-shell">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="kicker">Enterprise-grade trust</p>
            <h2 className="mt-3 text-[34px] leading-[42px] font-semibold tracking-[-0.02em]">
              Built for security and compliance teams
            </h2>
            <p className="mt-3 text-textMuted">
              Standardized licensing, complete audit trails, and clear policy controls for sensitive data workflows.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="panel p-5">
              <p className="text-base font-semibold">Smart Licensing</p>
              <p className="mt-2 text-sm leading-6 text-textMuted">
                Contract templates and acceptance records are generated automatically at purchase time.
              </p>
            </div>
            <div className="panel p-5">
              <p className="text-base font-semibold">Immutable Audit</p>
              <p className="mt-2 text-sm leading-6 text-textMuted">
                Key actions are captured in an immutable event trail for moderation, governance, and reporting.
              </p>
            </div>
            <div className="panel p-5">
              <p className="text-base font-semibold">API-first Delivery</p>
              <p className="mt-2 text-sm leading-6 text-textMuted">
                Datasets support secure file delivery and API entitlements with access controls per organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container-shell">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-title">Trending Datasets</h2>
            <Link className="text-sm font-medium text-brand" href="/marketplace">
              View all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {datasets.map((dataset) => (
              <MarketCard
                key={dataset.id}
                id={dataset.id}
                title={dataset.title}
                provider={dataset.org.name}
                category={dataset.categories[0] ?? "General"}
                price={Number(dataset.pricePlans[0]?.price ?? 0)}
                metric="+12%"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="subtle-divider bg-[#0a1b44] py-16 text-center text-white">
        <div className="container-shell">
          <h3 className="text-[38px] leading-[44px] font-semibold tracking-[-0.02em]">Ready to monetize your data?</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#d5e2ff]">
            Publish your listing, win recurring buyers, and run compliant data contracts end-to-end.
          </p>
          <Link href="/auth/sign-up" className="mt-6 inline-block">
            <Button size="lg">Become a Provider</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
