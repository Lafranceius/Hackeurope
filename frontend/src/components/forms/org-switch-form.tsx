"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export const OrgSwitchForm = ({
  currentOrgId,
  memberships
}: {
  currentOrgId: string;
  memberships: Array<{ orgId: string; orgName: string; role: string }>;
}) => {
  const [selectedOrg, setSelectedOrg] = useState(currentOrgId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: selectedOrg })
    });

    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(body.error ?? "Could not switch org");
      return;
    }

    router.push(`/org/${selectedOrg}/analytics`);
    router.refresh();
  };

  return (
    <div className="panel max-w-xl p-6">
      <label className="field-label">Select organization</label>
      <select value={selectedOrg} onChange={(event) => setSelectedOrg(event.target.value)} className="w-full">
        {memberships.map((membership) => (
          <option key={membership.orgId} value={membership.orgId}>
            {membership.orgName} ({membership.role})
          </option>
        ))}
      </select>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <Button className="mt-4" onClick={submit} disabled={loading}>
        {loading ? "Switching..." : "Switch Org"}
      </Button>
    </div>
  );
};
