import type { Metadata } from "next";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { SectionTabs, STOCK_TABS } from "@/features/admin/components/section-tabs";
import { InventoryForm } from "@/features/admin/components/stock-forms";
import { requireModule } from "@/features/admin/guard";
import { listMaterials } from "@/features/admin/materials";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Inventário" };

export default async function InventoryPage() {
  const user = await requireModule("stock", "view", "/admin/stock/inventario");
  const materials = (await listMaterials()).filter((m) => m.active);
  // Fechar o inventário gera ajustes: ação especial do Gestor (docs/03)
  const canClose = can(user, "stock", "approve");

  return (
    <>
      <AccountHeading title="Stock">
        Conta o que está na prateleira e escreve ao lado. Só os materiais preenchidos entram no fecho; os outros ficam
        como estão.
      </AccountHeading>
      <SectionTabs tabs={STOCK_TABS} current="/admin/stock/inventario" />
      {!canClose ? (
        <EmptyState title="Só o Gestor fecha inventários.">
          Se encontrares uma diferença, regista uma saída na ficha do material ou avisa o Gestor.
        </EmptyState>
      ) : materials.length === 0 ? (
        <EmptyState title="Ainda não há materiais para contar." />
      ) : (
        <InventoryForm
          materials={materials.map((m) => ({
            id: m.id,
            sku: m.sku,
            name: m.name,
            unit: m.unit,
            qty: m.qty,
            location: m.location,
          }))}
        />
      )}
    </>
  );
}
