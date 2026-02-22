"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export const InviteMemberAction = ({ orgId }: { orgId: string }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="panel space-y-3 p-4">
      <h3 className="font-semibold">Invite Team Member</h3>
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setStatus(`Invitation placeholder created for ${email || "(empty)"} in org ${orgId}.`)}
      >
        Send Invite (placeholder)
      </Button>
      {status ? <p className="text-xs text-textMuted">{status}</p> : null}
    </div>
  );
};
