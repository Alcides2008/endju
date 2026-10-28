import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { revenueSummary, topNames } from "./dashboard-math";
import { listActiveOrders } from "./orders";

const DAY = 86_400_000;

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

/**
 * Números do dashboard, lidos à hora (sem agregados guardados).
 * shortcut: lê os pagamentos de 9 semanas e os pedidos de 30 dias de uma vez; com milhares por mês,
 * passar para totais diários mantidos por uma Cloud Function (docs/02 · stats).
 */
export async function getDashboard(now = new Date()) {
  const db = adminDb();
  const [payments, active, quotes, recent, threads, activity] = await Promise.all([
    // Só intervalo em confirmedAt (índice automático); o estado filtra-se aqui
    db
      .collection("payments")
      .where("confirmedAt", ">=", Timestamp.fromDate(new Date(now.getTime() - 9 * 7 * DAY)))
      .get(),
    listActiveOrders(),
    db.collection("quotes").where("status", "in", ["novo", "em_analise", "enviado", "aceite"]).get(),
    db
      .collection("orders")
      .where("createdAt", ">=", Timestamp.fromDate(new Date(now.getTime() - 30 * DAY)))
      .get(),
    db.collection("threads").where("unreadByTeam", "==", true).get(),
    db.collection("auditLogs").orderBy("at", "desc").limit(12).get(),
  ]);

  const revenue = revenueSummary(
    payments.docs
      .filter((p) => p.get("status") === "confirmado")
      .map((p) => ({ amount: p.get("amount") as number, at: date(p.get("confirmedAt"))! })),
    now,
  );

  const quoteCounts = { preparar: 0, espera: 0, aceites: 0 };
  for (const q of quotes.docs) {
    const status = q.get("status") as string;
    const validUntil = date(q.get("validUntil"));
    if (status === "novo" || status === "em_analise") quoteCounts.preparar++;
    else if (status === "aceite") quoteCounts.aceites++;
    else if (!validUntil || validUntil >= now) quoteCounts.espera++;
  }

  const live = recent.docs.filter((o) => o.get("status") !== "cancelado");
  return {
    revenue,
    active,
    quotes: quoteCounts,
    unreadThreads: threads.docs.filter((t) => t.get("status") === "aberta").length,
    last30: {
      orders: live.length,
      total: live.reduce((sum, o) => sum + ((o.get("totals.total") as number) ?? 0), 0),
      top: topNames(live.map((o) => (o.get("itemsSummary.names") as string[] | undefined) ?? [])),
    },
    activity: activity.docs.map((a) => ({
      id: a.id,
      actorName: (a.get("actorName") as string) ?? "Sistema",
      action: a.get("action") as string,
      label: (a.get("entity.label") as string) ?? "",
      type: a.get("entity.type") as string,
      entityId: a.get("entity.id") as string,
      at: date(a.get("at")),
    })),
  };
}

/** Oficina no dashboard: tarefas abertas por estado e materiais abaixo do mínimo (contagens no servidor). */
export async function getWorkshop(show: { production: boolean; stock: boolean }) {
  const db = adminDb();
  const count = async (query: FirebaseFirestore.Query) => (await query.count().get()).data().count;
  const tasks = db.collection("productionTasks");
  const [running, queued, blocked, low] = await Promise.all([
    show.production ? count(tasks.where("status", "==", "em_curso")) : 0,
    show.production ? count(tasks.where("status", "in", ["por_fazer", "pausada"])) : 0,
    show.production ? count(tasks.where("status", "==", "bloqueada")) : 0,
    // isLow fica true em materiais descontinuados também; aqui só interessam os ativos
    show.stock
      ? (await db.collection("materials").where("isLow", "==", true).get()).docs.filter(
          (d) => d.get("active") !== false,
        ).length
      : 0,
  ]);
  return { running, queued, blocked, low };
}
