import type { Metadata } from "next";
import Link from "next/link";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { PurchaseOrderForm } from "@/features/admin/components/purchase-forms";
import { requireModule } from "@/features/admin/guard";
import { listMaterials } from "@/features/admin/materials";
import { listSuppliers } from "@/features/admin/purchasing";

export const metadata: Metadata = { title: "Nova encomenda de compra" };

export default async function NewPurchaseOrderPage({ searchParams }: PageProps<"/admin/compras/encomendas/nova">) {
  await requireModule("purchasing", "create", "/admin/compras/encomendas/nova");
  const { fornecedor } = await searchParams;
  const [suppliers, materials] = await Promise.all([listSuppliers(), listMaterials()]);
  const active = suppliers.filter((s) => s.active);
  const stock = materials.filter((m) => m.active);

  return (
    <>
      <AccountHeading back={{ href: "/admin/compras/encomendas", label: "Compras" }} title="Nova encomenda">
        Fica em rascunho até o Gestor aprovar. Os custos são por unidade do material, com IVA incluído.
      </AccountHeading>
      {active.length === 0 || stock.length === 0 ? (
        <EmptyState
          title={active.length === 0 ? "Primeiro, junta um fornecedor." : "Primeiro, junta os materiais no Stock."}
        >
          <Link
            href={active.length === 0 ? "/admin/compras/fornecedores" : "/admin/stock"}
            className="font-medium text-brand hover:underline"
          >
            {active.length === 0 ? "Ir para Fornecedores →" : "Ir para o Stock →"}
          </Link>
        </EmptyState>
      ) : (
        <PurchaseOrderForm
          suppliers={active.map((s) => ({ id: s.id, name: s.name }))}
          materials={stock.map((m) => ({
            id: m.id,
            name: m.name,
            unit: m.unit,
            avgCost: m.avgCost,
            supplierIds: m.supplierIds,
          }))}
          initial={
            typeof fornecedor === "string" && active.some((s) => s.id === fornecedor)
              ? { supplierId: fornecedor, lines: [], expectedAt: "", notes: "" }
              : undefined
          }
        />
      )}
    </>
  );
}
