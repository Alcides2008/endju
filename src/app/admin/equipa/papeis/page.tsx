import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { RoleMatrixEditor } from "@/features/admin/components/team-forms";
import { SectionTabs, TEAM_TABS } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getRoleMatrices, type EditableRole } from "@/lib/auth/roles";
import { can, DEFAULTS, MODULE_LABELS, ROLE_LABELS } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Papéis e permissões" };

export default async function RolesPage() {
  const user = await requireModule("team", "view", "/admin/equipa/papeis");
  const matrices = await getRoleMatrices();
  const canEdit = can(user, "team", "edit");

  return (
    <>
      <AccountHeading title="Equipa">
        O que cada papel pode fazer em cada módulo. O Administrador pode tudo e não se edita. Gerir a equipa fica só com
        o Administrador.
      </AccountHeading>
      <SectionTabs tabs={TEAM_TABS} current="/admin/equipa/papeis" />
      <div className="space-y-6">
        {(Object.keys(DEFAULTS) as EditableRole[]).map((role) =>
          canEdit ? (
            <RoleMatrixEditor
              key={role + JSON.stringify(matrices[role])}
              role={role}
              matrix={matrices[role]}
              labels={MODULE_LABELS}
              customized={JSON.stringify(matrices[role]) !== JSON.stringify(DEFAULTS[role])}
            />
          ) : (
            <section key={role} className="rounded-sm border border-line bg-card p-5 text-sm">
              <h2 className="mb-2 font-semibold">{ROLE_LABELS[role]}</h2>
              <p className="text-ink-2">
                {Object.entries(matrices[role])
                  .map(([m, l]) => `${MODULE_LABELS[m as keyof typeof MODULE_LABELS]} (${l})`)
                  .join(" · ")}
              </p>
            </section>
          ),
        )}
      </div>
    </>
  );
}
