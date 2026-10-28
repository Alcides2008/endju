import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { CampaignButton } from "@/features/admin/components/marketing-forms";
import { MARKETING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listCampaigns, listCoupons } from "@/features/admin/marketing";
import { dayKey } from "@/lib/domain/finance";
import { campaignStatus, CHANNEL_LABELS } from "@/lib/domain/marketing";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Campanhas" };

const STATUS = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  agendada: { label: "Agendada", tone: "info" },
  ativa: { label: "Ativa", tone: "success" },
  terminada: { label: "Terminada", tone: "neutral" },
} as const;

const date = (day: string) => day.split("-").reverse().join("/");

export default async function CampaignsPage() {
  const user = await requireModule("marketing", "view", "/admin/marketing/campanhas");
  const [campaigns, coupons] = await Promise.all([listCampaigns(), listCoupons()]);
  const codes = coupons.map((c) => c.code);
  const today = dayKey(new Date());
  const canEdit = can(user, "marketing", "create");

  return (
    <>
      <AccountHeading title="Marketing" action={canEdit && <CampaignButton coupons={codes} />}>
        Cada campanha mede-se pelos pedidos feitos com os cupões dela: quantos, quanto faturaram e quanto se deu de
        desconto.
      </AccountHeading>
      <SectionTabs tabs={MARKETING_TABS} current="/admin/marketing/campanhas" />
      {campaigns.length === 0 ? (
        <EmptyState title="Ainda não há campanhas." action={canEdit && <CampaignButton coupons={codes} />}>
          Ex.: «Regresso às aulas» no WhatsApp com o cupão ESCOLA26, para saberes quantas encomendas trouxe.
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Campanha</TH>
              <TH>Datas</TH>
              <TH className="text-right">Pedidos</TH>
              <TH className="text-right">Faturado</TH>
              <TH className="text-right">Desconto</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {campaigns.map((c) => {
              const status = STATUS[campaignStatus(c, today)];
              return (
                <TR key={c.id}>
                  <TD>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-ink-3">
                      {CHANNEL_LABELS[c.channel]}
                      {c.couponCodes.length > 0 && ` · ${c.couponCodes.join(", ")}`}
                      {c.budget > 0 && ` · orçamento ${formatKz(c.budget)}`}
                    </p>
                    <Badge tone={status.tone} className="mt-1">
                      {status.label}
                    </Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-2">
                    {date(c.startsAt)}
                    {c.endsAt && ` → ${date(c.endsAt)}`}
                  </TD>
                  <TD className="text-right">{c.results.orders}</TD>
                  <TD className="text-right whitespace-nowrap">{formatKz(c.results.revenue)}</TD>
                  <TD className="text-right whitespace-nowrap text-ink-2">{formatKz(c.results.discount)}</TD>
                  <TD className="text-right">{canEdit && <CampaignButton campaign={c} coupons={codes} />}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
