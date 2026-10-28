import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { PURCHASING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listPurchaseOrders } from "@/features/admin/purchasing";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { PAYABLE_LABELS, PO_STATUS_META, PO_STATUSES, type PurchaseOrderStatus } from "@/lib/domain/stock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Encomendas de compra" };

export default async function PurchaseOrdersPage({ searchParams }: PageProps<"/admin/compras/encomendas">) {
  const user = await requireModule("purchasing", "view", "/admin/compras/encomendas");
  const estado = (await searchParams).estado;
  const status = PO_STATUSES.find((s) => s === estado);
  const all = await listPurchaseOrders();
  const rows = status ? all.filter((po) => po.status === status) : all.filter((po) => po.status !== "cancelada");
  const count = (s: PurchaseOrderStatus) => all.filter((po) => po.status === s).length;
  const owed = all
    .filter((po) => !["rascunho", "cancelada"].includes(po.status))
    .reduce((sum, po) => sum + po.totals.total - po.payable.paid, 0);
  const now = new Date();

  return (
    <>
      <AccountHeading
        title="Compras"
        action={
          can(user, "purchasing", "create") && (
            <Button asChild>
              <Link href="/admin/compras/encomendas/nova">Nova encomenda</Link>
            </Button>
          )
        }
      >
        {count("rascunho")} por aprovar · {count("enviada") + count("parcial")} à espera de material · {formatKz(owed)}{" "}
        por pagar a fornecedores
      </AccountHeading>
      <SectionTabs tabs={PURCHASING_TABS} current="/admin/compras/encomendas" />

      <nav aria-label="Filtrar encomendas" className="mb-5 flex flex-wrap gap-2">
        {[undefined, ...PO_STATUSES].map((s) => (
          <Link
            key={s ?? "todas"}
            href={s ? `/admin/compras/encomendas?estado=${s}` : "/admin/compras/encomendas"}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              status === s ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {s ? PO_STATUS_META[s].label : "Em curso"}
            {s && count(s) > 0 && <span className="ml-1.5 text-xs opacity-70">{count(s)}</span>}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title={all.length === 0 ? "Ainda não há encomendas de compra." : "Nenhuma encomenda neste estado."}>
          {all.length === 0 &&
            "Quando faltar material, faz aqui a encomenda ao fornecedor; ao receber, o stock entra sozinho."}
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Número</TH>
              <TH>Fornecedor</TH>
              <TH>Estado</TH>
              <TH className="text-right">Total</TH>
              <TH>Pagamento</TH>
              <TH>Prevista</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((po) => {
              const overdue =
                po.payable.status !== "pago" &&
                !!po.payable.dueAt &&
                po.payable.dueAt < now &&
                po.status !== "cancelada";
              return (
                <TR key={po.id}>
                  <TD>
                    <Link href={`/admin/compras/encomendas/${po.id}`} className="font-mono font-medium hover:underline">
                      {po.number}
                    </Link>
                  </TD>
                  <TD>{po.supplierName}</TD>
                  <TD>
                    <Badge tone={PO_STATUS_META[po.status].tone}>{PO_STATUS_META[po.status].label}</Badge>
                  </TD>
                  <TD className="text-right font-mono text-xs">{formatKz(po.totals.total)}</TD>
                  <TD className={cn("text-sm", overdue ? "font-medium text-danger" : "text-ink-2")}>
                    {po.status === "rascunho" || po.status === "cancelada"
                      ? "—"
                      : `${PAYABLE_LABELS[po.payable.status]}${po.payable.status !== "pago" && po.payable.dueAt ? ` · até ${formatDate(po.payable.dueAt)}` : ""}`}
                  </TD>
                  <TD className="text-ink-2">{formatDate(po.expectedAt)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
