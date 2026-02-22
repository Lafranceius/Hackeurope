"use client";

/**
 * DatasetPricingPanel — seller-only pricing management widget.
 *
 * Displays:
 *  • Current listed price vs recommended price (with top drivers)
 *  • "Apply recommended price" button
 *  • Auto-pricing toggle + min/max/weekly-change-limit inputs (collapsible)
 *  • Price history sparkline + audit list
 *
 * Styling follows the existing design system:
 *  panel / field-label / Button / status-pill / kicker
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceHistorySparkline } from "@/components/pricing/price-history-sparkline";
import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (mirrors API response shapes)
// ---------------------------------------------------------------------------

type Snapshot = {
  id: string;
  recommendedPrice: number;
  appliedPrice: number | null;
  explanationJson: unknown;
  computedAt: string;
};

type PricingConfig = {
  id: string;
  autoPricingEnabled: boolean;
  minPrice: number;
  maxPrice: number;
  maxWeeklyChangePct: number;
  lastAppliedAt: string | null;
} | null;

type HistorySnapshot = {
  id: string;
  recommendedPrice: number;
  appliedPrice: number | null;
  computedAt: string;
};

type AuditEntry = {
  id: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  appliedAt: string;
  actorName: string;
};

export type DatasetPricingPanelProps = {
  datasetId: string;
  orgId: string;
  currentOneTimePrice: number | null;
  snapshot: Snapshot | null;
  config: PricingConfig;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const reasonLabel: Record<string, string> = {
  manual_apply: "Manual apply",
  auto_reprice_cron: "Auto (cron)"
};

const factors = (snapshot: Snapshot): string[] => {
  try {
    const raw = snapshot.explanationJson as { factors?: string[] };
    return Array.isArray(raw?.factors) ? raw.factors : [];
  } catch {
    return [];
  }
};

const fmt = (v: number) => formatCurrency(v);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DatasetPricingPanel = (props: DatasetPricingPanelProps) => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(props.snapshot);
  const [config, setConfig] = useState<PricingConfig>(props.config);
  const [currentPrice, setCurrentPrice] = useState<number | null>(props.currentOneTimePrice);

  // Apply state
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Config edit state
  const [showConstraints, setShowConstraints] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>(String(config?.minPrice ?? 0));
  const [maxPrice, setMaxPrice] = useState<string>(String(config?.maxPrice ?? 1000000));
  const [maxWeekly, setMaxWeekly] = useState<string>(String(config?.maxWeeklyChangePct ?? 10));

  // History state
  const [history, setHistory] = useState<{ snapshots: HistorySnapshot[]; audits: AuditEntry[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Refresh recommendation
  const [refreshing, setRefreshing] = useState(false);

  const handleApply = async () => {
    if (!snapshot) return;
    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    const res = await fetch(`/api/datasets/${props.datasetId}/pricing/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: props.orgId, snapshotId: snapshot.id })
    });
    const body = await res.json();
    setApplying(false);

    if (!res.ok) {
      setApplyError(body.error ?? "Apply failed");
      return;
    }

    setCurrentPrice(body.data.newPrice);
    setApplySuccess(`Price updated to ${fmt(body.data.newPrice)}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setApplyError(null);
    setApplySuccess(null);

    const res = await fetch(`/api/datasets/${props.datasetId}/pricing?orgId=${props.orgId}`);
    const body = await res.json();
    setRefreshing(false);

    if (res.ok && body.data?.snapshot) {
      setSnapshot(body.data.snapshot);
      setConfig(body.data.config);
      setCurrentPrice(body.data.currentOneTimePrice);
    }
  };

  const handleToggleAuto = async (enabled: boolean) => {
    setConfigSaving(true);
    setConfigError(null);

    const res = await fetch(`/api/datasets/${props.datasetId}/pricing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: props.orgId, autoPricingEnabled: enabled })
    });
    const body = await res.json();
    setConfigSaving(false);

    if (!res.ok) {
      setConfigError(body.error ?? "Failed to save");
      return;
    }
    setConfig(body.data);
  };

  const handleSaveConstraints = async () => {
    setConfigSaving(true);
    setConfigError(null);

    const res = await fetch(`/api/datasets/${props.datasetId}/pricing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: props.orgId,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        maxWeeklyChangePct: Number(maxWeekly)
      })
    });
    const body = await res.json();
    setConfigSaving(false);

    if (!res.ok) {
      setConfigError(body.error ?? "Failed to save");
      return;
    }
    setConfig(body.data);
    setShowConstraints(false);
  };

  const handleShowHistory = async () => {
    if (history) {
      setShowHistory(!showHistory);
      return;
    }
    setHistoryLoading(true);
    setShowHistory(true);

    const res = await fetch(`/api/datasets/${props.datasetId}/pricing/history`);
    const body = await res.json();
    setHistoryLoading(false);

    if (res.ok) {
      setHistory(body.data);
    }
  };

  const sparklinePoints =
    history?.snapshots.map((s) => ({
      date: new Date(s.computedAt).toLocaleDateString(),
      recommended: s.recommendedPrice,
      applied: s.appliedPrice
    })) ?? [];

  const drivers = snapshot ? factors(snapshot) : [];

  return (
    <div className="panel space-y-4 p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Dynamic Pricing</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs text-brand hover:underline disabled:opacity-60"
          aria-label="Refresh recommendation"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Current vs Recommended */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-mutedSurface p-3">
          <p className="kicker">Current price</p>
          <p className="mt-1 text-xl font-semibold text-textPrimary">
            {currentPrice !== null ? fmt(currentPrice) : "—"}
          </p>
        </div>
        <div className="rounded-md border border-brand/20 bg-blue-50/40 p-3">
          <p className="kicker">Recommended</p>
          <p className="mt-1 text-xl font-semibold text-brand">
            {snapshot ? fmt(snapshot.recommendedPrice) : "—"}
          </p>
        </div>
      </div>

      {/* Why? — top drivers */}
      {drivers.length > 0 && (
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="mb-2 font-medium text-textPrimary">Top pricing drivers</p>
          <ul className="space-y-1">
            {drivers.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-textSecondary">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                {d}
              </li>
            ))}
          </ul>
          {snapshot && (
            <p className="mt-2 text-xs text-textMuted">
              Computed {fmtDate(snapshot.computedAt)}
            </p>
          )}
        </div>
      )}

      {/* Apply button */}
      {snapshot && !config?.autoPricingEnabled && (
        <div className="space-y-1">
          <Button
            onClick={handleApply}
            disabled={applying || currentPrice === snapshot.recommendedPrice}
            size="sm"
            variant="secondary"
          >
            {applying ? "Applying…" : "Apply recommended price"}
          </Button>
          {applyError && <p className="text-xs text-danger">{applyError}</p>}
          {applySuccess && <p className="text-xs text-success">{applySuccess}</p>}
        </div>
      )}

      {/* Auto-pricing toggle */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-textPrimary">Auto pricing</p>
            <p className="text-xs text-textMuted">Apply recommendations automatically on each cron run</p>
          </div>
          <button
            role="switch"
            aria-checked={config?.autoPricingEnabled ?? false}
            onClick={() => handleToggleAuto(!(config?.autoPricingEnabled ?? false))}
            disabled={configSaving}
            className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60 ${
              config?.autoPricingEnabled ? "bg-brand" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                config?.autoPricingEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {config?.lastAppliedAt && (
          <p className="text-xs text-textMuted">Last auto-applied: {fmtDate(config.lastAppliedAt)}</p>
        )}
        {configError && <p className="text-xs text-danger">{configError}</p>}
      </div>

      {/* Constraints (collapsible) */}
      <div>
        <button
          onClick={() => setShowConstraints(!showConstraints)}
          className="text-xs text-textMuted hover:text-textSecondary"
        >
          {showConstraints ? "Hide guardrails" : "Configure guardrails"}
        </button>

        {showConstraints && (
          <div className="mt-3 space-y-3 rounded-md border border-border p-3">
            <p className="text-xs font-medium text-textSecondary">Price bounds &amp; rate limits</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Min price (USD)</label>
                <Input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Max price (USD)</label>
                <Input
                  type="number"
                  min={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Max weekly change (%)</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxWeekly}
                onChange={(e) => setMaxWeekly(e.target.value)}
              />
              <p className="mt-1 text-xs text-textMuted">
                Maximum % the price may move per week (default 10%). The engine also applies
                its own ±10% smoothing before this check.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleSaveConstraints} disabled={configSaving}>
              {configSaving ? "Saving…" : "Save guardrails"}
            </Button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="border-t border-border pt-4">
        <button
          onClick={handleShowHistory}
          className="text-xs text-textMuted hover:text-textSecondary"
        >
          {showHistory ? "Hide history" : "Show price history"}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-3">
            {historyLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-16 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ) : history ? (
              <>
                {/* Sparkline */}
                {sparklinePoints.length >= 2 && (
                  <PriceHistorySparkline points={sparklinePoints} />
                )}

                {/* Audit list */}
                {history.audits.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-textSecondary">Applied changes</p>
                    {history.audits.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-xs text-textMuted"
                      >
                        <span>
                          {fmt(a.oldPrice)} → {fmt(a.newPrice)}
                          <span className="ml-1 text-textMuted">
                            ({reasonLabel[a.reason] ?? a.reason})
                          </span>
                        </span>
                        <span>{fmtDate(a.appliedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Snapshot list */}
                {history.snapshots.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-textSecondary">Recent recommendations</p>
                    {history.snapshots.slice(0, 5).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs text-textMuted"
                      >
                        <span>
                          Rec: {fmt(s.recommendedPrice)}
                          {s.appliedPrice !== null && (
                            <span className="ml-1 text-success">✓ applied {fmt(s.appliedPrice)}</span>
                          )}
                        </span>
                        <span>{fmtDate(s.computedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-textMuted">No history yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
