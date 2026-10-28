import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { PROOF_STATUS } from "@/features/account/proof-status";
import { requireModule } from "@/features/admin/guard";
import { listProofQueue, listProofs } from "@/features/admin/proofs";
import { formatDate, formatDateTime } from "@/lib/dates";
import { can } from "@/lib/domain/permissions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Provas" };

const FILTERS = [
  ["", "Recentes"],
  ["pendente", "À espera do cliente"],
  ["alteracoes_pedidas", "Alterações pedidas"],
  ["aprovada", "Aprovadas"],
] as const;

export default async function AdminProofsPage({ searchParams }: PageProps<"/admin/provas">) {
  const user = await requireModule("proofs", "view", "/admin/provas");
  const estado = (await searchParams).estado;
  const status = FILTERS.some(([key]) => key === estado) ? (estado as string) : "";
  const [queue, proofs] = await Promise.all([listProofQueue(), listProofs(status || undefined)]);
  const canCreate = can(user, "proofs", "create");

  return (
    <div className="space-y-10">
      <AccountHeading title="Provas e design">
        Produtos à espera de prova e as provas enviadas aos clientes.
      </AccountHeading>

      <section aria-labelledby="fila" className="space-y-3">
        <h2 id="fila" className="text-lg font-semibold">
          Por fazer ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <EmptyState title="Nenhum produto à espera de prova." />
        ) : (
          <ul className="divide-y divide-line rounded-sm border border-line bg-card">
            {queue.map((row) => (
              <li key={row.itemId} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <span>
                  <Link href={`/admin/pedidos/${row.orderNumber}`} className="font-mono hover:underline">
                    {row.orderNumber}
                  </Link>{" "}
                  · {row.itemName} · {row.customerName}
                  <span className="block text-xs text-ink-3">
                    Prazo {formatDate(row.dueAt)} ·{" "}
                    {row.design === "endju_cria" ? "design pela Endju" : "arte do cliente"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {row.status === "alteracoes" && <Badge tone="process">Alterações pedidas</Badge>}
                  {canCreate && (
                    <Link
                      href={`/admin/provas/nova?pedido=${row.orderNumber}&item=${row.itemId}`}
                      className="font-medium text-brand hover:underline"
                    >
                      Enviar prova →
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="enviadas" className="space-y-3">
        <h2 id="enviadas" className="text-lg font-semibold">
          Enviadas
        </h2>
        <nav aria-label="Filtrar provas" className="flex flex-wrap gap-2">
          {FILTERS.map(([key, label]) => (
            <Link
              key={key}
              href={key ? `/admin/provas?estado=${key}` : "/admin/provas"}
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
        {proofs.length === 0 ? (
          <EmptyState title="Nenhuma prova neste estado." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {proofs.map((proof) => (
              <li key={proof.id}>
                <Link
                  href={`/admin/provas/${proof.id}`}
                  className="block overflow-hidden rounded-sm border border-line bg-card hover:border-ink/40"
                >
                  <div className="aspect-[16/9] bg-paper-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização da prova (Cloudinary ou data URL) */}
                    <img src={proof.previewUrl} alt="" className="size-full object-contain" />
                  </div>
                  <div className="flex items-start justify-between gap-2 p-3 text-sm">
                    <span>
                      <span className="block font-medium">
                        {proof.itemName} · v{proof.version}
                      </span>
                      <span className="text-xs text-ink-3">
                        {proof.orderNumber} · {formatDateTime(proof.sentAt)}
                      </span>
                    </span>
                    <Badge tone={PROOF_STATUS[proof.status].tone}>{PROOF_STATUS[proof.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
