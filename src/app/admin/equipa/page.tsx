import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading } from "@/features/account/components/account-heading";
import { InviteButton, MemberControls, RevokeInviteButton } from "@/features/admin/components/team-forms";
import { SectionTabs, TEAM_TABS } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listInvites, listTeam } from "@/features/admin/team";
import { formatDate, formatDateTime } from "@/lib/dates";
import { can, ROLE_LABELS } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Equipa" };

export default async function TeamPage() {
  const user = await requireModule("team", "view", "/admin/equipa");
  const [members, invites] = await Promise.all([listTeam(), listInvites()]);
  const canEdit = can(user, "team", "edit");

  return (
    <>
      <AccountHeading title="Equipa" action={can(user, "team", "create") && <InviteButton />}>
        {members.filter((m) => m.active).length} pessoa(s) com acesso ao painel. Mudar o papel ou desativar termina a
        sessão da pessoa; o Administrador não pode ficar sem substituto.
      </AccountHeading>
      <SectionTabs tabs={TEAM_TABS} current="/admin/equipa" />
      <div className="space-y-8">
        <Table>
          <THead>
            <TR>
              <TH>Pessoa</TH>
              <TH>Papel</TH>
              <TH>Último acesso</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {members.map((m) => (
              <TR key={m.uid}>
                <TD>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-ink-3">{m.email || m.phone}</p>
                </TD>
                <TD>
                  <Badge tone={m.active ? (m.role === "admin" ? "brand" : "info") : "neutral"}>
                    {m.active ? (ROLE_LABELS[m.role] ?? m.role) : "Desativado"}
                  </Badge>
                </TD>
                <TD className="whitespace-nowrap text-ink-2">{formatDateTime(m.lastLoginAt)}</TD>
                <TD>
                  {canEdit && <MemberControls uid={m.uid} role={m.role} active={m.active} self={m.uid === user.uid} />}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        {invites.length > 0 && (
          <section aria-labelledby="convites" className="space-y-3">
            <h2 id="convites" className="text-lg font-semibold">
              Convites por aceitar
            </h2>
            <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="font-medium">{i.email}</span> · {ROLE_LABELS[i.role]}
                    <span className="block text-xs text-ink-3">
                      {i.status === "expirado" ? "Expirou" : `Válido até ${formatDate(i.expiresAt)}`}
                      {i.invitedByName && ` · convidado por ${i.invitedByName}`}
                    </span>
                  </span>
                  {canEdit && <RevokeInviteButton id={i.id} />}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
