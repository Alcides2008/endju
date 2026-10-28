"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { Check, CircleX } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { ORDER_STATUS_META, TIMELINE, type OrderStatus, type PaymentStatus } from "@/lib/domain/order-status";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

type Event = { id: string; message: string; at: Date | null };
type LiveState = { status: OrderStatus; paymentStatus: PaymentStatus; awaitingDeposit: boolean; events: Event[] };

/**
 * Estado e linha do tempo do pedido em tempo real (onSnapshot). As regras do Firestore só deixam ler o próprio
 * pedido e os eventos visíveis ao cliente; se a leitura falhar, fica o estado que veio do servidor.
 */
export function OrderLive({ orderId, initial }: { orderId: string; initial: LiveState }) {
  const [live, setLive] = useState(initial);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const db = getClientDb();
    const onError = (error: Error) => console.warn("[pedido] sem tempo real:", error.message);
    const stopOrder = onSnapshot(
      doc(db, "orders", orderId),
      (snap) => {
        if (!snap.exists()) return;
        setLive((s) => ({
          ...s,
          status: snap.get("status"),
          paymentStatus: snap.get("paymentStatus"),
          awaitingDeposit: Boolean(snap.get("awaitingDeposit")),
        }));
      },
      onError,
    );
    const stopEvents = onSnapshot(
      query(collection(db, "orders", orderId, "events"), where("visibility", "==", "cliente")),
      (snap) => {
        const events = snap.docs
          .map((d) => ({
            id: d.id,
            message: d.get("message") as string,
            at: (d.get("at") as Timestamp | null)?.toDate() ?? null,
          }))
          .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
        setLive((s) => ({ ...s, events }));
      },
      onError,
    );
    return () => {
      stopOrder();
      stopEvents();
    };
  }, [orderId]);

  const reached = TIMELINE.indexOf(live.status);
  return (
    <section aria-labelledby="estado" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="estado" className="sr-only">
          Estado do pedido
        </h2>
        <OrderStatusBadge status={live.status} />
        <PaymentStatusBadge status={live.paymentStatus} />
        {live.awaitingDeposit && <span className="text-sm text-warning">Provas aprovadas · a aguardar o sinal</span>}
      </div>

      {live.status === "cancelado" ? (
        <p className="flex items-center gap-2 rounded-sm border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <CircleX className="size-4" aria-hidden /> Este pedido foi cancelado.
        </p>
      ) : (
        <ol className="grid grid-cols-3 gap-y-6 sm:grid-cols-6" aria-label="Etapas do pedido">
          {TIMELINE.map((status, i) => {
            const done = i < reached || live.status === "entregue";
            const current = i === reached && live.status !== "entregue";
            return (
              <li
                key={status}
                className="relative flex flex-col items-center gap-2 text-center"
                aria-current={current ? "step" : undefined}
              >
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2",
                      i <= reached ? "bg-ink" : "bg-line",
                      i % 3 === 0 && "max-sm:hidden", // no telemóvel são 2 linhas de 3: a 2.ª começa sem ligação
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full border-2 text-xs font-semibold",
                    done
                      ? "border-ink bg-ink text-paper"
                      : current
                        ? "border-brand bg-paper text-brand"
                        : "border-line bg-paper text-ink-3",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className={cn("text-xs", current ? "font-semibold text-ink" : "text-ink-3")}>
                  {ORDER_STATUS_META[status].label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <h3 className="mb-3 eyebrow text-ink-3">Histórico</h3>
        <ol className="space-y-3 border-l border-line pl-5">
          {[...live.events].reverse().map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-paper bg-ink"
              />
              <p className="text-sm font-medium">{event.message}</p>
              <p className="text-xs text-ink-3">{formatDateTime(event.at)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
