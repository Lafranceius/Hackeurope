import { BarChart3, BriefcaseBusiness, Building2, CreditCard, FileText, Gavel, Plus, Settings } from "lucide-react";
import { TrackedIconLink } from "@/components/ui/tracked-icon-link";

const navItems = [
  { href: "publishing", label: "Publishing", icon: FileText },
  { href: "purchases", label: "Purchases", icon: CreditCard },
  { href: "requests", label: "Buyer Requests", icon: Gavel },
  { href: "bids", label: "Supplier Bids", icon: BriefcaseBusiness },
  { href: "analytics", label: "Analytics", icon: BarChart3 },
  { href: "billing", label: "Billing", icon: Building2 },
  { href: "settings", label: "Settings", icon: Settings }
];

export const OrgSidebar = ({ orgId, active }: { orgId: string; active: string }) => (
  <aside className="w-full max-w-[252px] border-r border-border bg-surface px-3 py-4">
    <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.08em] text-textMuted">Org Console</div>
    <TrackedIconLink
      href="/datasets/new"
      action="org.sidebar.publish_data"
      metadata={{ orgId }}
      className="mb-3 flex items-center justify-center gap-2 rounded-md border border-border bg-mutedSurface px-3 py-2 text-sm font-medium text-textPrimary hover:border-borderStrong hover:bg-white"
      ariaLabel="Publish data"
    >
      <Plus className="h-4 w-4" />
      Publish Data
    </TrackedIconLink>
    <div className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const selected = item.href === active;
        return (
          <TrackedIconLink
            key={item.href}
            href={`/org/${orgId}/${item.href}`}
            action="org.sidebar.icon"
            metadata={{ orgId, section: item.href }}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              selected
                ? "border border-[#cfdcff] bg-brandSoft font-medium text-brand"
                : "border border-transparent text-textSecondary hover:bg-mutedSurface"
            }`}
            ariaLabel={`Open ${item.label}`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </TrackedIconLink>
        );
      })}
    </div>
  </aside>
);
