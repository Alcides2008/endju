import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listMyOrders, listMyProofs, listMyQuotes } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatWeekday } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { ACTIVE_STATUSES } from "@/lib/domain/order-status";

export default async function AccountPage() {
  const user = await requireCustomer("/conta");

  const [orders, proofs, quotes] = await Promise.all([
    listMyOrders(user.uid),
    listMyProofs(user.uid),
    listMyQuotes(user.uid),
  ]);
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const pendingProofs = proofs.filter((proof) => proof.status === "pendente");
  const pendingQuotes = quotes.filter((quote) => quote.status === "enviado");
  const due = active.reduce((sum, order) => sum + order.totals.due, 0);
  const firstName = user.name?.split(" ")[0];

  const stats = [
    { label: "Pedidos ativos", value: String(active.length), href: "/conta/pedidos" },
    {
      label: "Provas por aprovar",
      value: String(pendingProofs.length),
      href: "/conta/provas",
      alert: pendingProofs.length > 0,
    },
    { label: "Orçamentos por responder", value: String(pendingQuotes.length), href: "/conta/orcamentos" },
    { label: "Por pagar", value: formatKz(due), href: "/conta/pagamentos" },
  ];

  return (
    <div className="space-y-12">
      <AccountHeading
        title={firstName ? `Olá, ${firstName}.` : "Olá."}
        action={
          <Button asChild>
            <Link href="/orcamento">
              Novo pedido <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        }
      >
        Acompanha os pedidos, aprova provas e consulta pagamentos e faturas.
      </AccountHeading>

      <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group bg-card p-5 hover:bg-paper-2">
            <dt className="eyebrow text-ink-3">{stat.label}</dt>
            <dd className={`mt-3 text-display-sm font-bold ${stat.alert ? "text-brand" : ""}`}>{stat.value}</dd>
          </Link>
        ))}
      </dl>

      {pendingProofs.length > 0 && (
        <section aria-labelledby="provas" className="space-y-4">
          <h2 id="provas" className="text-lg font-semibold">
            Provas à tua espera
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {pendingProofs.map((proof) => (
              <li key={proof.id}>
                <Link
                  href={`/conta/provas/${proof.id}`}
                  className="flex items-center justify-between gap-4 rounded-sm border border-brand/40 bg-brand/5 p-5 hover:border-brand"
                >
                  <span>
                    <span className="block font-medium">
                      {proof.itemName} · prova v{proof.version}
                    </span>
                    <span className="text-sm text-ink-3">Pedido {proof.orderNumber}</span>
                  </span>
                  <span className="text-sm font-medium text-brand">Rever e aprovar →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ativos" className="space-y-4">
        <h2 id="ativos" className="text-lg font-semibold">
          Pedidos em curso
        </h2>
        {active.length === 0 ? (
          <EmptyState
            title="Sem pedidos em curso."
            action={
              <Button asChild variant="outline">
                <Link href="/orcamento">Fazer um pedido</Link>
              </Button>
            }
          >
            Quando encomendares, acompanhas aqui cada passo, do design à entrega.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {active.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/conta/pedidos/${order.number}`}
                  className="grid gap-2 p-5 hover:bg-paper-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6"
                >
                  <span>
                    <span className="block font-mono text-sm">{order.number}</span>
                    <span className="block truncate text-sm text-ink-2">{order.itemsSummary.names.join(", ")}</span>
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm text-ink-3 sm:text-right">
                    {formatKz(order.totals.total)}
                    <span className="block">Previsto: {formatWeekday(order.dueAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
