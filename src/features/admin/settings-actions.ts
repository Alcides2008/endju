"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { DELIVERY_ZONES } from "@/content/delivery";
import { SETTINGS_TAG } from "@/features/settings/server";
import type { SessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const companySchema = z.object({
  address: optional(200),
  phone: z
    .union([z.literal(""), z.string().regex(/^\+244\d{9}$/, "Telefone no formato +244 9XX XXX XXX.")])
    .transform((v) => v || null),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido.")]).transform((v) => v || null),
  nif: optional(20),
  hours: z.array(z.object({ days: z.string().trim().min(1).max(40), time: z.string().trim().min(1).max(40) })).max(7),
  banks: z
    .array(
      z.object({
        bank: z.string().trim().min(2, "Indica o banco.").max(40),
        iban: z
          .string()
          .trim()
          .transform((v) => v.replace(/\s+/g, " ").toUpperCase())
          .pipe(z.string().regex(/^AO06( ?\d){21}$/, "IBAN angolano: AO06 seguido de 21 algarismos.")),
        holder: z.string().trim().min(2, "Indica o titular.").max(80),
      }),
    )
    .max(4),
});

export type CompanyInput = z.input<typeof companySchema>;

async function save(user: SessionUser, doc: "company" | "commerce", data: object) {
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    tx.set(
      db.collection("settings").doc(doc),
      { ...data, updatedAt: Timestamp.now(), updatedBy: user.uid },
      { merge: true },
    );
    tx.set(db.collection("auditLogs").doc(), {
      actorId: user.uid,
      actorName: user.name ?? user.email ?? "Equipa",
      actorRole: user.role,
      action: "settings.updated",
      entity: { type: "settings", id: doc, label: doc === "company" ? "empresa" : "pagamentos e entregas" },
      after: data,
      at: Timestamp.now(),
    });
  });
  // O site, os PDFs e o checkout leem as definições em cache: passam logo a usar as novas
  updateTag(SETTINGS_TAG);
  revalidatePath("/admin/definicoes");
}

/** Dados da empresa (site, pro-forma, proposta). O WhatsApp é o mesmo número do telefone. */
export async function saveCompany(input: CompanyInput) {
  const user = await staffCan("settings", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  const data = parsed.data;
  await save(user, "company", { ...data, whatsapp: data.phone ? data.phone.replace(/\D/g, "") : null });
  return { ok: true as const };
}

const commerceSchema = z.object({
  depositPct: z.number().int().min(0).max(100),
  zones: z.record(
    z.enum(DELIVERY_ZONES.map((z) => z.id) as [string, ...string[]]),
    z.object({
      fee: z.number().int().min(0).max(100_000_000),
      extraDays: z.number().int().min(0).max(30),
      active: z.boolean(),
    }),
  ),
  pickup: z.object({ address: z.string().trim().max(200), hours: z.string().trim().max(120) }),
});

export type CommerceInput = z.input<typeof commerceSchema>;

/** Sinal para começar a produção, entregas por zona e ponto de levantamento. Valem para os pedidos novos. */
export async function saveCommerce(input: CommerceInput) {
  const user = await staffCan("settings", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = commerceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  if (!Object.values(parsed.data.zones).some((z) => z.active))
    return { ok: false as const, message: "Deixa pelo menos uma zona de entrega ativa." };
  await save(user, "commerce", parsed.data);
  return { ok: true as const };
}
