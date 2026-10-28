import type { Metadata } from "next";
import Link from "next/link";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { SectionTabs, STOCK_TABS } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listMovements } from "@/features/admin/materials";
import { formatDateTime } from "@/lib/dates";
import { formatQty, MOVEMENT_LABELS, MOVEMENT_TYPES } from "@/lib/domain/stock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Movimentos de stock" };

export default async function MovementsPage({ searchParams }: PageProps<"/admin/stock/movimentos">) {
  await requireModule("stock", "view", "/admin/stock/movimentos");
  const tipo = (await searchParams).tipo;
  const type = MOVEMENT_TYPES.find((t) => t === tipo);
  const all = await listMovements();
  const rows = type ? all.filter((m) => m.type === type) : all;

  return (
    <>
      <AccountHeading title="Stock">Os {all.length} movimentos mais recentes, de todos os materiais.</AccountHeading>
      <SectionTabs tabs={STOCK_TABS} current="/admin/stock/movimentos" />

      <nav aria-label="Filtrar movimentos" className="mb-5 flex flex-wrap gap-2">
        {[undefined, ...MOVEMENT_TYPES].map((t) => (
          <Link
            key={t ?? "todos"}
            href={t ? `/admin/stock/movimentos?tipo=${t}` : "/admin/stock/movimentos"}
            aria-current={type === t ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              type === t ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {t ? MOVEMENT_LABELS[t] : "Todos"}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="Sem movimentos." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Quando</TH>
              <TH>Material</TH>
              <TH>Tipo</TH>
              <TH>Motivo</TH>
              <TH className="text-right">Quantidade</TH>
              <TH className="text-right">Saldo</TH>
              <TH>Quem</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((m) => (
              <TR key={m.id}>
                <TD className="whitespace-nowrap text-ink-2">{formatDateTime(m.at)}</TD>
                <TD>
                  <Link href={`/admin/stock/${m.materialId}`} className="hover:underline">
                    {m.materialName}
                  </Link>
                </TD>
                <TD>{MOVEMENT_LABELS[m.type]}</TD>
                <TD className="max-w-72 text-ink-2">
                  {m.reason}
                  {m.orderNumber && (
                    <Link href={`/admin/pedidos/${m.orderNumber}`} className="ml-1 font-mono text-xs hover:underline">
                      {m.orderNumber}
                    </Link>
                  )}
                  {m.purchaseOrderId && (
                    <Link
                      href={`/admin/compras/encomendas/${m.purchaseOrderId}`}
                      className="ml-1 font-mono text-xs hover:underline"
                    >
                      {m.purchaseOrderNumber}
                    </Link>
                  )}
                </TD>
                <TD
                  className={cn(
                    "text-right font-mono text-xs whitespace-nowrap",
                    m.qty < 0 ? "text-danger" : "text-success",
                  )}
                >
                  {m.qty > 0 ? "+" : ""}
                  {formatQty(m.qty, m.unit)}
                </TD>
                <TD className="text-right font-mono text-xs whitespace-nowrap">{formatQty(m.balanceAfter, m.unit)}</TD>
                <TD className="text-ink-2">{m.byName}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
