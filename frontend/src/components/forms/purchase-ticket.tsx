"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Plan = { id: string; tierName: string; type: string; price: number; interval?: string | null };

export const PurchaseTicket = ({
  orgId,
  datasetId,
  plans,
  stripeEnabled
}: {
  orgId: string;
  datasetId: string;
  plans: Plan[];
  stripeEnabled: boolean;
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [rowCount, setRowCount] = useState<string>("all");
  const [state, setState] = useState<{ loading: boolean; error?: string; success?: string }>({ loading: false });

  const selected = plans.find((plan) => plan.id === selectedPlanId);

  const buy = async () => {
    if (!selected) return;
    setState({ loading: true });

    if (stripeEnabled) {
      const checkout = await fetch("/api/purchases/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerOrgId: orgId,
          datasetId,
          planId: selected.id,
          amount: selected.price,
          currency: "USD",
          rowCount
        })
      });
      const response = await checkout.json();
      if (!checkout.ok) {
        setState({ loading: false, error: response.error ?? "Checkout failed" });
        return;
      }

      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
        return;
      }
    }

    const testPurchase = await fetch("/api/purchases/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerOrgId: orgId, datasetId, planId: selected.id, rowCount })
    });

    const body = await testPurchase.json();
    if (!testPurchase.ok) {
      setState({ loading: false, error: body.error ?? "Purchase failed" });
      return;
    }

    setState({ loading: false, success: "Entitlement granted. Access is now active." });
  };

  return (
    <div className="sticky top-20 panel space-y-4 p-4 md:p-5">
      <h3 className="text-[28px] leading-8 font-semibold tracking-[-0.01em]">Get Access</h3>
      <div>
        <label className="field-label">Plan</label>
        <select className="w-full" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.tierName} - ${plan.price}/{plan.interval ?? "one-time"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Number of Rows</label>
        <select className="w-full" value={rowCount} onChange={(event) => setRowCount(event.target.value)}>
          <option value="all">Full Dataset</option>
          <option value="1000">1,000 rows (Sample)</option>
          <option value="10000">10,000 rows</option>
          <option value="100000">100,000 rows</option>
          <option value="1000000">1,000,000 rows</option>
        </select>
      </div>
      <div className="rounded-md border border-border bg-mutedSurface p-3 text-sm">
        <p className="text-textMuted">Total price</p>
        <p className="mt-1 text-3xl font-semibold">${selected?.price?.toLocaleString() ?? "0"}</p>
      </div>
      <Button fullWidth size="lg" onClick={buy} disabled={state.loading || !selectedPlanId}>
        {state.loading ? "Processing..." : "Purchase Access"}
      </Button>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <p className="text-xs text-textMuted">License acceptance and invoice are generated automatically.</p>
    </div>
  );
};
