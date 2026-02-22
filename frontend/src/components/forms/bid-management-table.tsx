"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BidItem = {
  id: string;
  supplier: string;
  status: string;
  totalPrice: number;
  timelineEnd: string;
};

export const BidManagementTable = ({
  requestId,
  buyerOrgId,
  bids
}: {
  requestId: string;
  buyerOrgId: string;
  bids: BidItem[];
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const selectedRows = useMemo(() => bids.filter((bid) => selected.includes(bid.id)), [bids, selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length === 3) return prev;
      return [...prev, id];
    });
  };

  const award = async (bidId: string) => {
    const response = await fetch(`/api/requests/${requestId}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId, buyerOrgId })
    });
    const result = await response.json();
    setMessage(response.ok ? `Contract ${result.data.id} created` : result.error ?? "Award failed");
  };

  const messageSupplier = async (supplier: string) => {
    const threadResponse = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "REQUEST",
        requestId
      })
    });

    const threadBody = await threadResponse.json();
    if (!threadResponse.ok) {
      setMessage(threadBody.error ?? "Unable to create thread");
      return;
    }

    const sendResponse = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: threadBody.data.id,
        body: `Hello ${supplier}, please provide additional detail on your submission.`
      })
    });
    const sendBody = await sendResponse.json();
    setMessage(sendResponse.ok ? `Message sent to ${supplier}` : sendBody.error ?? "Unable to send message");
  };

  return (
    <div className="space-y-4">
      <div className="data-table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-3 py-2">Compare</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Timeline</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => (
              <tr key={bid.id}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.includes(bid.id)} onChange={() => toggle(bid.id)} />
                </td>
                <td className="px-3 py-2">{bid.supplier}</td>
                <td className="px-3 py-2">
                  <Badge variant={bid.status === "AWARDED" ? "success" : "default"}>{bid.status}</Badge>
                </td>
                <td className="px-3 py-2">${bid.totalPrice.toLocaleString()}</td>
                <td className="px-3 py-2">{new Date(bid.timelineEnd).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => messageSupplier(bid.supplier)}>
                      Message
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => award(bid.id)}>
                      Award
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedRows.length > 0 ? (
        <div className="panel p-4">
          <h3 className="mb-3 font-semibold">Compare bids ({selectedRows.length}/3)</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {selectedRows.map((bid) => (
              <div key={bid.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{bid.supplier}</p>
                <p className="text-sm text-textMuted">Price: ${bid.totalPrice.toLocaleString()}</p>
                <p className="text-sm text-textMuted">Timeline: {new Date(bid.timelineEnd).toLocaleDateString()}</p>
                <p className="text-sm text-textMuted">Status: {bid.status}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {message ? <p className="text-sm text-textSecondary">{message}</p> : null}
    </div>
  );
};
