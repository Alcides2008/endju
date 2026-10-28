import type { Metadata } from "next";
import Link from "next/link";
import type { Timestamp } from "firebase-admin/firestore";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { ACTION_LABELS, ENTITY_LINK } from "@/features/admin/audit-labels";
import { requireModule } from "@/features/admin/guard";
import { formatDateTime } from "@/lib/dates";
import { can, ROLE_LABELS, type RoleId } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Auditoria" };

const TYPES: [string, string][] = [
  ["", "Tudo"],
  ["orders", "Pedidos"],
  ["quotes", "Orçamentos"],
  ["proofs", "Provas"],
  ["customers", "Clientes"],
  ["productionTasks", "Produção"],
  ["materials", "Stock"],
  ["purchaseOrders", "Compras"],
  ["expenses", "Despesas"],
  ["invoices", "Faturas"],
  ["products", "Catálogo"],
  ["projects", "Portfólio"],
  ["coupons", "Cupões"],
  ["users", "Equipa"],
  ["roles", "Permissões"],
];

/** Registo imutável de quem fez o quê (docs/02 · auditLogs). shortcut: os últimos 500, filtrados aqui. */
export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const user = await requireModule("audit", "view", "/admin/auditoria");
  const params = await searchParams;
  const type = typeof params.tipo === "string" ? params.tipo : "";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const snap = await adminDb().collection("auditLogs").orderBy("at", "desc").limit(500).get();
  const rows = snap.docs
    .map((d) => ({
      id: d.id,
      actorName: (d.get("actorName") as string) ?? "",
      actorRole: d.get("actorRole") as RoleId,
      action: d.get("action") as string,
      type: d.get("entity.type") as string,
      entityId: d.get("entity.id") as string,
      label: (d.get("entity.label") as string) ?? "",
      at: (d.get("at") as Timestamp).toDate(),
    }))
    .filter(
      (r) => (!type || r.type === type) && (!q || `${r.actorName} ${r.label} ${r.action}`.toLowerCase().includes(q)),
    );

  return (
    <>
      <AccountHeading
        title="Auditoria"
        action={
          can(user, "audit", "export") && (
            <a href={`/api/export/auditoria?formato=csv`} className="text-sm text-ink-2 underline underline-offset-4">
              Exportar CSV
            </a>
          )
        }
      >
        Tudo o que a equipa e os clientes mudaram: quem, o quê e quando. Não se edita nem se apaga.
      </AccountHeading>
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/auditoria">
        {type && <input type="hidden" name="tipo" value={type} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Procurar pessoa, pedido, ação…"
          className="h-10 min-w-64 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none focus:border-ink"
        />
      </form>
      <nav aria-label="Filtrar por tipo" className="mb-5 flex flex-wrap gap-2">
        {TYPES.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/auditoria?${new URLSearchParams({ ...(key ? { tipo: key } : {}), ...(q ? { q } : {}) })}`}
            aria-current={type === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              type === key ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink/40",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="Nada encontrado com estes filtros." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Quando</TH>
              <TH>Quem</TH>
              <TH>O quê</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => {
              const href = ENTITY_LINK[r.type]?.(r.entityId, r.label);
              return (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap text-ink-2">{formatDateTime(r.at)}</TD>
                  <TD>
                    {r.actorName}
                    <p className="text-xs text-ink-3">{ROLE_LABELS[r.actorRole] ?? r.actorRole}</p>
                  </TD>
                  <TD>
                    {ACTION_LABELS[r.action] ?? r.action}{" "}
                    {href ? (
                      <Link href={href} className="font-mono text-xs hover:underline">
                        {r.label}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{r.label}</span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
