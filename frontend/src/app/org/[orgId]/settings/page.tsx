import { TopNav } from "@/components/layout/top-nav";
import { OrgConsoleLayout } from "@/components/layout/org-console-layout";
import { InviteMemberAction } from "@/components/forms/org-settings-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireOrgInSession } from "@/server/page-auth";

const SettingsPage = async ({ params }: { params: Promise<{ orgId: string }> }) => {
  const { orgId } = await params;
  await requireOrgInSession(orgId);

  const [org, members] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId } }),
    prisma.orgMember.findMany({ where: { orgId }, include: { user: true }, orderBy: { createdAt: "asc" } })
  ]);

  if (!org) {
    return <div>Organization not found</div>;
  }

  return (
    <div>
      <TopNav />
      <OrgConsoleLayout orgId={orgId} active="settings" title="Organization Settings">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-xl font-semibold">Org profile</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="field-label">Organization name</label>
                <input defaultValue={org.name} readOnly />
              </div>
              <div>
                <label className="field-label">Org type</label>
                <input defaultValue={org.type} readOnly />
              </div>
              <div>
                <label className="field-label">Billing email</label>
                <input defaultValue={org.billingEmail} readOnly />
              </div>
            </div>
          </Card>

          <InviteMemberAction orgId={orgId} />
        </div>

        <Card className="mt-5 p-4">
          <h2 className="mb-3 text-xl font-semibold">Team Members</h2>
          <div className="data-table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId}>
                    <td className="px-2 py-2">{member.user.name}</td>
                    <td className="px-2 py-2">{member.user.email}</td>
                    <td className="px-2 py-2">
                      <Badge>{member.role}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </OrgConsoleLayout>
    </div>
  );
};

export default SettingsPage;
