import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Database,
  Plus,
  SlidersHorizontal,
  Workflow
} from "lucide-react";

import { TopNav } from "@/components/layout/top-nav";
import { MarketCard } from "@/components/marketplace/market-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackedIconLink } from "@/components/ui/tracked-icon-link";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

const asArray = (value: string | string[] | undefined) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const asNumber = (value: string | string[] | undefined) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildMarketplaceHref = (input: {
  q?: string;
  sort?: string;
  categories?: string[];
  providerId?: string;
  minPrice?: number;
  maxPrice?: number;
}) => {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.sort) params.set("sort", input.sort);
  if (input.providerId) params.set("providerId", input.providerId);
  if (input.minPrice !== undefined) params.set("minPrice", String(input.minPrice));
  if (input.maxPrice !== undefined) params.set("maxPrice", String(input.maxPrice));

  for (const category of input.categories ?? []) params.append("category", category);

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
      orgId: providerId,
      pricePlans:
        minPrice !== undefined || maxPrice !== undefined
          ? {
              some: {
                price: {
                  ...(minPrice !== undefined ? { gte: minPrice } : {}),
                  ...(maxPrice !== undefined ? { lte: maxPrice } : {})
                }
              }
            }
          : undefined
    },
    include: { org: true, pricePlans: true },
    orderBy: { createdAt: "desc" }
  });

  const datasets = [...rawDatasets].sort((a, b) => {
    const priceA = Number(a.pricePlans[0]?.price ?? 0);
    const priceB = Number(b.pricePlans[0]?.price ?? 0);

    if (sort === "price_asc") return priceA - priceB;
    if (sort === "price_desc") return priceB - priceA;
    if (sort === "latest") return +new Date(b.lastUpdatedAt) - +new Date(a.lastUpdatedAt);
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  const prices = datasets.map((dataset) => Number(dataset.pricePlans[0]?.price ?? 0)).filter((price) => price > 0);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPriceUsd =
    sortedPrices.length === 0
      ? 0
      : sortedPrices.length % 2 === 0
        ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
        : sortedPrices[Math.floor(sortedPrices.length / 2)];
  const providerCount = new Set(datasets.map((dataset) => dataset.orgId)).size;
  const verifiedProviderCount = new Set(
    datasets.filter((dataset) => dataset.org.verificationStatus === "VERIFIED").map((dataset) => dataset.orgId)
  ).size;
  const apiEnabledCount = datasets.filter((dataset) => dataset.deliveryMethods.includes("API")).length;
  const activeFilterCount =
    (q ? 1 : 0)
    + (categories.length ? 1 : 0)
    + (providerId ? 1 : 0)
    + (minPrice !== undefined ? 1 : 0)
    + (maxPrice !== undefined ? 1 : 0);

  return (
    <div className="app-shell">
      <TopNav />
      <div className="mx-auto min-h-[calc(100vh-64px)] max-w-[1380px] px-4 py-5 md:px-6">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Published listings</p>
              <Database className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">{datasets.length}</p>
            <p className="mt-2 text-xs text-textMuted">{activeFilterCount} active filters</p>
          </Card>
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Providers</p>
              <Building2 className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">{providerCount}</p>
            <p className="mt-2 text-xs text-textMuted">{verifiedProviderCount} verified</p>
          </Card>
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">Median price</p>
              <CircleDollarSign className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">${Math.round(medianPriceUsd).toLocaleString()}</p>
            <p className="mt-2 text-xs text-textMuted">Annual listing price</p>
          </Card>
          <Card variant="stat" className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-textMuted">API delivery</p>
              <Workflow className="h-4 w-4 text-textMuted" />
            </div>
            <p className="mt-1 text-3xl font-semibold">{apiEnabledCount}</p>
            <p className="mt-2 text-xs text-textMuted">Listings with API access</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr_300px]">
          <aside className="space-y-4">
            <div className="panel p-4">
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

              <form className="mt-4 space-y-4 text-sm text-textSecondary" method="GET" action="/marketplace">
                <div>
                  <p className="mb-2 font-semibold text-textPrimary">Category</p>
                  <div className="space-y-2">
                    <Link
                      href={buildMarketplaceHref({
                        q,
                        sort,
                        categories: [],
                        providerId: providerId ?? undefined,
                        minPrice,
                        maxPrice
                      })}
                      className={`block rounded-md px-2 py-1.5 ${categories.length === 0 ? "bg-brandSoft font-semibold text-brand" : "hover:bg-mutedSurface"}`}
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
                          providerId: providerId ?? undefined,
                          minPrice,
                          maxPrice
                        })}
                        className={`block rounded-md px-2 py-1.5 ${categories.includes(value) ? "bg-brandSoft font-semibold text-brand" : "hover:bg-mutedSurface"}`}
                      >
                        {value}
                      </Link>
                    ))}
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
                <input type="hidden" name="providerId" value={providerId ?? ""} />
                {categories.map((category) => (
                  <input key={`sidebar-cat-${category}`} type="hidden" name="category" value={category} />
                ))}

                <Button size="sm" type="submit">
                  Apply Filters
                </Button>
              </form>
            </div>

            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-textMuted">Market Notes</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="rounded-md border border-border bg-mutedSurface p-3">
                  <p className="font-medium text-textPrimary">Sort Mode</p>
                  <p className="mt-1 text-textMuted">{sort.replace("_", " ")}</p>
                </div>
                <div className="rounded-md border border-border bg-mutedSurface p-3">
                  <p className="font-medium text-textPrimary">Search Query</p>
                  <p className="mt-1 text-textMuted">{q?.trim() ? q : "No keyword filter applied"}</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <div className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="kicker">Marketplace Console</p>
                  <h1 className="page-title mt-1">Dataset Listings</h1>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="info">{datasets.length} results</Badge>
                  {activeFilterCount > 0 ? <Badge>{activeFilterCount} filters active</Badge> : <Badge>No filters</Badge>}
                </div>
              </div>
              <form className="mt-4 grid gap-2 md:grid-cols-[1fr_180px_auto]" method="GET" action="/marketplace">
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

                {categories.map((category) => (
                  <input key={`cat-${category}`} type="hidden" name="category" value={category} />
                ))}
                {providerId ? <input type="hidden" name="providerId" value={providerId} /> : null}
                {minPrice !== undefined ? <input type="hidden" name="minPrice" value={minPrice} /> : null}
                {maxPrice !== undefined ? <input type="hidden" name="maxPrice" value={maxPrice} /> : null}
              </form>
            </div>

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

          <aside className="space-y-4">
            <div className="panel p-4">
              <h2 className="text-xl font-semibold tracking-[-0.01em]">Watchlist</h2>
              <p className="mt-1 text-sm text-textMuted">Quick view of currently surfaced listings</p>
              <div className="mt-4 space-y-3">
                {datasets.slice(0, 4).map((dataset) => (
                  <div key={dataset.id} className="rounded-md border border-border bg-mutedSurface p-3">
                    <p className="line-clamp-1 font-medium">{dataset.title}</p>
                    <p className="mt-1 text-sm text-textMuted">${Number(dataset.pricePlans[0]?.price ?? 0).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-textMuted">{dataset.org.name}</p>
                    {dataset.org.verificationStatus === "VERIFIED" ? (
                      <TrackedIconLink
                        href={`/marketplace?providerId=${dataset.org.id}`}
                        action="marketplace.verified.provider.icon"
                        metadata={{ providerId: dataset.org.id }}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-success"
                        ariaLabel={`View verified provider ${dataset.org.name}`}
                      >
                        <BadgeCheck className="h-3 w-3" /> Verified provider
                      </TrackedIconLink>
                    ) : null}
                  </div>
                ))}
                {datasets.length === 0 ? <p className="text-sm text-textMuted">Watchlist is empty.</p> : null}
              </div>
            </div>

            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-textMuted">Coverage</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border bg-mutedSurface px-3 py-2">
                  <span className="text-textSecondary">Verified providers</span>
                  <span className="font-medium text-textPrimary">{verifiedProviderCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-mutedSurface px-3 py-2">
                  <span className="text-textSecondary">API listings</span>
                  <span className="font-medium text-textPrimary">{apiEnabledCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-mutedSurface px-3 py-2">
                  <span className="text-textSecondary">Median price</span>
                  <span className="font-medium text-textPrimary">${Math.round(medianPriceUsd).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
