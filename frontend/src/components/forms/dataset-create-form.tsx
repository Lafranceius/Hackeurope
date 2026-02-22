"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

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
};

const ACCEPTED_EXTENSIONS = [".csv", ".parquet", ".json", ".xlsx"];
const ACCEPTED_LIST = ACCEPTED_EXTENSIONS.join(",");
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const complexityMeta: Record<
  ComplexityTag,
  { label: string; dotClassName: string }
> = {
  A: { label: "Simple", dotClassName: "bg-success" },
  B: { label: "Requires context", dotClassName: "bg-brand" },
  C: { label: "Requires human review", dotClassName: "bg-warning" },
  D: { label: "Requires data quality engineer", dotClassName: "bg-danger" }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const qualityToneClass = (quality: number) => {
  if (quality <= 49) {
    return "bg-danger";
  }
  if (quality <= 74) {
    return "bg-warning";
  }
  return "bg-success";
};

const getExtension = (fileName: string) => {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
};

export const DatasetCreateForm = ({ orgId, templates }: { orgId: string; templates: Template[] }) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedDatasetFile | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<DatasetAssessmentResult | null>(null);

  const clearFileState = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    setUploadError(null);
    setAssessment(null);
    setAssessmentError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    setAssessment(result.data as DatasetAssessmentResult);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setAssessmentError(null);
    setAssessment(null);
    setUploading(true);

    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body
    });
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!uploadedFile) {
      setLoading(false);
      setError("Upload a dataset file before saving the draft.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      orgId,
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      tags: String(formData.get("tags"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      categories: String(formData.get("categories"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      deliveryMethods: Array.from(formData.getAll("deliveryMethods")) as string[],
      schemaFields: [
        { name: "record_id", type: "STRING", required: true, notes: "Primary key" },
        { name: "created_at", type: "TIMESTAMP", required: true, notes: "Event timestamp" },
        { name: "score", type: "FLOAT", required: false, notes: "Signal score" }
      ],
      sampleRows: [{ record_id: "A-100", created_at: "2025-01-01", score: 88.5 }],
      pricePlans: [
        {
          type: String(formData.get("planType")) as "ONE_TIME" | "SUBSCRIPTION",
          price: Number(formData.get("planPrice")),
          interval: String(formData.get("planInterval")) || null,
          tierName: String(formData.get("tierName"))
        }
      ],
      licenseTemplateId: String(formData.get("licenseTemplateId")),
      customClauses: String(formData.get("customClauses")),
      datasetFile: uploadedFile
    };

    const response = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to create listing");
      return;
    }

    router.push(`/datasets/${result.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Dataset title</label>
          <Input name="title" required />
        </div>
        <div>
          <label className="field-label">Tier name</label>
          <Input name="tierName" defaultValue="Enterprise" required />
        </div>
      </div>
      <div>
        <label className="field-label">Description</label>
        <textarea name="description" rows={4} className="w-full" required />
      </div>

      <div className="panel p-4">
        <label className="field-label">Dataset file</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_LIST}
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            await validateAndUseFile(file);
          }}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label="Dataset file upload drop zone"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={async (event) => {
            event.preventDefault();
            setDragActive(false);
            const droppedFile = event.dataTransfer.files?.[0];
            if (!droppedFile) {
              return;
            }
            await validateAndUseFile(droppedFile);
          }}
          className={`rounded-md border border-dashed p-4 text-sm transition-colors ${
            dragActive ? "border-brand bg-brandSoft" : "border-border bg-mutedSurface"
          }`}
        >
          <p className="font-medium text-textPrimary">Drag and drop your dataset file here</p>
          <p className="mt-1 text-textMuted">Accepted: .csv, .parquet, .json, .xlsx (max 50MB)</p>
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
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        ) : null}
        {uploading ? <p className="mt-2 text-sm text-textMuted">Uploading file...</p> : null}
        {uploadedFile ? <p className="mt-2 text-sm text-success">Upload complete: {uploadedFile.fileUrl}</p> : null}
        {uploadError ? <p className="mt-2 text-sm text-danger">{uploadError}</p> : null}
      </div>

      {(assessmentLoading || assessmentError || assessment) && (
        <div className="panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Assessment</h3>
            {uploadedFile && assessmentError ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => runAssessment(uploadedFile)}>
                Retry assessment
              </Button>
            ) : null}
          </div>

          {assessmentLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-48" />
            </div>
          ) : null}

          {assessmentError ? <p className="text-sm text-danger">{assessmentError}</p> : null}

          {assessment ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-textSecondary">Data quality</span>
                  <span className="font-semibold text-textPrimary">{assessment.PLACEHOLDER_QUALITY_PERCENT}%</span>
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

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-textSecondary">Complexity</span>
                <span className="status-pill gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${complexityMeta[assessment.PLACEHOLDER_COMPLEXITY_TAG].dotClassName}`}
                  />
                  {assessment.PLACEHOLDER_COMPLEXITY_TAG} - {complexityMeta[assessment.PLACEHOLDER_COMPLEXITY_TAG].label}
                </span>
              </div>

              <div className="rounded-md border border-border bg-mutedSurface p-3 text-sm">
                <p className="font-medium text-textPrimary">
                  Estimated cleaning cost: ${assessment.PLACEHOLDER_CLEANING_COST_USD.toLocaleString()}
                </p>
                <p className="mt-1 text-textMuted">Estimate increases with complexity and data issues.</p>
              </div>

              <div className="rounded-md border border-border p-3 text-sm">
                <p className="mb-2 font-medium text-textPrimary">Value projection</p>
                <div className="space-y-1 text-textSecondary">
                  <p>Initial estimated price: $12,000</p>
                  <p>
                    Estimated improved quality: {assessment.PLACEHOLDER_IMPROVED_QUALITY_PERCENT}% (≈ +20%)
                  </p>
                  <p>New price: $15,000</p>
                  <p
                    className={
                      3000 - assessment.PLACEHOLDER_CLEANING_COST_USD >= 0
                        ? "font-semibold text-success"
                        : "font-semibold text-danger"
                    }
                  >
                    Estimated profit: ${(3000 - assessment.PLACEHOLDER_CLEANING_COST_USD).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Tags (comma-separated)</label>
          <Input name="tags" defaultValue="finance, equities, tick" required />
        </div>
        <div>
          <label className="field-label">Categories (comma-separated)</label>
          <Input name="categories" defaultValue="Finance" required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Plan type</label>
          <select name="planType" className="w-full" defaultValue="SUBSCRIPTION">
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="ONE_TIME">One-time</option>
          </select>
        </div>
        <div>
          <label className="field-label">Price (USD)</label>
          <Input name="planPrice" type="number" min={1} defaultValue={5000} required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Interval (if subscription)</label>
          <Input name="planInterval" defaultValue="month" />
        </div>
        <div>
          <label className="field-label">License template</label>
          <select name="licenseTemplateId" className="w-full" defaultValue={templates[0]?.id}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{`${template.name} v${template.version}`}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">Delivery methods</label>
        <p className="mb-2 text-xs text-textMuted">Choose how buyers receive access after purchase.</p>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md border border-border bg-mutedSurface px-3 py-2">
            <input type="checkbox" name="deliveryMethods" value="DOWNLOAD" defaultChecked />
            File download
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border bg-mutedSurface px-3 py-2">
            <input type="checkbox" name="deliveryMethods" value="API" defaultChecked />
            API access
          </label>
        </div>
      </div>
      <div>
        <label className="field-label">Custom clauses</label>
        <textarea name="customClauses" rows={3} className="w-full" placeholder="Custom legal clauses" />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Creating draft..." : "Save Draft"}
      </Button>
    </form>
  );
};
