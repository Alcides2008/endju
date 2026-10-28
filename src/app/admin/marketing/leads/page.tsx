import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { LeadEditor, NewLeadButton } from "@/features/admin/components/marketing-forms";
import { MARKETING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listLeads } from "@/features/admin/marketing";
import { listStaff } from "@/features/admin/orders";
import { formatDateTime } from "@/lib/dates";
import { LEAD_SOURCE_LABELS, LEAD_STAGE_META, LEAD_STAGES, type LeadStage } from "@/lib/domain/marketing";
import { can } from "@/lib/domain/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };

/** Ligação de WhatsApp para o número do lead (wa.me com o número sem o "+"). */
const waTo = (phone: string, name: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${name.split(" ")[0]}, fala a Endju.`)}`;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/marketing/leads">) {
  const user = await requireModule("marketing", "view", "/admin/marketing/leads");
  const fase = (await searchParams).fase;
  const stage = LEAD_STAGES.includes(fase as LeadStage) ? (fase as LeadStage) : null;
  const [leads, staff] = await Promise.all([listLeads(), listStaff()]);
  const open = leads.filter((l) => l.stage !== "ganho" && l.stage !== "perdido");
  const rows = stage ? leads.filter((l) => l.stage === stage) : open;
  const canEdit = can(user, "marketing", "edit");
  const names = new Map(staff.map((s) => [s.uid, s.name]));

  return (
    <>
      <AccountHeading title="Marketing" action={canEdit && <NewLeadButton />}>
        Contactos que ainda não são clientes: do formulário de contacto, dos pedidos de orçamento e os que chegam por
        WhatsApp, telefone ou na loja. {open.length} em aberto.
      </AccountHeading>
      <SectionTabs tabs={MARKETING_TABS} current="/admin/marketing/leads" />
      <nav aria-label="Fases do funil" className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/marketing/leads"
          aria-current={!stage ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm",
            !stage ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
          )}
        >
          Em aberto · {open.length}
        </Link>
        {LEAD_STAGES.map((s) => (
          <Link
            key={s}
            href={`/admin/marketing/leads?fase=${s}`}
            aria-current={stage === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              stage === s ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {LEAD_STAGE_META[s].label} · {leads.filter((l) => l.stage === s).length}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title={stage ? "Nenhum lead nesta fase." : "Nenhum lead em aberto."} />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((lead) => (
            <li key={lead.id} className="space-y-4 rounded-sm border border-line bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {lead.name}
                    {lead.company && <span className="font-normal text-ink-2"> · {lead.company}</span>}
                  </p>
                  <p className="text-xs text-ink-3">
                    {LEAD_SOURCE_LABELS[lead.source] ?? lead.source} · {formatDateTime(lead.createdAt)}
                    {lead.assigneeId && ` · ${names.get(lead.assigneeId) ?? "Equipa"}`}
                  </p>
                </div>
                <Badge tone={LEAD_STAGE_META[lead.stage].tone}>{LEAD_STAGE_META[lead.stage].label}</Badge>
              </div>
              {lead.interest && <p className="text-sm font-medium">{lead.interest}</p>}
              {lead.message && <p className="line-clamp-4 text-sm whitespace-pre-line text-ink-2">{lead.message}</p>}
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {lead.phone && (
                  <a
                    href={waTo(lead.phone, lead.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    WhatsApp {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="underline underline-offset-4">
                    {lead.email}
                  </a>
                )}
                {lead.quoteId && (
                  <Link href={`/admin/orcamentos/${lead.quoteId}`} className="underline underline-offset-4">
                    Ver o orçamento
                  </Link>
                )}
              </p>
              {lead.notes.length > 0 && (
                <ol className="space-y-1 border-l-2 border-line pl-3 text-xs text-ink-2">
                  {lead.notes.slice(-3).map((n, i) => (
                    <li key={i}>
                      <span className="text-ink-3">
                        {n.by} · {formatDateTime(new Date(n.at))}:
                      </span>{" "}
                      {n.text}
                    </li>
                  ))}
                </ol>
              )}
              {lead.stage === "perdido" && lead.lostReason && (
                <p className="text-xs text-ink-3">Perdido: {lead.lostReason}</p>
              )}
              {canEdit && (
                <details className="border-t border-line pt-3">
                  <summary className="cursor-pointer text-sm font-medium">Atualizar</summary>
                  <div className="pt-3">
                    <LeadEditor lead={lead} staff={staff.map((s) => ({ id: s.uid, name: s.name }))} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
