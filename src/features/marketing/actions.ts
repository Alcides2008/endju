"use server";

import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { escapeHtml, sendEmail } from "@/lib/email";
import { adminDb } from "@/lib/firebase/admin";
import { LIMITS, RATE_LIMITED, rateLimit } from "@/lib/rate-limit";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Indica um email válido.").max(160),
  name: z.string().trim().max(80),
  website: z.string().max(0).optional(), // campo escondido: só robôs o preenchem
});

/**
 * Inscrição na newsletter com dupla confirmação (docs/02 · newsletterSubscribers): fica pendente até a pessoa
 * abrir o link do email. Sem email configurado (Resend), a inscrição fica guardada como pendente.
 * Limite por IP: cada inscrição manda um email, não pode servir para bombardear caixas alheias.
 */
export async function subscribeNewsletter(input: z.input<typeof subscribeSchema>) {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  if (input.website) return { ok: true as const, message: "Obrigado." };
  if (!(await rateLimit("newsletter", LIMITS.newsletter))) return { ok: false as const, message: RATE_LIMITED };
  const { email, name } = parsed.data;
  // Um documento por email: inscrever-se duas vezes não duplica
  const ref = adminDb()
    .collection("newsletterSubscribers")
    .doc(createHash("sha256").update(email).digest("hex").slice(0, 32));
  const token = randomBytes(24).toString("hex");
  try {
    const snap = await ref.get();
    if (snap.get("status") === "confirmado") return { ok: true as const, message: "Já estás inscrito. Obrigado!" };
    await ref.set(
      {
        email,
        name: name || null,
        status: "pendente",
        source: "newsletter",
        tags: [],
        token,
        consentAt: Timestamp.now(),
        ...(snap.exists ? {} : { createdAt: Timestamp.now() }),
      },
      { merge: true },
    );
    const link = `${SITE}/newsletter?confirmar=${token}`;
    const sent = await sendEmail({
      to: email,
      subject: "Confirma a tua inscrição na newsletter da Endju",
      text: `Olá${name ? ` ${name}` : ""}, confirma a inscrição neste link: ${link}\n\nSe não foste tu, ignora este email.`,
      html: `<p>Olá${name ? ` ${escapeHtml(name)}` : ""},</p><p>Confirma a tua inscrição na newsletter da Endju:</p><p><a href="${link}">Confirmar inscrição</a></p><p>Se não foste tu, ignora este email.</p>`,
    });
    return {
      ok: true as const,
      message: sent.sent
        ? "Quase feito: enviámos um email para confirmares a inscrição."
        : "Inscrição recebida. Obrigado!",
    };
  } catch (error) {
    console.error("[newsletter] falha na inscrição", error);
    return { ok: false as const, message: "Não conseguimos guardar agora. Tenta de novo daqui a pouco." };
  }
}

/** Visualizações e cliques de um pop-up. O browser só conta uma vez por pop-up em cada período. */
export async function trackPopup(id: string, kind: "view" | "conversion") {
  if (!/^[\w-]{10,40}$/.test(id)) return;
  const ref = adminDb().collection("popups").doc(id);
  try {
    const snap = await ref.get();
    if (!snap.exists || !snap.get("active")) return;
    await ref.update({ [`stats.${kind === "view" ? "views" : "conversions"}`]: FieldValue.increment(1) });
  } catch {
    // Estatística: uma falha aqui nunca incomoda quem visita o site
  }
}
