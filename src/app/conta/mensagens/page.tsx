import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { NewThreadForm } from "@/features/account/components/messages";
import { listMyOrders, listMyThreads } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  const user = await requireCustomer("/conta/mensagens");
  const [threads, orders] = await Promise.all([listMyThreads(user.uid), listMyOrders(user.uid)]);

  return (
    <div className="space-y-10">
      <AccountHeading title="Mensagens">
        Fala com a equipa sobre um pedido, uma prova ou qualquer dúvida. Respondemos no mesmo dia útil.
      </AccountHeading>

      {threads.length > 0 && (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/conta/mensagens/${thread.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-paper-2"
              >
                <span>
                  <span className="block font-medium">{thread.subject}</span>
                  <span className="text-xs text-ink-3">{formatDateTime(thread.lastMessageAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  {thread.unread && <Badge tone="brand">Resposta nova</Badge>}
                  {thread.status === "fechada" && <Badge tone="neutral">Fechada</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="nova" className="space-y-4">
        <h2 id="nova" className="text-lg font-semibold">
          Nova mensagem
        </h2>
        <NewThreadForm orders={orders.map((order) => order.number)} />
      </section>
    </div>
  );
}
