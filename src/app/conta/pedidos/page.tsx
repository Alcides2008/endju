import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listMyOrders } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { ACTIVE_STATUSES } from "@/lib/domain/order-status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "ativos", label: "Em curso" },
  { key: "entregues", label: "Entregues" },
  { key: "cancelados", label: "Cancelados" },
] as const;

export default async function OrdersPage({ searchParams }: PageProps<"/conta/pedidos">) {
  const user = await requireCustomer("/conta/pedidos");
  const estado = (await searchParams).estado;
  const filter = FILTERS.find((f) => f.key === estado)?.key ?? "todos";

  const orders = (await listMyOrders(user.uid)).filter((order) =>
    filter === "ativos"
      ? ACTIVE_STATUSES.includes(order.status)
      : filter === "entregues"
        ? order.status === "entregue"
        : filter === "cancelados"
          ? order.status === "cancelado"
          : true,
  );

  return (
    <>
      <AccountHeading title="Pedidos">Todos os teus pedidos, do mais recente para o mais antigo.</AccountHeading>
      <nav aria-label="Filtrar pedidos" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todos" ? "/conta/pedidos" : `/conta/pedidos?estado=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm",
              filter === f.key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title="Nenhum pedido aqui."
          action={
            <Button asChild variant="outline">
              <Link href="/orcamento">Fazer um pedido</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/conta/pedidos/${order.number}`}
                className="grid gap-3 p-5 hover:bg-paper-2 md:grid-cols-[9rem_minmax(0,1fr)_auto_auto_8rem] md:items-center md:gap-6"
              >
                <span>
                  <span className="block font-mono text-sm">{order.number}</span>
                  <span className="text-xs text-ink-3">{formatDate(order.createdAt)}</span>
                </span>
                <span className="truncate text-sm text-ink-2">{order.itemsSummary.names.join(", ")}</span>
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
                <span className="font-medium md:text-right">{formatKz(order.totals.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
