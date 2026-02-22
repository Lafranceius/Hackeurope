import { AlertTriangle } from "lucide-react";
import { TrackedIconLink } from "@/components/ui/tracked-icon-link";

export const WarningBanner = ({
  title,
  description,
  docsHref = "/docs/compliance"
}: {
  title: string;
  description: string;
  docsHref?: string;
}) => (
  <div className="flex items-start gap-3 rounded-md border border-[#f3d8ba] bg-warning-soft p-3 text-warning">
    <TrackedIconLink
      href={docsHref}
      action="warning.compliance.icon"
      className="mt-0.5 rounded-sm p-0.5 hover:bg-white/60"
      ariaLabel="Open compliance guidance"
    >
      <AlertTriangle className="h-4 w-4" />
    </TrackedIconLink>
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  </div>
);
