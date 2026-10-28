import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { EditMaterialForm, MovementForm } from "@/features/admin/components/stock-forms";
import { requireModule } from "@/features/admin/guard";
import { getMaterial } from "@/features/admin/materials";
import { listSuppliers } from "@/features/admin/purchasing";
import { formatDateTime } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { CATEGORY_LABELS, formatQty, MOVEMENT_LABELS } from "@/lib/domain/stock";

export const metadata: Metadata = { title: "Material" };

export default async function MaterialPage({ params }: PageProps<"/admin/stock/[id]">) {
  const user = await requireModule("stock", "view", "/admin/stock");
  const [material, suppliers] = await Promise.all([getMaterial((await params).id), listSuppliers()]);
  if (!material) notFound();
  const kinds = [
    ...(can(user, "stock", "create") ? (["saida"] as const) : []),
    ...(can(user, "stock", "edit") ? (["entrada"] as const) : []),
    ...(can(user, "stock", "approve") ? (["ajuste"] as const) : []),
  ];
  const supplierNames = suppliers.filter((s) => material.supplierIds.includes(s.id));

  return (
    <div className="space-y-8">
      <AccountHeading
        back={{ href: "/admin/stock", label: "Stock" }}
        title={material.name}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!material.active && <Badge>Descontinuado</Badge>}
            {material.isLow && material.active && <Badge tone="danger">Abaixo do mínimo</Badge>}
          </div>
        }
      >
        <span className="font-mono">{material.sku}</span> · {CATEGORY_LABELS[material.category]}
        {material.location && ` · ${material.location}`}
        {supplierNames.length > 0 && (
          <>
            {" "}
            · fornecido por{" "}
            {supplierNames.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <Link href={`/admin/compras/fornecedores/${s.id}`} className="hover:underline">
                  {s.name}
                </Link>
              </span>
            ))}
          </>
        )}
      </AccountHeading>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          ["Em stock", formatQty(material.qty, material.unit)],
          ["Mínimo", formatQty(material.minQty, material.unit)],
          ["Custo médio", material.avgCost ? formatKz(material.avgCost) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm border border-line bg-card p-4">
            <dt className="text-sm text-ink-3">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="movimentos" className="space-y-3">
          <h2 id="movimentos" className="text-lg font-semibold">
            Movimentos
          </h2>
          {material.movements.length === 0 ? (
            <p className="text-sm text-ink-2">Ainda sem movimentos.</p>
          ) : (
            <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
              {material.movements.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <p>
                      <span className="font-medium">{MOVEMENT_LABELS[m.type]}</span> · {m.reason}
                      {m.orderNumber && (
                        <Link
                          href={`/admin/pedidos/${m.orderNumber}`}
                          className="ml-1 font-mono text-xs hover:underline"
                        >
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
                    </p>
                    <p className="text-xs text-ink-3">
                      {m.byName} · {formatDateTime(m.at)}
                      {m.unitCost !== undefined && ` · ${formatKz(m.unitCost)} por unidade`}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs whitespace-nowrap">
                    <p className={m.qty < 0 ? "text-danger" : "text-success"}>
                      {m.qty > 0 ? "+" : ""}
                      {formatQty(m.qty, m.unit)}
                    </p>
                    <p className="text-ink-3">saldo {formatQty(m.balanceAfter, m.unit)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          {kinds.length > 0 && material.active && (
            <section className="space-y-4 rounded-sm border border-line bg-card p-4">
              <h2 className="text-sm font-semibold">Registar movimento</h2>
              <MovementForm
                materialId={material.id}
                unit={material.unit}
                qty={material.qty}
                avgCost={material.avgCost}
                kinds={kinds}
              />
            </section>
          )}
          {can(user, "stock", "edit") && (
            <details className="rounded-sm border border-line bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">Editar material</summary>
              <div className="mt-4">
                <EditMaterialForm
                  id={material.id}
                  defaults={{
                    sku: material.sku,
                    name: material.name,
                    category: material.category,
                    unit: material.unit,
                    minQty: material.minQty,
                    location: material.location ?? "",
                    supplierIds: material.supplierIds,
                    active: material.active,
                  }}
                  suppliers={suppliers.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
                />
              </div>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
