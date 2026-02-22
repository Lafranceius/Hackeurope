"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { WarningBanner } from "@/components/ui/warning-banner";

const steps = ["Pricing", "Plan", "Compliance", "Team", "Review"];

export const BidSubmitForm = ({
  requestId,
  orgId,
  sensitive
}: {
  requestId: string;
  orgId: string;
  sensitive: boolean;
}) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progress = useMemo(() => ((currentStep + 1) / steps.length) * 100, [currentStep]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    const totalPrice = Number(formData.get("totalPrice"));
    const milestone1 = Number(formData.get("milestone1Amount"));
    const milestone2 = Number(formData.get("milestone2Amount"));

    const payload = {
      requestId,
      orgId,
      status: "SUBMITTED",
      pricingMode: "MILESTONE",
      totalPrice,
      currency: "USD",
      timelineStart: new Date(String(formData.get("timelineStart"))).toISOString(),
      timelineEnd: new Date(String(formData.get("timelineEnd"))).toISOString(),
      planText: String(formData.get("planText")),
      complianceJson: {
        complianceOfficer: String(formData.get("complianceOfficer")),
        piiHandling: String(formData.get("piiHandling")),
        consentControls: String(formData.get("consentControls"))
      },
      teamJson: {
        lead: String(formData.get("teamLead")),
        credentials: String(formData.get("teamCredentials"))
      },
      milestones: [
        {
          name: String(formData.get("milestone1Name")),
          amount: milestone1,
          dueDate: new Date(String(formData.get("milestone1Date"))).toISOString(),
          acceptanceCriteria: String(formData.get("milestone1Criteria"))
        },
        {
          name: String(formData.get("milestone2Name")),
          amount: milestone2,
          dueDate: new Date(String(formData.get("milestone2Date"))).toISOString(),
          acceptanceCriteria: String(formData.get("milestone2Criteria"))
        }
      ]
    };

    const response = await fetch(`/api/requests/${requestId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to submit bid");
      return;
    }

    router.push(`/org/${orgId}/bids`);
    router.refresh();
  };

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-textSecondary">Step {currentStep + 1} of 5</span>
          <span className="text-sm text-textMuted">{steps[currentStep]}</span>
        </div>
        <div className="h-1.5 rounded-full bg-altSurface">
          <div className="h-1.5 rounded-full bg-brand transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {sensitive ? (
        <WarningBanner
          title="Sensitive compliance mode"
          description="This request includes minors/PII flags. Include compliance officer and consent controls."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Total price (USD)</label>
          <input type="number" name="totalPrice" defaultValue={60000} required />
        </div>
        <div>
          <label className="field-label">Timeline start</label>
          <input type="date" name="timelineStart" required />
        </div>
      </div>
      <div>
        <label className="field-label">Timeline end</label>
        <input type="date" name="timelineEnd" required />
      </div>
      <div>
        <label className="field-label">Execution plan</label>
        <textarea name="planText" rows={4} required defaultValue="Recruit participants through verified school panels, run pilot, then execute full collection." />
      </div>

      <div className="panel p-4 md:p-5">
        <h3 className="mb-3 font-semibold">Milestones</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Milestone 1 name</label>
            <input name="milestone1Name" defaultValue="Pilot sample completion" required />
          </div>
          <div>
            <label className="field-label">Milestone 1 amount</label>
            <input name="milestone1Amount" type="number" defaultValue={30000} required />
          </div>
          <div>
            <label className="field-label">Milestone 1 due date</label>
            <input name="milestone1Date" type="date" required />
          </div>
          <div>
            <label className="field-label">Milestone 1 acceptance</label>
            <input name="milestone1Criteria" defaultValue="Pilot report approved" required />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Milestone 2 name</label>
            <input name="milestone2Name" defaultValue="Final dataset handover" required />
          </div>
          <div>
            <label className="field-label">Milestone 2 amount</label>
            <input name="milestone2Amount" type="number" defaultValue={30000} required />
          </div>
          <div>
            <label className="field-label">Milestone 2 due date</label>
            <input name="milestone2Date" type="date" required />
          </div>
          <div>
            <label className="field-label">Milestone 2 acceptance</label>
            <input name="milestone2Criteria" defaultValue="Buyer validation complete" required />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Compliance officer</label>
          <input name="complianceOfficer" required={sensitive} />
        </div>
        <div>
          <label className="field-label">PII handling method</label>
          <input name="piiHandling" defaultValue="Pseudonymization + encrypted transfer" />
        </div>
      </div>
      <div>
        <label className="field-label">Consent controls</label>
        <textarea name="consentControls" rows={3} defaultValue="Parental consent forms and dual-audit retention." />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Team lead</label>
          <input name="teamLead" required />
        </div>
        <div>
          <label className="field-label">Credentials and relevant work</label>
          <input name="teamCredentials" required />
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
            disabled={currentStep >= steps.length - 1}
          >
            Next Step
          </Button>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Submitting..." : "Submit Bid"}
          </Button>
        </div>
      </div>
    </form>
  );
};
