"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export const VerifyOrgAction = ({ orgId, verified }: { orgId: string; verified: boolean }) => {
  const [state, setState] = useState<string | null>(null);

  const toggle = async () => {
    const response = await fetch("/api/admin/verify-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, verified: !verified })
    });
    const result = await response.json();
    setState(response.ok ? `Verification set to ${result.data.verificationStatus}` : result.error ?? "Failed");
  };

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={toggle}>
        {verified ? "Unverify" : "Verify"}
      </Button>
      {state ? <p className="text-xs text-textMuted">{state}</p> : null}
    </div>
  );
};

export const ModerateFlagAction = ({ flagId }: { flagId: string }) => {
  const [state, setState] = useState<string | null>(null);

  const apply = async (status: "RESOLVED" | "DISMISSED") => {
    const response = await fetch("/api/admin/moderation/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagId, status })
    });
    const result = await response.json();
    setState(response.ok ? `Flag status: ${result.data.status}` : result.error ?? "Failed");
  };

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => apply("RESOLVED")}>Resolve</Button>
      <Button variant="danger" onClick={() => apply("DISMISSED")}>Dismiss</Button>
      {state ? <span className="self-center text-xs text-textMuted">{state}</span> : null}
    </div>
  );
};
