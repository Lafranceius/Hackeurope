"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export const DatasetPublishActions = ({
  datasetId,
  orgId,
  status
}: {
  datasetId: string;
  orgId: string;
  status: string;
}) => {
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  if (status === "PUBLISHED") {
    return <p className="text-sm text-success">Dataset is live in marketplace.</p>;
  }

  const publish = async () => {
    setLoading(true);
    const response = await fetch(`/api/datasets/${datasetId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId })
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(body.error ?? "Publish failed");
      return;
    }

    setMessage("Dataset published successfully.");
    router.refresh();
  };

  const cleanData = async () => {
    setCleaning(true);
    setMessage(null);
    // Placeholder timeout to simulate a request. 
    // You will wire this to your backend later.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setCleaning(false);
    setMessage("Data cleaning triggered (frontend placeholder).");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={publish} disabled={loading || cleaning}>
          {loading ? "Publishing..." : "Publish Dataset"}
        </Button>
        <Button variant="secondary" onClick={cleanData} disabled={loading || cleaning}>
          {cleaning ? "Cleaning..." : "Clean Data"}
        </Button>
      </div>
      {message ? (
        <p className={`text-sm ${message.includes("successfully") || message.includes("triggered") ? "text-success" : "text-danger"}`}>{message}</p>
      ) : null}
    </div>
  );
};
