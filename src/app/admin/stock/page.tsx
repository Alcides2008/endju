import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { SectionTabs, STOCK_TABS } from "@/features/admin/components/section-tabs";
import { NewMaterialButton } from "@/features/admin/components/stock-forms";
import { requireModule } from "@/features/admin/guard";
import { listMaterials } from "@/features/admin/materials";
import { listSuppliers } from "@/features/admin/purchasing";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { CATEGORY_LABELS, formatQty, stockValue } from "@/lib/domain/stock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stock" };

const FILTERS = [
  ["", "Ativos"],
  ["baixo", "Stock baixo"],
  ["inativos", "Descontinuados"],
] as const;

export default async function StockPage({ searchParams }: PageProps<"/admin/stock">) {
  const user = await requireModule("stock", "view", "/admin/stock");
  const filtro = (await searchParams).filtro;
  const filter = FILTERS.find(([key]) => key === filtro)?.[0] ?? "";
  const canEdit = can(user, "stock", "edit");
  const [materials, suppliers] = await Promise.all([listMaterials(), canEdit ? listSuppliers() : Promise.resolve([])]);
  const active = materials.filter((m) => m.active);
  const low = active.filter((m) => m.isLow);
  const rows = filter === "baixo" ? low : filter === "inativos" ? materials.filter((m) => !m.active) : active;

  return (
    <>
      <AccountHeading
        title="Stock"
        action={
          canEdit && (
            <NewMaterialButton suppliers={suppliers.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} />
          )
        }
      >
        {active.length} material(is) ativo(s) · {low.length} abaixo do mínimo · valor ao custo médio{" "}
        {formatKz(stockValue(active))}
      </AccountHeading>
      <SectionTabs tabs={STOCK_TABS} current="/admin/stock" />

      <nav aria-label="Filtrar materiais" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={key ? `/admin/stock?filtro=${key}` : "/admin/stock"}
            aria-current={filter === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              filter === key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {label}
            {key === "baixo" && low.length > 0 && <span className="ml-1.5 text-xs opacity-70">{low.length}</span>}
          </Link>
        ))}
        {can(user, "stock", "export") && (
          <span className="ml-auto flex gap-3 text-sm text-ink-3">
            Exportar:
            {(["csv", "xls", "pdf"] as const).map((f) => (
              <a key={f} href={`/api/export/stock?formato=${f}`} className="font-medium text-ink hover:underline">
                {f === "xls" ? "Excel" : f.toUpperCase()}
              </a>
            ))}
          </span>
        )}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title={materials.length === 0 ? "Ainda não há materiais." : "Nenhum material neste filtro."}>
          {materials.length === 0 &&
            "Junta o papel, a lona, o vinil e as tintas que a oficina usa, com o mínimo de cada um para receberes aviso."}
        </EmptyState>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Material</TH>
              <TH>Categoria</TH>
              <TH className="text-right">Em stock</TH>
              <TH className="text-right">Mínimo</TH>
              <TH className="text-right">Custo médio</TH>
              <TH>Local</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((m) => (
              <TR key={m.id}>
                <TD>
                  <Link href={`/admin/stock/${m.id}`} className="font-medium hover:underline">
                    {m.name}
                  </Link>
                  <span className="block font-mono text-xs text-ink-3">{m.sku}</span>
                </TD>
                <TD className="text-ink-2">{CATEGORY_LABELS[m.category]}</TD>
                <TD className="text-right whitespace-nowrap">
                  {m.isLow && m.active && (
                    <Badge tone="danger" className="mr-2">
                      Baixo
                    </Badge>
                  )}
                  <span className="font-mono text-xs">{formatQty(m.qty, m.unit)}</span>
                </TD>
                <TD className="text-right font-mono text-xs whitespace-nowrap text-ink-2">
                  {formatQty(m.minQty, m.unit)}
                </TD>
                <TD className="text-right font-mono text-xs whitespace-nowrap">
                  {m.avgCost ? formatKz(m.avgCost) : "—"}
                </TD>
                <TD className="text-ink-2">{m.location ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
