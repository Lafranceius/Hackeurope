"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Template = { id: string; name: string; version: string };
type ComplexityTag = "A" | "B" | "C" | "D";

type UploadedDatasetFile = {
  fileUrl: string;
  fileName: string;
  fileSize: number;
};

type DatasetAssessmentResult = {
  PLACEHOLDER_QUALITY_PERCENT: number;
  PLACEHOLDER_COMPLEXITY_TAG: ComplexityTag;
  PLACEHOLDER_CLEANING_COST_USD: number;
  PLACEHOLDER_IMPROVED_QUALITY_PERCENT: number;
  issues?: string[];
  summary?: string;
  agentAssessed?: boolean;
};

const ACCEPTED_EXTENSIONS = [".csv", ".parquet", ".json", ".xlsx"];
const ACCEPTED_LIST = ACCEPTED_EXTENSIONS.join(",");
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_PRICE = 400;

const complexityMeta: Record<ComplexityTag, { label: string; dotClassName: string }> = {
  A: { label: "Simple", dotClassName: "bg-success" },
  B: { label: "Requires context", dotClassName: "bg-brand" },
  C: { label: "Requires human review", dotClassName: "bg-warning" },
  D: { label: "Requires data quality engineer", dotClassName: "bg-danger" }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const qualityToneClass = (quality: number) => {
  if (quality <= 49) return "bg-danger";
  if (quality <= 74) return "bg-warning";
  return "bg-success";
};

const getExtension = (fileName: string) => {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
};

/** Round to nearest $50 */
const roundPrice = (n: number) => Math.round(n / 50) * 50;

export const DatasetCreateForm = ({ orgId, templates }: { orgId: string; templates: Template[] }) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // File & assessment
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedDatasetFile | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<DatasetAssessmentResult | null>(null);

  // Cleaning
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);

  // Price — starts at DEFAULT_PRICE, auto-updated once agent produces a recommendation
  const [planPrice, setPlanPrice] = useState(DEFAULT_PRICE);

  // Submit
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const clearFileState = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    setUploadError(null);
    setAssessment(null);
    setAssessmentError(null);
    setPlanPrice(DEFAULT_PRICE);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runAssessment = async (file: UploadedDatasetFile) => {
    setAssessmentLoading(true);
    setAssessmentError(null);
    setAssessment(null);

    const response = await fetch("/api/datasets/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(file)
    });
    const result = await response.json();
    setAssessmentLoading(false);

    if (!response.ok || !result.ok) {
      setAssessmentError(result.error ?? "Assessment failed. Try again.");
      return;
    }

    const data = result.data as DatasetAssessmentResult;
    setAssessment(data);

    // Ask the pricing engine for a recommendation and auto-apply it
    try {
      const previewRes = await fetch("/api/pricing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualityPercent: data.PLACEHOLDER_QUALITY_PERCENT,
          complexityTag: data.PLACEHOLDER_COMPLEXITY_TAG,
          cleaningCostUsd: data.PLACEHOLDER_CLEANING_COST_USD
        })
      });
      if (previewRes.ok) {
        const previewBody = await previewRes.json();
        if (previewBody.ok && previewBody.data?.recommendedOneTimePriceUsd) {
          setPlanPrice(previewBody.data.recommendedOneTimePriceUsd);
        }
      }
    } catch {
      // Non-critical — planPrice stays at DEFAULT_PRICE
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setAssessmentError(null);
    setAssessment(null);
    setUploading(true);

    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body });
    const result = await response.json();
    setUploading(false);

    if (!response.ok || !result.ok) {
      setUploadError(result.error ?? "Upload failed");
      return;
    }

    const uploaded = result.data as UploadedDatasetFile;
    setUploadedFile(uploaded);
    await runAssessment(uploaded);
  };

  const cleanUploadedData = async () => {
    setShowCleanConfirm(false);
    setCleaning(true);
    setCleanError(null);
    setCleaned(false);
    const simulatedLoadingMs = 12_000 + Math.floor(Math.random() * 3_001);

    // Simulate backend cleaning process
    await new Promise((resolve) => setTimeout(resolve, simulatedLoadingMs));

    // Simulate success
    setCleaning(false);
    setCleaned(true);

    // Create a dummy download link for the "cleaned" file
    const blob = new Blob(["Simulated cleaned data"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaned_${uploadedFile?.fileName || "dataset.csv"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateAndUseFile = async (file: File) => {
    const extension = getExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setUploadError("Unsupported file type. Use .csv, .parquet, .json, or .xlsx.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File size must be between 1B and 50MB.");
      return;
    }
    setSelectedFile(file);
    await handleFileUpload(file);
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      setSubmitError("Upload a dataset file before saving the draft.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      orgId,
      title,
      description,
      tags: ["hackathon"],
      categories: ["Other"],
      deliveryMethods: ["DOWNLOAD", "API"],
      schemaFields: [{ name: "id", type: "string", required: true }],
      sampleRows: [],
      pricePlans: [
        {
          type: "ONE_TIME" as const,
          price: planPrice,
          tierName: "Standard"
        }
      ],
      licenseTemplateId: templates[0]?.id ?? "",
      customClauses: "",
      datasetFile: uploadedFile
    };

    const response = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setSubmitError(result.error ?? "Failed to create listing");
      return;
    }

    router.push(`/datasets/${result.data.id}`);
    router.refresh();
  };

  // ─── Value projection — all numbers derived from assessment + planPrice ────

  const renderValueProjection = () => {
    if (!assessment) return null;

    const currentQuality = assessment.PLACEHOLDER_QUALITY_PERCENT;
    const improvedQuality = assessment.PLACEHOLDER_IMPROVED_QUALITY_PERCENT;
    const cleaningCost = assessment.PLACEHOLDER_CLEANING_COST_USD;

    // Price after cleaning scales proportionally with the quality improvement
    const qualityGain = improvedQuality / Math.max(currentQuality, 1);
    const priceAfterCleaning = roundPrice(planPrice * qualityGain);
    const estimatedProfit = priceAfterCleaning - cleaningCost - planPrice;

    return (
      <div className="rounded-md border border-border p-3 text-sm">
        <p className="mb-2 font-medium text-textPrimary">Value projection after cleaning</p>
        <div className="space-y-1 text-textSecondary">
          <p>
            Current listing price:{" "}
            <span className="font-medium text-textPrimary">${planPrice.toLocaleString()}</span>
          </p>
          <p>
            Quality after cleaning:{" "}
            <span className="font-medium text-textPrimary">
              {currentQuality}% → {improvedQuality}%
            </span>
          </p>
          <p>
            Estimated cleaning cost:{" "}
            <span className="font-medium text-textPrimary">${cleaningCost.toLocaleString()}</span>
          </p>
          <p>
            Price after cleaning:{" "}
            <span className="font-medium text-textPrimary">${priceAfterCleaning.toLocaleString()}</span>
          </p>
          <p
            className={estimatedProfit >= 0 ? "font-semibold text-success" : "font-semibold text-danger"}
          >
            Net gain per sale: ${estimatedProfit.toLocaleString()}
          </p>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Basics */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Dataset title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="field-label">Description</label>
        <textarea
          rows={4}
          className="w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
        />
      </div>

      {/* File upload */}
      <div className="panel p-4">
        <label className="field-label">Dataset file</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_LIST}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await validateAndUseFile(file);
          }}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label="Dataset file upload drop zone"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) await validateAndUseFile(file);
          }}
          className={`rounded-md border border-dashed p-4 text-sm transition-colors ${dragActive ? "border-brand bg-brandSoft" : "border-border bg-mutedSurface"
            }`}
        >
          <p className="font-medium text-textPrimary">Drag and drop your dataset file here</p>
          <p className="mt-1 text-textMuted">Accepted: .csv, .parquet, .json, .xlsx · max 50 MB</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose file
          </Button>
          {selectedFile ? (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                Replace
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearFileState}>
                Remove
              </Button>
            </>
          ) : null}
        </div>

        {selectedFile ? (
          <p className="mt-2 text-sm text-textSecondary">
            {selectedFile.name} · {formatFileSize(selectedFile.size)}
          </p>
        ) : null}
        {uploading ? <p className="mt-2 text-sm text-textMuted">Uploading…</p> : null}
        {uploadError ? <p className="mt-2 text-sm text-danger">{uploadError}</p> : null}
      </div>

      {/* Agent assessment */}
      {(assessmentLoading || assessmentError || assessment) ? (
        <div className="panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Agent assessment</h3>
            {uploadedFile && assessmentError ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => runAssessment(uploadedFile)}>
                Retry
              </Button>
            ) : null}
          </div>

          {assessmentLoading ? (
            <div className="space-y-3">
              <p className="text-sm text-textMuted">Agent is reading and analysing your file…</p>
              <div className="skeleton h-4 w-48" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-4 w-32" />
            </div>
          ) : null}

          {assessmentError ? <p className="text-sm text-danger">{assessmentError}</p> : null}

          {assessment ? (
            <div className="space-y-4">
              {/* AI summary */}
              {assessment.agentAssessed && assessment.summary ? (
                <div className="flex items-start gap-2 rounded-md border border-border bg-mutedSurface p-3 text-sm">
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    AI assessed
                  </span>
                  <p className="text-textSecondary">{assessment.summary}</p>
                </div>
              ) : null}

              {/* Quality bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-textSecondary">Data quality</span>
                    <span className="font-semibold text-textPrimary">
                      {assessment.PLACEHOLDER_QUALITY_PERCENT}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full bg-mutedSurface"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={assessment.PLACEHOLDER_QUALITY_PERCENT}
                    aria-label="Data quality percentage"
                  >
                    <div
                      className={`h-2 rounded-full ${qualityToneClass(assessment.PLACEHOLDER_QUALITY_PERCENT)}`}
                      style={{ width: `${assessment.PLACEHOLDER_QUALITY_PERCENT}%` }}
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-center self-end">
                  <Button
                    className="bg-green-500 border-none text-white hover:bg-green-600"
                    size="sm"
                    onClick={() => {
                      setCleanError(null);
                      setShowCleanConfirm(true);
                    }}
                    disabled={cleaning || cleaned}
                  >
                    {cleaning ? (
                      <>
                        <span
                          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
                          aria-hidden="true"
                        />
                        Cleaning...
                      </>
                    ) : cleaned ? (
                      "Cleaned"
                    ) : (
                      "Clean Data"
                    )}
                  </Button>
                  {showCleanConfirm && assessment ? (
                    <div className="mt-2 w-full rounded-md border border-brand/20 bg-brandSoft p-2 text-left text-xs">
                      <p className="text-textPrimary">
                        Cleaning will cost{" "}
                        <span className="font-semibold">
                          ${assessment.PLACEHOLDER_CLEANING_COST_USD.toLocaleString()}
                        </span>
                        . Are you sure?
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="sm" type="button" onClick={cleanUploadedData} disabled={cleaning}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="secondary"
                          onClick={() => setShowCleanConfirm(false)}
                          disabled={cleaning}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {cleanError && <p className="mt-1 text-xs text-danger">{cleanError}</p>}
                </div>
              </div>

              {/* Improved Quality Bar (shown after cleaning) */}
              {cleaned && (
                <div className="mt-4 rounded-md border border-success/20 bg-success-soft p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-success">Cleaned data quality</span>
                    <span className="font-semibold text-success">
                      {assessment.PLACEHOLDER_IMPROVED_QUALITY_PERCENT}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full bg-success/20"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={assessment.PLACEHOLDER_IMPROVED_QUALITY_PERCENT}
                    aria-label="Improved data quality percentage"
                  >
                    <div
                      className="h-2 rounded-full bg-success"
                      style={{ width: `${assessment.PLACEHOLDER_IMPROVED_QUALITY_PERCENT}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-success/80">
                    File download started automatically. You can safely discard or upload the cleaned file directly.
                  </p>
                </div>
              )}

              {/* Complexity */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-textSecondary">Complexity</span>
                <span className="status-pill gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${complexityMeta[assessment.PLACEHOLDER_COMPLEXITY_TAG].dotClassName}`}
                  />
                  {assessment.PLACEHOLDER_COMPLEXITY_TAG} — {complexityMeta[assessment.PLACEHOLDER_COMPLEXITY_TAG].label}
                </span>
              </div>

              {/* Issues removed as requested */}

              {/* Suggested price (auto-applied, shown as info) */}
              <div className="flex items-center justify-between rounded-md border border-brand/25 bg-blue-50/40 p-3 text-sm">
                <p className="font-medium text-textPrimary">
                  Suggested listing price:{" "}
                  <span className="text-brand">${planPrice.toLocaleString()}</span>
                </p>
                <p className="text-xs text-textMuted">Set by agent · refine after publishing</p>
              </div>

              {/* Value projection — all numbers derived from assessment + planPrice */}
              {renderValueProjection()}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Submit */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div />
        <div className="flex flex-col items-end gap-2">
          {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}
          <Button
            type="button"
            size="lg"
            disabled={submitting || !title.trim() || !description.trim() || !uploadedFile || uploading || assessmentLoading}
            onClick={handleSubmit}
          >
            {submitting ? "Creating draft…" : "Save Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
};
