"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { toE164 } from "@/lib/domain/phone";
import { searchTokens } from "@/lib/domain/search";
import { adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";

export type CrmResult = { ok: true; id?: string } | { ok: false; message: string };

const phone = z.string().transform((value, ctx) => {
  const e164 = toE164(value);
  if (!e164) ctx.addIssue({ code: "custom", message: "Telefone inválido. Ex.: 923 456 789" });
  return e164 ?? "";
});

const customerSchema = z.object({
  name: z.string().trim().min(2, "Indica o nome.").max(120),
  tradeName: z.string().trim().max(120),
  type: z.enum(["particular", "empresa"]),
  segment: z.enum(["particular", "empresa", "vip"]),
  phone,
  email: z.union([z.literal(""), z.email("Email inválido.")]),
  nif: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^[0-9A-Z]{9,14}$/i.test(v), "NIF inválido."),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20),
  paymentTerms: z.enum(["pronto", "sinal_50", "a_30_dias"]),
});

export type CustomerInput = z.input<typeof customerSchema>;

function fields(data: z.output<typeof customerSchema>) {
  return {
    name: data.name,
    tradeName: data.tradeName || FieldValue.delete(),
    type: data.type,
    segment: data.segment,
    phone: data.phone,
    email: data.email || FieldValue.delete(),
    nif: data.nif || FieldValue.delete(),
    tags: [...new Set(data.tags)],
    paymentTerms: data.paymentTerms,
    searchTokens: searchTokens(data.name, data.tradeName, data.phone, data.email, data.nif),
  };
}

/** Ficha nova (cliente de balcão, sem conta no site). */
export async function createCustomer(input: CustomerInput): Promise<CrmResult> {
  const user = await staffCan("customers", "create");
  if (!user) return NO_PERMISSION;
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const at = Timestamp.now();
  const ref = adminDb().collection("customers").doc();
  const { tradeName, email, nif, ...rest } = fields(parsed.data);
  await ref.set({
    ...rest,
    ...(parsed.data.tradeName ? { tradeName } : {}),
    ...(parsed.data.email ? { email } : {}),
    ...(parsed.data.nif ? { nif } : {}),
    contacts: [],
    addresses: [],
    userIds: [],
    stats: { ordersCount: 0, totalSpent: 0, balanceDue: 0 },
    source: "balcao",
    createdAt: at,
    updatedAt: at,
    createdBy: user.uid,
    updatedBy: user.uid,
  });
  revalidatePath("/admin/clientes");
  return { ok: true, id: ref.id };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<CrmResult> {
  // O Financeiro só edita dados fiscais; aqui exige edição completa de clientes
  const user = await staffCan("customers", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ref = adminDb().collection("customers").doc(id);
  const at = Timestamp.now();
  await adminDb().runTransaction(async (tx) => {
    const before = await tx.get(ref);
    if (!before.exists) throw new Error("Cliente não encontrado.");
    tx.update(ref, { ...fields(parsed.data), updatedAt: at, updatedBy: user.uid });
    tx.set(adminDb().collection("auditLogs").doc(), {
      actorId: user.uid,
      actorName: user.name ?? user.email ?? "Equipa",
      actorRole: user.role,
      action: "customer.updated",
      entity: { type: "customers", id, label: parsed.data.name },
      before: {
        segment: before.get("segment"),
        paymentTerms: before.get("paymentTerms"),
        nif: before.get("nif") ?? null,
      },
      after: { segment: parsed.data.segment, paymentTerms: parsed.data.paymentTerms, nif: parsed.data.nif || null },
      at,
    });
  });
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}

export async function addCustomerNote(id: string, body: string, pinned: boolean): Promise<CrmResult> {
  const user = await staffCan("customers", "edit");
  if (!user) return NO_PERMISSION;
  const text = body.trim();
  if (text.length < 2 || text.length > 2000) return { ok: false, message: "Escreve a nota." };
  await adminDb()
    .collection("customers")
    .doc(id)
    .collection("notes")
    .add({
      body: text,
      pinned,
      authorId: user.uid,
      authorName: user.name ?? user.email ?? "Equipa",
      createdAt: FieldValue.serverTimestamp(),
    });
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}

/**
 * Importação de clientes em CSV (cabeçalho: nome;telefone;email;nif;tipo;etiquetas). Ignora quem já existe
 * pelo telefone e diz quantos entraram e porque é que os outros ficaram de fora.
 */
export async function importCustomersCsv(
  csv: string,
): Promise<{ ok: number; skipped: string[] } | { ok: false; message: string }> {
  const user = await staffCan("customers", "create");
  if (!user || user.role !== "admin") return { ok: false, message: "Só o Administrador importa clientes." };
  const lines = csv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, message: "O ficheiro não tem linhas de clientes." };
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0]
    .toLowerCase()
    .split(sep)
    .map((h) => h.trim());
  const col = (name: string) => head.indexOf(name);
  if (col("nome") < 0 || col("telefone") < 0)
    return { ok: false, message: 'O cabeçalho precisa de "nome" e "telefone".' };

  const db = adminDb();
  const skipped: string[] = [];
  let ok = 0;
  const at = Timestamp.now();
  for (const [i, line] of lines.slice(1, 1001).entries()) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "") : "");
    const parsed = customerSchema.safeParse({
      name: get("nome"),
      tradeName: "",
      type: get("tipo") === "empresa" ? "empresa" : "particular",
      segment: get("tipo") === "empresa" ? "empresa" : "particular",
      phone: get("telefone"),
      email: get("email"),
      nif: get("nif"),
      tags: get("etiquetas")
        .split(/[,|]/)
        .map((t) => t.trim())
        .filter(Boolean),
      paymentTerms: "sinal_50",
    });
    if (!parsed.success) {
      skipped.push(`Linha ${i + 2}: ${parsed.error.issues[0].message}`);
      continue;
    }
    const exists = await db.collection("customers").where("phone", "==", parsed.data.phone).limit(1).get();
    if (!exists.empty) {
      skipped.push(`Linha ${i + 2}: ${parsed.data.phone} já existe`);
      continue;
    }
    const { tradeName: _t, email, nif, ...rest } = fields(parsed.data);
    await db.collection("customers").add({
      ...rest,
      ...(parsed.data.email ? { email } : {}),
      ...(parsed.data.nif ? { nif } : {}),
      contacts: [],
      addresses: [],
      userIds: [],
      stats: { ordersCount: 0, totalSpent: 0, balanceDue: 0 },
      source: "balcao",
      createdAt: at,
      updatedAt: at,
      createdBy: user.uid,
    });
    ok++;
  }
  revalidatePath("/admin/clientes");
  return { ok, skipped };
}
