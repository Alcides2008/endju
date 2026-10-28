import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import {
  ApprovePurchaseButton,
  CancelPurchaseButton,
  PaySupplierForm,
  PurchaseOrderForm,
  ReceiveForm,
} from "@/features/admin/components/purchase-forms";
import { requireModule } from "@/features/admin/guard";
import { listMaterials } from "@/features/admin/materials";
import { getPurchaseOrder, listSuppliers } from "@/features/admin/purchasing";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";
import { formatQty, PAYABLE_LABELS, PO_STATUS_META } from "@/lib/domain/stock";

export const metadata: Metadata = { title: "Encomenda de compra" };

export default async function PurchaseOrderPage({ params }: PageProps<"/admin/compras/encomendas/[id]">) {
  const user = await requireModule("purchasing", "view", "/admin/compras/encomendas");
  const [po, materials] = await Promise.all([getPurchaseOrder((await params).id), listMaterials()]);
  if (!po) notFound();
  const units = new Map(materials.map((m) => [m.id, m.unit]));
  const draft = po.status === "rascunho";
  const awaiting = po.status === "enviada" || po.status === "parcial";
  const canEdit = can(user, "purchasing", "edit");
  const canApprove = can(user, "purchasing", "approve") && user.role !== "financeiro";
  const canReceive = canEdit || can(user, "stock", "create");
  const canPay = can(user, "purchasing", "approve") && (user.role === "admin" || user.role === "financeiro");
  const due = po.totals.total - po.payable.paid;
  const suppliers = draft && canEdit ? await listSuppliers() : [];

  return (
    <div className="space-y-8">
      <AccountHeading
        back={{ href: "/admin/compras/encomendas", label: "Compras" }}
        title={<span className="font-mono">{po.number}</span>}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={PO_STATUS_META[po.status].tone}>{PO_STATUS_META[po.status].label}</Badge>
            {draft && canApprove && <ApprovePurchaseButton id={po.id} />}
            {(draft || po.status === "enviada") && canEdit && po.payable.paid === 0 && (
              <CancelPurchaseButton id={po.id} />
            )}
          </div>
        }
      >
        <Link href={`/admin/compras/fornecedores/${po.supplierId}`} className="font-medium hover:underline">
          {po.supplierName}
        </Link>{" "}
        · criada a {formatDateTime(po.createdAt)}
        {po.approvedAt && ` · aprovada a ${formatDateTime(po.approvedAt)}`}
        {po.expectedAt && ` · entrega prevista ${formatDate(po.expectedAt)}`}
        {po.cancelReason && ` · cancelada: ${po.cancelReason}`}
      </AccountHeading>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {draft && canEdit ? (
            <PurchaseOrderForm
              id={po.id}
              suppliers={suppliers
                .filter((s) => s.active || s.id === po.supplierId)
                .map((s) => ({ id: s.id, name: s.name }))}
              materials={materials
                .filter((m) => m.active || po.lines.some((l) => l.materialId === m.id))
                .map((m) => ({ id: m.id, name: m.name, unit: m.unit, avgCost: m.avgCost, supplierIds: m.supplierIds }))}
              initial={{
                supplierId: po.supplierId,
                lines: po.lines,
                expectedAt: po.expectedAt ? po.expectedAt.toISOString().slice(0, 10) : "",
                notes: po.notes ?? "",
              }}
            />
          ) : (
            <section aria-labelledby="linhas" className="space-y-3">
              <h2 id="linhas" className="text-lg font-semibold">
                Linhas
              </h2>
              <ul className="divide-y divide-line rounded-sm border border-line bg-card text-sm">
                {po.lines.map((line) => {
                  const unit = units.get(line.materialId);
                  const qty = (n: number) => (unit ? formatQty(n, unit) : String(n));
                  return (
                    <li key={line.materialId} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div>
                        <Link href={`/admin/stock/${line.materialId}`} className="font-medium hover:underline">
                          {line.description}
                        </Link>
                        <p className="text-xs text-ink-3">
                          {qty(line.qty)} × {formatKz(line.unitCost)}
                          {po.status !== "cancelada" && ` · recebido ${qty(line.receivedQty)}`}
                        </p>
                      </div>
                      <span className="font-mono text-xs">{formatKz(Math.round(line.qty * line.unitCost))}</span>
                    </li>
                  );
                })}
              </ul>
              {po.notes && <p className="text-sm whitespace-pre-line text-ink-2">Notas: {po.notes}</p>}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="space-y-1.5 rounded-sm border border-line bg-card p-4 text-sm text-ink-2">
            <h2 className="mb-2 font-semibold text-ink">Valores</h2>
            <p className="flex justify-between">
              <span>Sem IVA</span>
              <span className="font-mono text-xs">{formatKz(po.totals.subtotal)}</span>
            </p>
            <p className="flex justify-between">
              <span>IVA (14 %)</span>
              <span className="font-mono text-xs">{formatKz(po.totals.tax)}</span>
            </p>
            <p className="flex justify-between font-semibold text-ink">
              <span>Total</span>
              <span className="font-mono text-xs">{formatKz(po.totals.total)}</span>
            </p>
            {!draft && po.status !== "cancelada" && (
              <p className="flex justify-between border-t border-line pt-1.5">
                <span>
                  {PAYABLE_LABELS[po.payable.status]}
                  {po.payable.status !== "pago" && po.payable.dueAt && ` · até ${formatDate(po.payable.dueAt)}`}
                </span>
                <span className="font-mono text-xs">{formatKz(po.payable.paid)}</span>
              </p>
            )}
          </section>

          {awaiting && canReceive && (
            <section className="space-y-3 rounded-sm border border-line bg-card p-4">
              <h2 className="text-sm font-semibold">O que chegou</h2>
              {/* key: depois de cada receção o formulário volta a propor o que ainda falta */}
              <ReceiveForm
                key={po.lines.map((l) => l.receivedQty).join()}
                id={po.id}
                lines={po.lines.map((l) => ({ ...l, unit: units.get(l.materialId) }))}
              />
            </section>
          )}

          {!draft && po.status !== "cancelada" && canPay && due > 0 && (
            <section className="space-y-3 rounded-sm border border-line bg-card p-4">
              <h2 className="text-sm font-semibold">Pagar ao fornecedor</h2>
              <PaySupplierForm key={due} id={po.id} due={due} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
