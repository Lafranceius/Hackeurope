"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const ContractWorkspaceActions = ({
  contractId,
  orgId,
  milestones,
  role
}: {
  contractId: string;
  orgId: string;
  milestones: Array<{ id: string; name: string; status: string }>;
  role: "BUYER" | "SUPPLIER";
}) => {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submitDelivery = async (milestoneId: string) => {
    const response = await fetch(`/api/contracts/${contractId}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        milestoneId,
        fileUrl: `/uploads/demo-${milestoneId}.zip`,
        notes: note
      })
    });
    const body = await response.json();
    setMessage(response.ok ? "Delivery uploaded" : body.error ?? "Failed");
  };

  const resolveMilestone = async (milestoneId: string, accept: boolean) => {
    const endpoint = accept ? "accept" : "request-changes";
    const response = await fetch(`/api/contracts/${contractId}/milestones/${milestoneId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, comment: note || undefined })
    });
    const body = await response.json();
    setMessage(response.ok ? (accept ? "Milestone accepted" : "Changes requested") : body.error ?? "Failed");
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Delivery notes</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="w-full"
          placeholder="Add context for files, checks, or requested changes"
        />
      </div>
      {milestones.map((milestone) => (
        <div key={milestone.id} className="panel p-3">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{milestone.name}</p>
              <p className="text-xs text-textMuted">Milestone delivery + acceptance action</p>
            </div>
            <Badge variant={milestone.status === "ACCEPTED" ? "success" : "default"}>{milestone.status}</Badge>
          </div>
          {role === "SUPPLIER" ? (
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => submitDelivery(milestone.id)}>
                Upload Delivery
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => resolveMilestone(milestone.id, false)}>
                Request changes
              </Button>
              <Button size="sm" onClick={() => resolveMilestone(milestone.id, true)}>
                Accept
              </Button>
            </div>
          )}
        </div>
      ))}
      {message ? <p className="rounded-md border border-border bg-mutedSurface px-3 py-2 text-sm text-textSecondary">{message}</p> : null}
    </div>
  );
};
