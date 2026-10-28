import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { CancelSubscriberButton } from "@/features/admin/components/marketing-forms";
import { MARKETING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listSubscribers } from "@/features/admin/marketing";
import { formatDate } from "@/lib/dates";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Newsletter" };

const STATUS = {
  confirmado: { label: "Confirmado", tone: "success" },
  pendente: { label: "Por confirmar", tone: "warning" },
  cancelado: { label: "Cancelado", tone: "neutral" },
} as const;

export default async function NewsletterAdminPage() {
  const user = await requireModule("marketing", "view", "/admin/marketing/newsletter");
  const subscribers = await listSubscribers();
  const confirmed = subscribers.filter((s) => s.status === "confirmado");
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const canEdit = can(user, "marketing", "edit");

  return (
    <>
      <AccountHeading title="Marketing">
        Inscrições pelo rodapé do site, com dupla confirmação: só os confirmados podem receber campanhas.{" "}
        {confirmed.length} confirmado(s) de {subscribers.length}.
      </AccountHeading>
      <SectionTabs tabs={MARKETING_TABS} current="/admin/marketing/newsletter" />
      {!emailReady && (
        <p className="mb-5 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink-2">
          O email ainda não está configurado (Resend): as inscrições ficam por confirmar, porque o email com o link de
          confirmação não sai. Com RESEND_API_KEY e EMAIL_FROM no .env.local, passam a receber o link.
        </p>
      )}
      {subscribers.length === 0 ? (
        <EmptyState title="Ainda não há inscrições." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Email</TH>
              <TH>Inscrição</TH>
              <TH>Estado</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {subscribers.map((s) => {
              const status = STATUS[s.status as keyof typeof STATUS] ?? STATUS.pendente;
              return (
                <TR key={s.id}>
                  <TD>
                    {s.email}
                    {s.name && <p className="text-xs text-ink-3">{s.name}</p>}
                  </TD>
                  <TD className="whitespace-nowrap text-ink-2">{formatDate(s.createdAt)}</TD>
                  <TD>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </TD>
                  <TD className="text-right">
                    {canEdit && s.status !== "cancelado" && <CancelSubscriberButton id={s.id} />}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
