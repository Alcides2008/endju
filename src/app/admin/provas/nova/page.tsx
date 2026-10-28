import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { ProofUploadForm } from "@/features/admin/components/proof-upload";
import { requireModule } from "@/features/admin/guard";
import { getAdminOrder } from "@/features/admin/orders";

export const metadata: Metadata = { title: "Enviar prova" };

export default async function NewProofPage({ searchParams }: PageProps<"/admin/provas/nova">) {
  await requireModule("proofs", "create", "/admin/provas");
  const params = await searchParams;
  const order = typeof params.pedido === "string" ? await getAdminOrder(params.pedido) : null;
  const item = order?.items.find((i) => i.id === params.item);
  if (!order || !item) notFound();
  const sent = order.proofs.filter((p) => p.itemId === item.id).length;
  const spec = [
    item.size && `${item.size.widthCm} × ${item.size.heightCm} cm`,
    ...item.options.map((o) => o.choiceLabel),
  ].filter(Boolean);

  return (
    <>
      <AccountHeading
        back={{ href: `/admin/pedidos/${order.number}`, label: `Pedido ${order.number}` }}
        title={`Prova v${sent + 1}`}
      >
        {item.name} × {item.quantity}
        {spec.length > 0 && ` · ${spec.join(" · ")}`}
        {item.notes && ` · Nota do cliente: ${item.notes}`}
      </AccountHeading>
      <ProofUploadForm orderId={order.id} itemId={item.id} />
    </>
  );
}
