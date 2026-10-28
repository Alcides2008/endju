"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getSession } from "@/lib/auth/session";
import { searchTokens } from "@/lib/domain/search";
import { adminDb } from "@/lib/firebase/admin";
import { nextNumber } from "@/lib/firebase/counters";
import { LIMITS, RATE_LIMITED, rateLimit } from "@/lib/rate-limit";
import { AUDIENCE, notifyRoles } from "@/features/admin/notify";
import { quoteRequestSchema, type QuoteRequestInput } from "./schema";

export type QuoteRequestResult = { ok: true; number: string } | { ok: false; message: string };

/** Orçamento personalizado → quotes/{id} com número ORC-AAAA-NNNNN e o lead no funil, na mesma transação. */
export async function requestQuote(input: QuoteRequestInput): Promise<QuoteRequestResult> {
  // Robô que preencheu o campo escondido: responde como se tivesse corrido bem e não grava nada
  if (input.website) return { ok: true, number: "ORC" };
  const parsed = quoteRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revê os campos assinalados e tenta outra vez." };
  if (!(await rateLimit("quote", LIMITS.quote))) return { ok: false, message: RATE_LIMITED };

  const { name, phone, email, company, description, quantity, deadline, budgetRange } = parsed.data;
  const user = await getSession();
  const db = adminDb();
  const quoteRef = db.collection("quotes").doc();
  const leadRef = db.collection("leads").doc();
  const now = FieldValue.serverTimestamp();
  try {
    const number = await db.runTransaction(async (tx) => {
      const quoteNumber = await nextNumber(tx, "quotes", "ORC");
      tx.set(quoteRef, {
        number: quoteNumber,
        kind: "personalizado",
        leadId: leadRef.id,
        userId: user?.uid,
        contact: { name, phone, email: email || undefined, company: company || undefined },
        request: {
          description,
          quantity: quantity || undefined,
          deadline: deadline ? Timestamp.fromDate(new Date(`${deadline}T12:00:00`)) : undefined,
          budgetRange,
          fileIds: [],
        },
        status: "novo",
        currentVersion: 0,
        searchTokens: searchTokens(quoteNumber, name, phone, email, company),
        createdAt: now,
        updatedAt: now,
      });
      tx.set(leadRef, {
        name,
        phone,
        email: email || undefined,
        company: company || undefined,
        source: "orcamento",
        interest: "personalizado",
        message: description,
        quoteId: quoteRef.id,
        stage: "novo",
        consentAt: now,
        searchTokens: searchTokens(name, phone, email, company),
        createdAt: now,
        updatedAt: now,
      });
      return quoteNumber;
    });
    await notifyRoles(AUDIENCE.sales, {
      event: "orcamento.novo",
      title: `Novo pedido de orçamento ${number}`,
      body: `${name}${company ? ` · ${company}` : ""}`,
      link: `/admin/orcamentos/${quoteRef.id}`,
    });
    return { ok: true, number };
  } catch (error) {
    console.error("[orcamento] falha ao gravar o pedido", error);
    return {
      ok: false,
      message: "Não conseguimos enviar agora. Tenta de novo daqui a pouco ou fala connosco no WhatsApp.",
    };
  }
}
