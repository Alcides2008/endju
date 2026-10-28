import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { QUOTE_STATUS } from "@/features/account/proof-status";
import type { QuoteView } from "@/features/account/server";
import { adminDb } from "@/lib/firebase/admin";

const date = (value: unknown) => (value as Timestamp | undefined)?.toDate() ?? null;

export type QuoteStatus = QuoteView["status"];

/** Estado visto pela equipa: o "Recebido" do cliente aqui diz "Novo". */
export const quoteStatusLabel = (status: QuoteStatus) =>
  status === "novo" ? "Novo" : status === "enviado" ? "À espera do cliente" : QUOTE_STATUS[status].label;

/** "enviado" com a validade ultrapassada conta como expirado (sem tarefa agendada que o mude). */
const effectiveStatus = (status: QuoteStatus, validUntil: Date | null, now: Date): QuoteStatus =>
  status === "enviado" && validUntil && validUntil < now ? "expirado" : status;

export type AdminQuoteRow = {
  id: string;
  number: string;
  status: QuoteStatus;
  name: string;
  company?: string;
  description: string;
  createdAt: Date | null;
  validUntil: Date | null;
  total?: number;
  currentVersion: number;
};

/**
 * Lista e taxa de conversão (docs/04 · Estado do orçamento): convertido / propostas que saíram.
 * shortcut: lê os últimos 500 sem filtro de período; com mais volume, filtrar por createdAt.
 */
export async function listQuotes(status?: string, now = new Date()) {
  const snap = await adminDb().collection("quotes").orderBy("createdAt", "desc").limit(500).get();
  const all = snap.docs.map((d): AdminQuoteRow => {
    const validUntil = date(d.get("validUntil"));
    return {
      id: d.id,
      number: d.get("number"),
      status: effectiveStatus(d.get("status"), validUntil, now),
      name: d.get("contact.name"),
      company: d.get("contact.company"),
      description: d.get("request.description") ?? "",
      createdAt: date(d.get("createdAt")),
      validUntil,
      total: d.get("total"),
      currentVersion: d.get("currentVersion") ?? 0,
    };
  });
  const counts = all.reduce<Partial<Record<QuoteStatus, number>>>(
    (acc, q) => ({ ...acc, [q.status]: (acc[q.status] ?? 0) + 1 }),
    {},
  );
  const sent = (["enviado", "aceite", "recusado", "expirado", "convertido"] as const).reduce(
    (sum, s) => sum + (counts[s] ?? 0),
    0,
  );
  return {
    rows: status ? all.filter((q) => q.status === status) : all,
    counts,
    conversion: sent ? (counts.convertido ?? 0) / sent : null,
  };
}

export type QuoteLine = { description: string; quantity: number; unitPrice: number; taxRate: number };

export async function getAdminQuote(id: string, now = new Date()) {
  const doc = await adminDb().collection("quotes").doc(id).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  const versions = await doc.ref.collection("versions").get();
  const validUntil = date(d.validUntil);
  return {
    id: doc.id,
    number: d.number as string,
    status: effectiveStatus(d.status, validUntil, now),
    kind: d.kind as "personalizado" | "catalogo",
    userId: d.userId as string | undefined,
    customerId: d.customerId as string | undefined,
    assigneeId: d.assigneeId as string | undefined,
    orderId: d.orderId as string | undefined,
    orderNumber: d.orderNumber as string | undefined,
    contact: d.contact as { name: string; phone: string; email?: string; company?: string },
    request: {
      description: d.request?.description as string,
      quantity: d.request?.quantity as string | undefined,
      deadline: date(d.request?.deadline),
      budgetRange: d.request?.budgetRange as string | undefined,
    },
    createdAt: date(d.createdAt),
    sentAt: date(d.sentAt),
    respondedAt: date(d.respondedAt),
    validUntil,
    currentVersion: (d.currentVersion as number) ?? 0,
    versions: versions.docs
      .map((v) => ({
        version: v.get("version") as number,
        lines: v.get("lines") as QuoteLine[],
        totals: v.get("totals") as { subtotal: number; discount: number; tax: number; total: number },
        terms: v.get("terms") as string,
        notes: v.get("notes") as string | undefined,
        validUntil: date(v.get("validUntil")),
        createdAt: date(v.get("createdAt")),
        authorName: (v.get("authorName") as string) ?? "",
      }))
      .sort((a, b) => b.version - a.version),
  };
}

export type AdminQuote = NonNullable<Awaited<ReturnType<typeof getAdminQuote>>>;
