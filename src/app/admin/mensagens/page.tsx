import type { Metadata } from "next";
import Link from "next/link";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { requireModule } from "@/features/admin/guard";
import { listThreads } from "@/features/admin/threads";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mensagens" };

export default async function AdminThreadsPage({ searchParams }: PageProps<"/admin/mensagens">) {
  await requireModule("messaging", "view", "/admin/mensagens");
  const status = (await searchParams).estado === "fechada" ? "fechada" : "aberta";
  const threads = await listThreads(status);
  const unread = threads.filter((t) => t.unread).length;

  return (
    <>
      <AccountHeading title="Mensagens">
        Conversas de suporte com clientes da área de cliente{status === "aberta" && ` · ${unread} por ler`}.
      </AccountHeading>
      <nav aria-label="Filtrar conversas" className="mb-5 flex gap-2">
        {(
          [
            ["aberta", "Abertas"],
            ["fechada", "Fechadas"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "aberta" ? "/admin/mensagens" : "/admin/mensagens?estado=fechada"}
            aria-current={status === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              status === key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {threads.length === 0 ? (
        <EmptyState title={status === "aberta" ? "Sem conversas abertas." : "Sem conversas fechadas."} />
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/admin/mensagens/${thread.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-ink/[0.025]"
              >
                <span className="min-w-0">
                  <span className={cn("block truncate", thread.unread && "font-semibold")}>{thread.subject}</span>
                  <span className="text-xs text-ink-3">
                    {thread.customerName}
                    {thread.orderNumber && ` · ${thread.orderNumber}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-ink-3">
                  {formatDateTime(thread.lastMessageAt)}
                  {thread.unread && <span className="size-2 rounded-full bg-brand" aria-label="Por ler" />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
