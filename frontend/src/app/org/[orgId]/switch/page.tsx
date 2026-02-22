import { OrgSwitchForm } from "@/components/forms/org-switch-form";
import { TopNav } from "@/components/layout/top-nav";
import { requirePageSession } from "@/server/page-auth";

const SwitchOrgPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const user = await requirePageSession();
  const { orgId } = await params;

  return (
    <div>
      <TopNav />
      <main className="container-shell py-10">
        <h1 className="mb-5 text-[32px] leading-[40px] font-bold">Switch Organization</h1>
        <OrgSwitchForm
          currentOrgId={orgId}
          memberships={user.memberships.map((membership) => ({
            orgId: membership.orgId,
            orgName: membership.orgName,
            role: membership.role
          }))}
        />
      </main>
    </div>
  );
};

export default SwitchOrgPage;
