import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listMyOrders } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Faturas" };

export default async function InvoicesPage() {
  const user = await requireCustomer("/conta/faturas");
  const orders = (await listMyOrders(user.uid)).filter((order) => order.status !== "cancelado");

  return (
    <div className="space-y-10">
      <AccountHeading title="Faturas e documentos">
        Pro-formas de cada pedido em PDF. As faturas legais são emitidas em software certificado pela AGT e ficam aqui
        quando forem emitidas, com os recibos dos pagamentos.
      </AccountHeading>

      <section aria-labelledby="proformas" className="space-y-4">
        <h2 id="proformas" className="text-lg font-semibold">
          Pro-formas
        </h2>
        {orders.length === 0 ? (
          <EmptyState title="Sem documentos." />
        ) : (
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {orders.map((order) => (
              <li key={order.id}>
                <a
                  href={`/api/pdf/proforma/${encodeURIComponent(order.number)}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-paper-2"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="size-5 text-brand" aria-hidden />
                    <span>
                      <span className="block font-mono text-sm">Pro-forma {order.number}</span>
                      <span className="text-xs text-ink-3">{formatDate(order.createdAt)}</span>
                    </span>
                  </span>
                  <span className="text-sm">
                    {formatKz(order.totals.total)} <span className="text-ink-3">· PDF</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="faturas" className="space-y-4">
        <h2 id="faturas" className="text-lg font-semibold">
          Faturas e recibos
        </h2>
        <EmptyState title="Ainda não há faturas emitidas.">
          A fatura de cada pedido é emitida quando o pagamento é confirmado. Se precisares dela antes, fala connosco.
        </EmptyState>
      </section>
    </div>
  );
}
