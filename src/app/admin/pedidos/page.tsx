import type { Metadata } from "next";
import Link from "next/link";
import { Download, KanbanSquare, Rows3 } from "lucide-react";
import { AccountHeading } from "@/features/account/components/account-heading";
import { OrdersKanban, OrdersTable } from "@/features/admin/components/orders-views";
import { requireModule } from "@/features/admin/guard";
import { listActiveOrders, listOrders, listStaff } from "@/features/admin/orders";
import { can } from "@/lib/domain/permissions";
import { ORDER_STATUS_META, ORDER_STATUSES, type OrderStatus } from "@/lib/domain/order-status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

const chip = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm",
    active ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
  );

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  const user = await requireModule("orders", "view", "/admin/pedidos");
  const params = await searchParams;
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const vista = get("vista") === "kanban" ? "kanban" : "tabela";
  const estado = get("estado") || "ativos";
  const q = get("q").trim();
  const urgentes = get("urgentes") === "1";
  const atrasados = get("atrasados") === "1";

  const status = (ORDER_STATUSES as readonly string[]).includes(estado)
    ? (estado as OrderStatus)
    : estado === "todos"
      ? undefined
      : "ativos";
  const [rows, staff] = await Promise.all([
    vista === "kanban" ? listActiveOrders() : listOrders({ status, q: q || undefined }),
    listStaff(),
  ]);
  const shown = rows.filter((r) => (!urgentes || r.priority === "urgente") && (!atrasados || r.late));
  const staffNames = Object.fromEntries(staff.map((s) => [s.uid, s.name]));

  const href = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const base: Record<string, string> = {
      vista,
      estado,
      q,
      urgentes: urgentes ? "1" : "",
      atrasados: atrasados ? "1" : "",
    };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) next.set(k, v);
    if (next.get("vista") === "tabela") next.delete("vista");
    if (next.get("estado") === "ativos") next.delete("estado");
    const qs = next.toString();
    return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
  };
  const exportQuery = new URLSearchParams({ estado, ...(q ? { q } : {}) }).toString();

  return (
    <>
      <AccountHeading
        title="Pedidos"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={href({ vista: "tabela" })}
              className={chip(vista === "tabela")}
              aria-current={vista === "tabela" ? "page" : undefined}
            >
              <Rows3 className="mr-1.5 inline size-4" aria-hidden />
              Tabela
            </Link>
            <Link
              href={href({ vista: "kanban" })}
              className={chip(vista === "kanban")}
              aria-current={vista === "kanban" ? "page" : undefined}
            >
              <KanbanSquare className="mr-1.5 inline size-4" aria-hidden />
              Kanban
            </Link>
          </div>
        }
      >
        {shown.length} pedido(s){vista === "kanban" ? " em curso. Arrasta os cartões para mudar o estado." : "."}
      </AccountHeading>

      <div className="mb-5 space-y-3">
        {vista === "tabela" && (
          <form action="/admin/pedidos" className="flex flex-wrap items-center gap-2">
            {estado !== "ativos" && <input type="hidden" name="estado" value={estado} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Pesquisar por número, cliente, telefone ou NIF"
              aria-label="Pesquisar pedidos"
              className="h-10 w-full max-w-sm rounded-full border border-line bg-card px-4 text-sm outline-none focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20"
            />
            <button type="submit" className={chip(false)}>
              Pesquisar
            </button>
            {q && (
              <Link href={href({ q: null })} className="text-sm text-ink-3 hover:text-ink">
                Limpar pesquisa
              </Link>
            )}
          </form>
        )}
        <nav aria-label="Filtros" className="flex flex-wrap gap-2">
          {vista === "tabela" &&
            [
              ["ativos", "Em curso"],
              ["todos", "Todos"],
              ...ORDER_STATUSES.map((s) => [s, ORDER_STATUS_META[s].label]),
            ].map(([key, label]) => (
              <Link key={key} href={href({ estado: key, q: null })} className={chip(estado === key && !q)}>
                {label}
              </Link>
            ))}
          <Link href={href({ urgentes: urgentes ? null : "1" })} className={chip(urgentes)}>
            Urgentes
          </Link>
          <Link href={href({ atrasados: atrasados ? null : "1" })} className={chip(atrasados)}>
            Atrasados
          </Link>
        </nav>
        {vista === "tabela" && can(user, "orders", "export") && (
          <p className="flex flex-wrap items-center gap-3 text-sm text-ink-3">
            <Download className="size-4" aria-hidden /> Exportar esta lista:
            {(["csv", "xls", "pdf"] as const).map((format) => (
              <a
                key={format}
                href={`/api/export/pedidos?${exportQuery}&formato=${format}`}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                {format === "xls" ? "Excel" : format.toUpperCase()}
              </a>
            ))}
          </p>
        )}
      </div>

      {vista === "kanban" ? (
        <OrdersKanban key={shown.map((r) => `${r.id}:${r.status}`).join()} rows={shown} />
      ) : (
        <OrdersTable rows={shown} staff={staffNames} />
      )}
    </>
  );
}
