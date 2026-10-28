import type { Metadata } from "next";
import Link from "next/link";
import type { Timestamp } from "firebase-admin/firestore";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { COMMUNICATION_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { formatDateTime } from "@/lib/dates";
import { TEMPLATE_LABELS, type TemplateKey } from "@/lib/domain/messages";
import { adminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Histórico de envios" };

const STATUS = {
  enviado: { label: "Enviado", tone: "success" },
  falhado: { label: "Não saiu", tone: "danger" },
  aberto: { label: "Aberto no WhatsApp", tone: "info" },
} as const;

export default async function DeliveriesPage() {
  await requireModule("messaging", "view", "/admin/comunicacao/historico");
  // shortcut: os últimos 200 envios; com mais volume, paginar por data
  const snap = await adminDb().collection("deliveries").orderBy("at", "desc").limit(200).get();
  const rows = snap.docs.map((d) => ({
    id: d.id,
    channel: d.get("channel") as "email" | "whatsapp",
    templateId: d.get("templateId") as TemplateKey,
    to: d.get("to") as string,
    status: d.get("status") as keyof typeof STATUS,
    orderNumber: (d.get("orderNumber") as string) ?? "",
    byName: (d.get("byName") as string) ?? "",
    error: (d.get("error") as string) ?? "",
    at: (d.get("at") as Timestamp).toDate(),
  }));
  return (
    <>
      <AccountHeading title="Comunicação">
        Cada email e cada mensagem de WhatsApp preparada no painel. No WhatsApp fica «aberto»: o envio confirma-se no
        telemóvel de quem o abriu.
      </AccountHeading>
      <SectionTabs tabs={COMMUNICATION_TABS} current="/admin/comunicacao/historico" />
      {rows.length === 0 ? (
        <EmptyState title="Ainda não há envios." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Quando</TH>
              <TH>Mensagem</TH>
              <TH>Para</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="whitespace-nowrap text-ink-2">{formatDateTime(r.at)}</TD>
                <TD>
                  {TEMPLATE_LABELS[r.templateId] ?? r.templateId}
                  <p className="text-xs text-ink-3">
                    {r.channel === "email" ? "Email" : "WhatsApp"}
                    {r.orderNumber && (
                      <>
                        {" · "}
                        <Link href={`/admin/pedidos/${r.orderNumber}`} className="font-mono hover:underline">
                          {r.orderNumber}
                        </Link>
                      </>
                    )}
                    {r.byName && ` · ${r.byName}`}
                  </p>
                </TD>
                <TD className="text-ink-2">{r.to}</TD>
                <TD>
                  <Badge tone={STATUS[r.status]?.tone ?? "neutral"}>{STATUS[r.status]?.label ?? r.status}</Badge>
                  {r.error && <p className="mt-1 text-xs text-ink-3">{r.error}</p>}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
