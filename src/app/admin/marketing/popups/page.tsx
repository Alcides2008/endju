import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { PopupButton } from "@/features/admin/components/marketing-forms";
import { MARKETING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listPopups } from "@/features/admin/marketing";
import { POPUP_TRIGGER_LABELS } from "@/lib/domain/marketing";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Pop-ups" };

export default async function PopupsPage() {
  const user = await requireModule("marketing", "view", "/admin/marketing/popups");
  const popups = await listPopups();
  const canEdit = can(user, "marketing", "create");

  return (
    <>
      <AccountHeading title="Marketing" action={canEdit && <PopupButton />}>
        Avisos que abrem por cima do site, com cupão ou botão. Não aparecem no carrinho, no checkout nem no login.
      </AccountHeading>
      <SectionTabs tabs={MARKETING_TABS} current="/admin/marketing/popups" />
      {popups.length === 0 ? (
        <EmptyState title="Ainda não há pop-ups." action={canEdit && <PopupButton />} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Pop-up</TH>
              <TH>Quando</TH>
              <TH className="text-right">Vistos</TH>
              <TH className="text-right">Cliques</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {popups.map((p) => (
              <TR key={p.id}>
                <TD>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-ink-3">
                    {p.title}
                    {p.couponCode && ` · ${p.couponCode}`}
                  </p>
                  <Badge tone={p.active ? "success" : "neutral"} className="mt-1">
                    {p.active ? "No site" : "Desligado"}
                  </Badge>
                </TD>
                <TD className="text-ink-2">
                  {POPUP_TRIGGER_LABELS[p.trigger]}
                  <p className="text-xs text-ink-3">
                    {p.paths.length ? p.paths.join(", ") : "todas as páginas"} · de {p.frequencyDays} em{" "}
                    {p.frequencyDays} dias
                  </p>
                </TD>
                <TD className="text-right">{p.views}</TD>
                <TD className="text-right">
                  {p.conversions}
                  {p.views > 0 && (
                    <span className="block text-xs text-ink-3">{Math.round((p.conversions / p.views) * 100)} %</span>
                  )}
                </TD>
                <TD className="text-right">{canEdit && <PopupButton popup={p} />}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
