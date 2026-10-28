"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, GripVertical, Zap } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/domain/order-status";
import { cn } from "@/lib/utils";
import { bulkChangeStatus, changeOrderStatus } from "../order-actions";
import type { AdminOrderRow } from "../orders";

const BULK_TARGETS: OrderStatus[] = ["em_design", "em_aprovacao", "em_producao", "pronto", "entregue"];

function Flags({ row }: { row: AdminOrderRow }) {
  return (
    <span className="flex items-center gap-1.5">
      {row.priority === "urgente" && <Zap className="size-3.5 text-warning" aria-label="Urgente" />}
      {row.late && <AlertTriangle className="size-3.5 text-danger" aria-label="Atrasado" />}
    </span>
  );
}

/** Tabela com seleção e ações em massa (a filtragem e a pesquisa vêm do endereço, feitas no servidor). */
export function OrdersTable({ rows, staff }: { rows: AdminOrderRow[]; staff: Record<string, string> }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<OrderStatus>("em_producao");
  const [pending, start] = useTransition();
  const all = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = () =>
    start(async () => {
      const result = await bulkChangeStatus([...selected], target);
      if (result.ok) toast.success(`${result.ok} pedido(s) atualizado(s).`);
      if (result.failed.length)
        toast.error(`${result.failed.length} sem mudança: ${[...new Set(result.failed)].join(" · ")}`);
      setSelected(new Set());
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-sm border border-ink bg-card p-3 shadow-paper">
          <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
          <div className="w-48">
            <Select
              options={BULK_TARGETS.map((s) => ({ value: s, label: `Mover para ${ORDER_STATUS_META[s].label}` }))}
              value={target}
              onValueChange={(v) => setTarget(v as OrderStatus)}
            />
          </div>
          <Button size="sm" loading={pending} onClick={apply}>
            Aplicar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Limpar
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-sm border border-line bg-card">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="eyebrow text-ink-3">
            <tr className="border-b border-line">
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={all}
                  onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="accent-brand"
                />
              </th>
              <th className="p-3 font-normal">Pedido</th>
              <th className="p-3 font-normal">Cliente</th>
              <th className="p-3 font-normal">Estado</th>
              <th className="p-3 font-normal">Pagamento</th>
              <th className="p-3 font-normal">Prazo</th>
              <th className="p-3 font-normal">Responsável</th>
              <th className="p-3 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-line last:border-0 hover:bg-paper-2",
                  selected.has(row.id) && "bg-brand/5",
                )}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${row.number}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="accent-brand"
                  />
                </td>
                <td className="p-3">
                  <Link
                    href={`/admin/pedidos/${row.number}`}
                    className="flex items-center gap-2 font-mono hover:underline"
                  >
                    {row.number} <Flags row={row} />
                  </Link>
                  <span className="block max-w-56 truncate text-xs text-ink-3">{row.itemsLabel}</span>
                </td>
                <td className="p-3">
                  {row.customerName}
                  <span className="block text-xs text-ink-3">{formatDate(row.createdAt)}</span>
                </td>
                <td className="p-3">
                  <OrderStatusBadge status={row.status} />
                  {row.awaitingDeposit && <span className="mt-1 block text-xs text-warning">a aguardar sinal</span>}
                </td>
                <td className="p-3">
                  <PaymentStatusBadge status={row.paymentStatus} />
                </td>
                <td className={cn("p-3", row.late && "font-medium text-danger")}>{formatDate(row.dueAt)}</td>
                <td className="p-3 text-ink-2">{row.assigneeId ? (staff[row.assigneeId] ?? "—") : "—"}</td>
                <td className="p-3 text-right font-medium">{formatKz(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-sm text-ink-3">Nenhum pedido com estes filtros.</p>}
      </div>
    </div>
  );
}

const COLUMNS: OrderStatus[] = ["recebido", "em_design", "em_aprovacao", "em_producao", "pronto"];

/**
 * Kanban por estado: arrastar e largar no desktop; no telemóvel (sem arrastar) cada cartão tem "Mover para".
 * O servidor valida cada mudança com as guardas da máquina de estados.
 */
export function OrdersKanban({ rows: initial }: { rows: AdminOrderRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [over, setOver] = useState<OrderStatus | null>(null);
  const [, start] = useTransition();

  const move = (id: string, to: OrderStatus) => {
    const row = rows.find((r) => r.id === id);
    if (!row || row.status === to) return;
    const before = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: to } : r)));
    start(async () => {
      const result = await changeOrderStatus(id, to);
      if (!result.ok) {
        setRows(before);
        toast.error(`${row.number}: ${result.message}`);
      } else router.refresh();
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="grid min-w-[64rem] grid-cols-5 gap-3">
        {COLUMNS.map((status) => {
          const cards = rows.filter((r) => r.status === status);
          return (
            <section
              key={status}
              aria-label={ORDER_STATUS_META[status].label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                move(e.dataTransfer.getData("text/plain"), status);
              }}
              className={cn(
                "min-h-64 rounded-sm border bg-paper-2 p-2 transition-colors",
                over === status ? "border-brand bg-brand/5" : "border-line",
              )}
            >
              <header className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{ORDER_STATUS_META[status].label}</h2>
                <span className="font-mono text-xs text-ink-3">{cards.length}</span>
              </header>
              <ul className="space-y-2">
                {cards.map((row) => (
                  <li
                    key={row.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", row.id)}
                    className="cursor-grab rounded-sm border border-line bg-card p-3 shadow-paper active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/admin/pedidos/${row.number}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {row.number}
                      </Link>
                      <span className="flex items-center gap-1">
                        <Flags row={row} />
                        <GripVertical className="size-3.5 text-ink-3" aria-hidden />
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm">{row.customerName}</p>
                    <p className="truncate text-xs text-ink-3">{row.itemsLabel}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={cn(row.late ? "font-medium text-danger" : "text-ink-3")}>
                        {formatDate(row.dueAt)}
                      </span>
                      <span className="font-medium">{formatKz(row.total)}</span>
                    </div>
                    {row.awaitingDeposit && <p className="mt-1 text-xs text-warning">A aguardar sinal</p>}
                    <select
                      aria-label={`Mover ${row.number}`}
                      value={row.status}
                      onChange={(e) => move(row.id, e.target.value as OrderStatus)}
                      className="mt-2 w-full rounded-xs border border-line bg-paper px-2 py-1 text-xs lg:hidden"
                    >
                      {[...COLUMNS, "entregue" as const].map((s) => (
                        <option key={s} value={s}>
                          {s === row.status ? ORDER_STATUS_META[s].label : `Mover para ${ORDER_STATUS_META[s].label}`}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
