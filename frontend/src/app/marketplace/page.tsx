import Link from "next/link";
import { BadgeCheck, Plus, SlidersHorizontal } from "lucide-react";

import { TopNav } from "@/components/layout/top-nav";
import { MarketCard } from "@/components/marketplace/market-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackedIconLink } from "@/components/ui/tracked-icon-link";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

const asArray = (value: string | string[] | undefined) => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const asNumber = (value: string | string[] | undefined) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildMarketplaceHref = (input: {
  q?: string;
  sort?: string;
  categories?: string[];
  deliveryMethods?: string[];
  providerId?: string;
  minPrice?: number;
  maxPrice?: number;
}) => {
  const params = new URLSearchParams();

  if (input.q) {
    params.set("q", input.q);
  }
  if (input.sort) {
    params.set("sort", input.sort);
  }
  if (input.providerId) {
    params.set("providerId", input.providerId);
  }
  if (input.minPrice !== undefined) {
    params.set("minPrice", String(input.minPrice));
  }
  if (input.maxPrice !== undefined) {
    params.set("maxPrice", String(input.maxPrice));
  }
  for (const category of input.categories ?? []) {
    params.append("category", category);
  }
  for (const delivery of input.deliveryMethods ?? []) {
    params.append("delivery", delivery);
  }

  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
};

