"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toaster";
import { cart } from "@/features/cart/store";
import { cancelOrder } from "../actions";

type ReorderItem = {
  productId: string;
  options: { group: string; choice: string }[];
  size?: { widthCm: number; heightCm: number };
  quantity: number;
  urgent: boolean;
  design: "cliente_envia" | "endju_cria";
  notes?: string;
};

/** "Repetir encomenda": volta a pôr no carrinho as mesmas configurações, com o preço atual do catálogo. */
export function ReorderButton({ items, catalog }: { items: ReorderItem[]; catalog: string[] }) {
  const router = useRouter();
  const repeat = () => {
    const available = items.filter((item) => catalog.includes(item.productId));
    for (const item of available) {
      cart.add({
        productSlug: item.productId,
        options: Object.fromEntries(item.options.map((o) => [o.group, o.choice])),
        size: item.size,
        quantity: item.quantity,
        urgent: false,
        design: item.design,
        artwork: null,
        notes: item.notes ?? "",
      });
    }
    if (available.length < items.length) toast.warning("Alguns produtos já não estão no catálogo e ficaram de fora.");
    router.push("/carrinho");
  };
  return (
    <Button variant="outline" onClick={repeat}>
      <RotateCcw aria-hidden /> Repetir encomenda
    </Button>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const confirm = () =>
    start(async () => {
      const result = await cancelOrder(orderId);
      if (result.ok) {
        setOpen(false);
        toast.success("Pedido cancelado.");
        router.refresh();
      } else toast.error(result.message);
    });
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="ghost">Cancelar pedido</Button>}
      title="Cancelar este pedido?"
      description="O pedido ainda não entrou em produção e não tem pagamentos. Depois de cancelado, não pode ser reaberto."
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Manter pedido
          </Button>
          <Button variant="danger" loading={pending} onClick={confirm}>
            Cancelar pedido
          </Button>
        </>
      }
    />
  );
}
