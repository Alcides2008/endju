"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { LIMITS, RATE_LIMITED, rateLimit } from "@/lib/rate-limit";
import { searchTokens } from "@/lib/domain/search";
import { contactSchema, type ContactInput } from "./schema";

export type ContactResult = { ok: true } | { ok: false; message: string };

/** Mensagem do formulário de contacto → lead no funil (o painel lê-a na Etapa 6). */
export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  // Robô que preencheu o campo escondido: responde como se tivesse corrido bem e não grava nada
  if (input.website) return { ok: true };
  if (!parsed.success) return { ok: false, message: "Revê os campos assinalados e tenta outra vez." };

  const { name, phone, email, company, subject, message } = parsed.data;
  if (!(await rateLimit("contact", LIMITS.contact))) return { ok: false, message: RATE_LIMITED };
  try {
    await adminDb()
      .collection("leads")
      .add({
        name,
        phone,
        email: email || undefined,
        company: company || undefined,
        source: "contacto",
        interest: subject,
        message,
        stage: "novo",
        consentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        searchTokens: searchTokens(name, phone, email, company),
      });
    return { ok: true };
  } catch (error) {
    console.error("[contacto] falha ao gravar lead", error);
    return {
      ok: false,
      message: "Não conseguimos enviar agora. Tenta de novo daqui a pouco ou fala connosco no WhatsApp.",
    };
  }
}
