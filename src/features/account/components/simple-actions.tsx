"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { respondQuote } from "../actions";

/** Aceitar ou recusar a proposta da Endju. */
export function QuoteResponse({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const respond = (accept: boolean) =>
    start(async () => {
      const result = await respondQuote(quoteId, accept);
      if (!result.ok) return void toast.error(result.message);
      toast.success(accept ? "Proposta aceite. Vamos preparar o pedido." : "Proposta recusada.");
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button loading={pending} onClick={() => respond(true)}>
        Aceitar proposta
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => respond(false)}>
        Recusar
      </Button>
    </div>
  );
}
