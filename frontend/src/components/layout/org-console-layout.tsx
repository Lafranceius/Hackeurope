import { ReactNode } from "react";

import { OrgSidebar } from "@/components/layout/org-sidebar";

export const OrgConsoleLayout = ({
  orgId,
  active,
  title,
  children
}: {
  orgId: string;
  active: string;
  title: string;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-bg">
    <div className="mx-auto flex w-full max-w-[1360px]">
      <OrgSidebar orgId={orgId} active={active} />
      <main className="w-full p-5 md:p-7">
        <h1 className="page-title mb-5">{title}</h1>
        {children}
      </main>
    </div>
  </div>
);