const MarketplacePage = async ({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const params = await searchParams;

  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const sort = (Array.isArray(params.sort) ? params.sort[0] : params.sort) ?? "trending";
  const categories = asArray(params.category);
  const deliveryMethods = asArray(params.delivery);
  const providerId = Array.isArray(params.providerId) ? params.providerId[0] : params.providerId;
  const minPrice = asNumber(params.minPrice);
  const maxPrice = asNumber(params.maxPrice);
  const categoryOptions = ["Finance", "Healthcare", "Retail", "Energy"];

  const rawDatasets = await prisma.dataset.findMany({
    where: {
      status: "PUBLISHED",
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { hasSome: [q] } }
          ]
        : undefined,
      categories: categories.length ? { hasSome: categories } : undefined,
      deliveryMethods: deliveryMethods.length ? { hasSome: deliveryMethods } : undefined,
      orgId: providerId,
      pricePlans: minPrice || maxPrice ? { some: { price: { gte: minPrice, lte: maxPrice } } } : undefined
    },
    include: { org: true, pricePlans: true },
    orderBy: { createdAt: "desc" }
  });

  const datasets = [...rawDatasets].sort((a, b) => {
    const priceA = Number(a.pricePlans[0]?.price ?? 0);
    const priceB = Number(b.pricePlans[0]?.price ?? 0);

    if (sort === "price_asc") {
      return priceA - priceB;
    }
    if (sort === "price_desc") {
      return priceB - priceA;
    }
    if (sort === "latest") {
      return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
    }
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  return (
    <div className="app-shell">
      <TopNav />
      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1380px] grid-cols-1 md:grid-cols-[280px_1fr_300px]">
        <aside className="subtle-divider border-r border-border bg-surface p-4 md:border-b-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-textMuted">Refine</h2>
            <TrackedIconLink
              href="/marketplace"
              action="marketplace.filters.reset.icon"
              className="inline-flex items-center gap-1 text-xs text-brand"
              ariaLabel="Reset filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Reset
            </TrackedIconLink>
          </div>

          <TrackedIconLink
            href="/datasets/new"
            action="marketplace.sidebar.publish_data"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-mutedSurface px-3 py-2 text-xs font-medium text-textPrimary hover:border-borderStrong hover:bg-white"
            ariaLabel="Publish data"
          >
            <Plus className="h-3.5 w-3.5" />
            Publish Data
          </TrackedIconLink>

          <form className="mt-4 space-y-4 text-sm text-textSecondary" method="GET">
            <div>
              <p className="mb-2 font-semibold text-textPrimary">Category</p>
              <div className="space-y-2">
                <Link
                  href={buildMarketplaceHref({
                    q,
                    sort,
                    categories: [],
                    deliveryMethods,
                    providerId: providerId ?? undefined,
                    minPrice,
                    maxPrice
                  })}
                  className={`block rounded-md px-2 py-1 ${categories.length === 0 ? "bg-brandSoft font-semibold text-brand" : "hover:bg-mutedSurface"}`}
                >
                  All Categories
                </Link>
                {categoryOptions.map((value) => (
                  <Link
                    key={value}
                    href={buildMarketplaceHref({
                      q,
                      sort,
                      categories: [value],
                      deliveryMethods,
                      providerId: providerId ?? undefined,
                      minPrice,
                      maxPrice
                    })}
                    className={`block rounded-md px-2 py-1 ${categories.includes(value) ? "bg-brandSoft font-semibold text-brand" : "hover:bg-mutedSurface"}`}
                  >
                    {value}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-textPrimary">Delivery</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 rounded-md border border-border bg-mutedSurface px-2.5 py-2">
                  <input
                    type="checkbox"
                    name="delivery"
                    value="DOWNLOAD"
                    defaultChecked={deliveryMethods.includes("DOWNLOAD")}
                  />
                  File download
                </label>
                <label className="flex items-center gap-2 rounded-md border border-border bg-mutedSurface px-2.5 py-2">
                  <input type="checkbox" name="delivery" value="API" defaultChecked={deliveryMethods.includes("API")} />
                  API
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold text-textPrimary">Price range (USD)</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" name="minPrice" defaultValue={minPrice} placeholder="Min" />
                <input type="number" name="maxPrice" defaultValue={maxPrice} placeholder="Max" />
              </div>
            </div>

            <input type="hidden" name="q" value={q ?? ""} />
            <input type="hidden" name="sort" value={sort} />

            <Button size="sm" type="submit">
              Apply Filters
            </Button>
          </form>
        </aside>

        <main className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="page-title">Dataset Listings</h1>
            <p className="text-sm text-textMuted">{datasets.length} results</p>
          </div>
          <form className="mb-4 grid gap-2 panel p-3 md:grid-cols-[1fr_180px_auto]">
            <input name="q" defaultValue={q} placeholder="Search datasets..." />
            <select name="sort" defaultValue={sort}>
              <option value="trending">Trending</option>
              <option value="latest">Latest</option>
              <option value="price_asc">Price (asc)</option>
              <option value="price_desc">Price (desc)</option>
            </select>
            <Button size="sm" type="submit">
              Apply
            </Button>
          </form>
          {datasets.length === 0 ? (
            <EmptyState
              title="No datasets found"
              description="No published listings are available right now."
              ctaHref="/datasets/new"
              ctaLabel="Publish first dataset"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {datasets.map((dataset) => (
                <MarketCard
                  key={dataset.id}
                  id={dataset.id}
                  title={dataset.title}
                  provider={dataset.org.name}
                  category={dataset.categories[0] ?? "General"}
                  price={Number(dataset.pricePlans[0]?.price ?? 0)}
                  metric="+8%"
                />
              ))}
            </div>
          )}
        </main>

        <aside className="border-l border-border bg-surface p-4">
          <h2 className="mb-4 text-xl font-semibold tracking-[-0.01em]">Watchlist</h2>
          <div className="space-y-3">
            {datasets.slice(0, 4).map((dataset) => (
              <div key={dataset.id} className="panel p-3">
                <p className="font-medium">{dataset.title.slice(0, 24)}...</p>
                <p className="mt-1 text-sm text-textMuted">${Number(dataset.pricePlans[0]?.price ?? 0).toLocaleString()}</p>
                {dataset.org.verificationStatus === "VERIFIED" ? (
                  <TrackedIconLink
                    href={`/marketplace?providerId=${dataset.org.id}`}
                    action="marketplace.verified.provider.icon"
                    metadata={{ providerId: dataset.org.id }}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-success"
                    ariaLabel={`View verified provider ${dataset.org.name}`}
                  >
                    <BadgeCheck className="h-3 w-3" /> Verified provider
                  </TrackedIconLink>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MarketplacePage;
