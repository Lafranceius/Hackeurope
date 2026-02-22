"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { WarningBanner } from "@/components/ui/warning-banner";

export const RequestCreateForm = ({ orgId }: { orgId: string }) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minors, setMinors] = useState(false);
  const [pii, setPii] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    const payload = {
      orgId,
      title: String(formData.get("title")),
      objective: String(formData.get("objective")),
      population: String(formData.get("population")),
      sampleSize: Number(formData.get("sampleSize")),
      geography: String(formData.get("geography")),
      dataType: String(formData.get("dataType")),
      budgetMin: Number(formData.get("budgetMin")),
      budgetMax: Number(formData.get("budgetMax")),
      deadlineAt: new Date(String(formData.get("deadlineAt"))).toISOString(),
      flagsMinors: Boolean(formData.get("flagsMinors")),
      flagsPii: Boolean(formData.get("flagsPii")),
      consentRequired: Boolean(formData.get("consentRequired")),
      extraComplianceDetails: String(formData.get("extraComplianceDetails")),
      schemaFields: [
        { name: "student_id", type: "STRING", required: true, notes: "Pseudonymous" },
        { name: "school_region", type: "STRING", required: true, notes: "State/County" },
        { name: "stimulation_score", type: "FLOAT", required: true, notes: "Composite score" }
      ]
    };

    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Could not create request");
      return;
    }

    router.push(`/requests/${result.data.id}`);
    router.refresh();
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      {(minors || pii) && (
        <WarningBanner
          title="Enhanced compliance required"
          description="Requests involving minors or PII must include additional compliance details before publishing."
        />
      )}
      <div>
        <label className="field-label">RFP title</label>
        <input name="title" required defaultValue="Student Intellectual Stimulation Survey Dataset (Grades 5–7)" />
      </div>
      <div>
        <label className="field-label">Objective</label>
        <textarea name="objective" rows={3} required defaultValue="Measure intellectual stimulation in schools across multiple geographies." />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Target population</label>
          <input name="population" required defaultValue="Students grades 5-7" />
        </div>
        <div>
          <label className="field-label">Sample size</label>
          <input name="sampleSize" type="number" required defaultValue={1000} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Geography</label>
          <input name="geography" required defaultValue="US" />
        </div>
        <div>
          <label className="field-label">Data type</label>
          <input name="dataType" required defaultValue="Survey" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="field-label">Budget min</label>
          <input name="budgetMin" type="number" required defaultValue={40000} />
        </div>
        <div>
          <label className="field-label">Budget max</label>
          <input name="budgetMax" type="number" required defaultValue={95000} />
        </div>
        <div>
          <label className="field-label">Bid deadline</label>
          <input name="deadlineAt" type="date" required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <label className="flex items-center gap-2">
          <input name="flagsMinors" type="checkbox" onChange={(event) => setMinors(event.target.checked)} /> Minors involved
        </label>
        <label className="flex items-center gap-2">
          <input name="flagsPii" type="checkbox" onChange={(event) => setPii(event.target.checked)} /> PII involved
        </label>
        <label className="flex items-center gap-2">
          <input name="consentRequired" type="checkbox" defaultChecked /> Consent required
        </label>
      </div>
      <div>
        <label className="field-label">Extra compliance details</label>
        <textarea
          name="extraComplianceDetails"
          rows={3}
          placeholder="Parental consent model, review board references, privacy safeguards"
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Creating request..." : "Publish Request"}
      </Button>
    </form>
  );
};
