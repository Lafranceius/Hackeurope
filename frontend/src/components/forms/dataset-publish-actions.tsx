"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export const DatasetPublishActions = ({
  datasetId,
  orgId,
  status,
  canManage,
  hasDatasetFile,
  estimatedImproveCostUsd = 50
}: {
  datasetId: string;
  orgId: string;
  status: string;
  canManage: boolean;
  hasDatasetFile: boolean;
  estimatedImproveCostUsd?: number;
}) => {
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [showImproveConfirm, setShowImproveConfirm] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const showPublish = status !== "PUBLISHED";
  const canTriggerImprove = canManage && hasDatasetFile;

  const sanitizeErrorMessage = (value: unknown, fallback: string) => {
    if (typeof value !== "string") return fallback;
    const cleaned = value.replace(/[\r\n\t]+/g, " ").trim();
    return cleaned ? cleaned.slice(0, 200) : fallback;
  };

  const downloadCleanedFile = async (fileUrl?: string, fileName?: string) => {
    if (!fileUrl) return;

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch cleaned file");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleaned_${fileName || "dataset.csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const fallbackBlob = new Blob(["Simulated cleaned data"], { type: "text/plain" });
      const url = URL.createObjectURL(fallbackBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cleaned_${fileName || "dataset.csv"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const publish = async () => {
    setMessage(null);
    setLoading(true);
    const response = await fetch(`/api/datasets/${datasetId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId })
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage({ tone: "error", text: sanitizeErrorMessage(body.error, "Publish failed") });
      return;
    }

    setMessage({ tone: "success", text: "Dataset published successfully." });
    router.refresh();
  };

  const improveDataset = async () => {
    if (!canTriggerImprove) return;

    setShowImproveConfirm(false);
    setImproving(true);
    setMessage(null);
    const simulatedLoadingMs = 12_000 + Math.floor(Math.random() * 3_001);
    try {
      const requestPromise = (async () => {
        const response = await fetch(`/api/datasets/${datasetId}/improve`, {
          method: "POST"
        });

        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        return { response, body };
      })();

      const [{ response, body }] = await Promise.all([
        requestPromise,
        new Promise((resolve) => setTimeout(resolve, simulatedLoadingMs))
      ]);

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: sanitizeErrorMessage(
            body && typeof body === "object" && "error" in body ? (body as { error?: unknown }).error : null,
            "Failed to trigger dataset improvement"
          )
        });
        return;
      }

      const cleanedFile =
        body && typeof body === "object" && "data" in body && body.data && typeof body.data === "object" && "cleanedFile" in body.data
          ? (body.data as { cleanedFile?: { fileUrl?: string; fileName?: string } }).cleanedFile
          : undefined;
      await downloadCleanedFile(cleanedFile?.fileUrl, cleanedFile?.fileName);
      setMessage({ tone: "success", text: "Dataset improvement triggered." });
    } catch {
      setMessage({ tone: "error", text: "Failed to trigger dataset improvement" });
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {status === "PUBLISHED" ? <p className="text-sm text-success">Dataset is live in marketplace.</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {showPublish ? (
          <Button onClick={publish} disabled={loading || improving}>
            {loading ? "Publishing..." : "Publish Dataset"}
          </Button>
        ) : null}
        {canManage ? (
          <Button
            variant="secondary"
            onClick={() => {
              if (!canTriggerImprove) return;
              setMessage(null);
              setShowImproveConfirm(true);
            }}
            disabled={loading || improving || !hasDatasetFile}
          >
            {improving ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent"
                  aria-hidden="true"
                />
                Improving...
              </>
            ) : (
              "Improve dataset"
            )}
          </Button>
        ) : null}
      </div>
      {canManage && !hasDatasetFile ? (
        <p className="text-sm text-textMuted">Upload a file to improve this dataset.</p>
      ) : null}
      {canManage && showImproveConfirm ? (
        <div className="rounded-md border border-brand/20 bg-brandSoft p-3 text-sm">
          <p className="text-textPrimary">
            Cleaning will cost <span className="font-semibold">${estimatedImproveCostUsd.toLocaleString()}</span>. Are you sure?
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={improveDataset} disabled={loading || improving}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowImproveConfirm(false)}
              disabled={loading || improving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {message ? <p className={`text-sm ${message.tone === "success" ? "text-success" : "text-danger"}`}>{message.text}</p> : null}
    </div>
  );
};
