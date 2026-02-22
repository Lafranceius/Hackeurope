"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export const ReportFlagButton = ({
  entityType,
  entityId,
  label = "Report"
}: {
  entityType: "DATASET" | "REQUEST" | "USER";
  entityId: string;
  label?: string;
}) => {
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    const response = await fetch("/api/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        reason: "Potential policy/compliance issue"
      })
    });
    const body = await response.json();
    setStatus(response.ok ? `Reported (${body.data.status})` : body.error ?? "Failed");
  };

  return (
    <div className="space-y-1">
      <Button variant="secondary" onClick={submit}>
        {label}
      </Button>
      {status ? <p className="text-xs text-textMuted">{status}</p> : null}
    </div>
  );
};
