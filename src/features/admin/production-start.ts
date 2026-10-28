import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getCatalog } from "@/features/catalog/server";
import { consumptionFor, type Product } from "@/lib/domain/catalog";
import { addWorkingDays } from "@/lib/domain/pricing";
import { planTasks, routeFor } from "@/lib/domain/production";
import { formatQty, type StockUnit } from "@/lib/domain/stock";
import { adminDb } from "@/lib/firebase/admin";
import { AUDIENCE, notifyRoles } from "./notify";
import { moveStock, warnLowStock, type LowStock } from "./stock-ledger";

/**
 * Entrada em produção (docs/04 · → em_producao): cria as tarefas da oficina pelo percurso de cada produto,
 * recalcula o prazo e dá baixa do material no stock.
 * Corre depois da transação que muda o estado, no lugar do trigger previsto (onOrderWrite): idempotente pelo
 * `productionStartedAt`, e os ids fixos das tarefas nunca duplicam. Se falhar, a Produção mostra "Criar tarefas".
 */
export async function startProduction(orderId: string, actorId: string): Promise<number> {
  const db = adminDb();
  const ref = db.collection("orders").doc(orderId);
  // Inclui produtos desativados depois do pedido: o pedido continua a ser feito como foi vendido
  const catalog = new Map((await getCatalog()).map((p) => [p.slug, p]));
  const created = await db.runTransaction(async (tx) => {
    const [order, items] = await Promise.all([tx.get(ref), tx.get(ref.collection("items"))]);
    if (!order.exists || order.get("status") !== "em_producao" || order.get("productionStartedAt")) return 0;
    const now = new Date();
    const at = Timestamp.fromDate(now);
    // O prazo conta a partir daqui (docs/04 · Prazo); artigos de orçamento mantêm o prazo combinado
    const agreed = (order.get("dueAt") as Timestamp | undefined)?.toDate() ?? addWorkingDays(now, 7);
    const ends = items.docs.map((item) => {
      const product = catalog.get(item.get("productId"));
      if (!product) return agreed.getTime();
      const days = item.get("urgent") ? product.leadTime.urgentDays : product.leadTime.normalDays;
      return addWorkingDays(now, days).getTime();
    });
    const dueAt = Timestamp.fromMillis(Math.max(now.getTime(), ...ends));
    const byId = new Map(items.docs.map((item) => [item.id, item]));
    const urgentOrder = order.get("priority") === "urgente";
    const tasks = planTasks(
      ref.id,
      items.docs.map((item) => ({ id: item.id, productId: item.get("productId") })),
      (productId) => {
        const route = catalog.get(productId)?.route;
        return route?.length ? route : routeFor(productId);
      },
    );

    for (const task of tasks) {
      const item = byId.get(task.itemId)!;
      const size = item.get("size") as { widthCm: number; heightCm: number } | undefined;
      const details = [
        ...((item.get("options") ?? []) as { choiceLabel: string }[]).map((o) => o.choiceLabel),
        ...(size ? [`${size.widthCm} × ${size.heightCm} cm`] : []),
      ].join(" · ");
      tx.set(db.collection("productionTasks").doc(task.id), {
        orderId: ref.id,
        orderNumber: order.get("number"),
        itemId: task.itemId,
        itemName: item.get("name"),
        quantity: item.get("quantity"),
        details,
        notes: item.get("notes") ?? null,
        customerName: order.get("customer.name"),
        sector: task.sector,
        status: "por_fazer",
        priority: urgentOrder || item.get("urgent") ? 3 : 2,
        dueAt,
        timeLogs: [],
        dependsOn: task.dependsOn,
        createdAt: at,
      });
    }
    tx.update(ref, { productionStartedAt: at, dueAt, updatedAt: at, updatedBy: actorId });
    tx.set(ref.collection("events").doc(), {
      type: "production",
      visibility: "interno",
      message: `${tasks.length} tarefa(s) de produção criadas`,
      actorName: "Sistema",
      at,
    });
    return tasks.length;
  });
  if (created > 0) await consumeStock(orderId, actorId, catalog);
  return created;
}

/**
 * Baixa automática do material (docs/02 · products.consumption) ao entrar em produção, numa transação à parte:
 * um problema de stock nunca impede as tarefas de nascer. Idempotente pelo `stockConsumedAt`.
 * Se faltar material, não fica stock negativo: esse material fica por baixar, com nota interna no pedido e aviso
 * ao Gestor para registar à mão quando chegar.
 * shortcut: cancelar um pedido depois da baixa não devolve o material; regista-se uma entrada à mão.
 */
async function consumeStock(orderId: string, actorId: string, catalog: Map<string, Product>) {
  const db = adminDb();
  const ref = db.collection("orders").doc(orderId);
  const result = await db.runTransaction(async (tx) => {
    const [order, items] = await Promise.all([tx.get(ref), tx.get(ref.collection("items"))]);
    if (!order.exists || order.get("stockConsumedAt")) return null;

    const needs = new Map<string, number>();
    for (const item of items.docs) {
      const rules = catalog.get(item.get("productId"))?.consumption ?? [];
      const options = Object.fromEntries(
        ((item.get("options") ?? []) as { group: string; choice: string }[]).map((o) => [o.group, o.choice]),
      );
      const used = consumptionFor(rules, { quantity: item.get("quantity"), options, size: item.get("size") });
      for (const [materialId, qty] of used) needs.set(materialId, (needs.get(materialId) ?? 0) + qty);
    }
    if (needs.size === 0) return null;

    const materials = await tx.getAll(...[...needs.keys()].map((id) => db.collection("materials").doc(id)));
    const number = order.get("number") as string;
    const done: string[] = [];
    const short: string[] = [];
    const low: (LowStock | null)[] = [];
    for (const material of materials) {
      const qty = needs.get(material.id)!;
      const unit = material.get("unit") as StockUnit;
      if (!material.exists) continue; // material apagado da regra: nada a baixar
      if ((material.get("qty") ?? 0) < qty) {
        short.push(
          `${formatQty(qty, unit)} de ${material.get("name")} (há ${formatQty(material.get("qty") ?? 0, unit)})`,
        );
        continue;
      }
      low.push(
        moveStock(
          tx,
          material,
          { uid: actorId, name: "Baixa automática" },
          {
            type: "saida",
            delta: -qty,
            reason: "Baixa automática",
            orderId: ref.id,
            orderNumber: number,
          },
        ),
      );
      done.push(`${formatQty(qty, unit)} de ${material.get("name")}`);
    }
    const at = Timestamp.now();
    tx.update(ref, { stockConsumedAt: at });
    tx.set(ref.collection("events").doc(), {
      type: "stock",
      visibility: "interno",
      message: [
        done.length ? `Baixa de stock: ${done.join(", ")}` : null,
        short.length ? `Falta material, registar à mão: ${short.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      actorName: "Sistema",
      at,
    });
    return { number, short, low };
  });
  if (!result) return;
  await warnLowStock(result.low);
  if (result.short.length) {
    await notifyRoles(AUDIENCE.managers, {
      event: "stock.baixo",
      title: `Falta material para ${result.number}`,
      body: result.short.join("; "),
      link: `/admin/pedidos/${result.number}`,
    });
  }
}

/** Chamada depois de mudar o estado: um erro aqui nunca desfaz a mudança, fica para o botão da Produção. */
export async function startProductionSafely(orderId: string, actorId: string) {
  try {
    await startProduction(orderId, actorId);
  } catch (error) {
    console.error("[produção] tarefas por criar", orderId, error);
  }
}
