"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { SessionUser } from "@/lib/auth/session";
import { MATERIAL_CATEGORIES, roundQty, UNITS } from "@/lib/domain/stock";
import { adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";
import { moveStock, warnLowStock, type LowStock } from "./stock-ledger";

export type StockResult = { ok: true; id?: string; changed?: number } | { ok: false; message: string };

const qty = z.number().finite().min(0, "A quantidade não pode ser negativa.").max(1_000_000).transform(roundQty);
const cents = z.number().int().min(0).max(1_000_000_000);

const materialSchema = z.object({
  sku: z.string().trim().toUpperCase().min(2, "Indica o código (SKU).").max(30),
  name: z.string().trim().min(3, "Indica o nome do material.").max(120),
  category: z.enum(MATERIAL_CATEGORIES),
  unit: z.enum(UNITS),
  minQty: qty,
  location: z.string().trim().max(60),
  supplierIds: z.array(z.string().min(1)).max(20),
  active: z.boolean(),
});

export type MaterialInput = z.input<typeof materialSchema>;

const actorName = (user: SessionUser) => user.name ?? user.email ?? "Equipa";

function audit(
  tx: FirebaseFirestore.Transaction,
  user: SessionUser,
  action: string,
  id: string,
  label: string,
  after: object,
) {
  tx.set(adminDb().collection("auditLogs").doc(), {
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action,
    entity: { type: "materials", id, label },
    after,
    at: Timestamp.now(),
  });
}

function refresh(id?: string) {
  revalidatePath("/admin/stock", "layout");
  if (id) revalidatePath(`/admin/stock/${id}`);
}

const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

async function skuTaken(sku: string, exceptId?: string) {
  const snap = await adminDb().collection("materials").where("sku", "==", sku).limit(2).get();
  return snap.docs.some((d) => d.id !== exceptId);
}

/** Material novo, com o stock inicial como primeira entrada (para o custo médio começar certo). */
export async function createMaterial(
  input: MaterialInput,
  initial: { qty: number; unitCost: number },
): Promise<StockResult> {
  const user = await staffCan("stock", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const start = z.object({ qty, unitCost: cents }).safeParse(initial);
  if (!start.success) return { ok: false, message: "Stock inicial inválido." };
  if (await skuTaken(parsed.data.sku))
    return { ok: false, message: `Já existe um material com o código ${parsed.data.sku}.` };
  const db = adminDb();
  const ref = db.collection("materials").doc();
  const at = Timestamp.now();
  const material = {
    ...parsed.data,
    location: parsed.data.location || null,
    qty: 0,
    avgCost: 0,
    isLow: true, // começa a zero; a entrada inicial corrige
    createdAt: at,
    updatedAt: at,
    createdBy: user.uid,
  };
  await ref.set(material);
  if (start.data.qty > 0) {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      moveStock(tx, snap, user, {
        type: "entrada",
        delta: start.data.qty,
        unitCost: start.data.unitCost,
        reason: "Stock inicial",
      });
    });
  }
  await db.collection("auditLogs").add({
    actorId: user.uid,
    actorName: actorName(user),
    actorRole: user.role,
    action: "material.created",
    entity: { type: "materials", id: ref.id, label: parsed.data.name },
    after: { sku: parsed.data.sku, qty: start.data.qty },
    at,
  });
  refresh();
  return { ok: true, id: ref.id };
}

export async function updateMaterial(id: string, input: MaterialInput): Promise<StockResult> {
  const user = await staffCan("stock", "edit");
  if (!user) return NO_PERMISSION;
  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (await skuTaken(parsed.data.sku, id))
    return { ok: false, message: `Já existe um material com o código ${parsed.data.sku}.` };
  const ref = adminDb().collection("materials").doc(id);
  try {
    await adminDb().runTransaction(async (tx) => {
      const before = await tx.get(ref);
      if (!before.exists) throw new Error("Material não encontrado.");
      // A unidade não muda depois de haver movimentos: o histórico deixaria de bater certo
      if (before.get("unit") !== parsed.data.unit && (before.get("qty") ?? 0) !== 0)
        throw new Error("Só podes mudar a unidade com o stock a zero.");
      tx.update(ref, {
        ...parsed.data,
        location: parsed.data.location || null,
        isLow: (before.get("qty") ?? 0) <= parsed.data.minQty,
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
      });
      audit(tx, user, "material.updated", id, parsed.data.name, {
        minQty: parsed.data.minQty,
        active: parsed.data.active,
      });
    });
  } catch (error) {
    return fail(error, "Não foi possível guardar.");
  }
  refresh(id);
  return { ok: true };
}

const movementSchema = z.object({
  materialId: z.string().min(1),
  type: z.enum(["entrada", "saida", "ajuste"]),
  /** Entrada e saída: quantidade a somar ou tirar. Ajuste: o saldo certo agora. */
  qty,
  unitCost: cents.optional(),
  reason: z.string().trim().max(200),
  taskId: z.string().optional(),
});

export type MovementInput = z.input<typeof movementSchema>;

/**
 * Movimento manual. Saída (consumo na oficina): quem tem "criar" no Stock, como o Operador.
 * Entrada sem encomenda: quem edita o Stock. Ajuste: só o Gestor (docs/03 · ação especial do Stock).
 */
export async function recordMovement(input: MovementInput): Promise<StockResult> {
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { type, materialId, taskId } = parsed.data;
  const user = await staffCan("stock", type === "saida" ? "create" : type === "entrada" ? "edit" : "approve");
  if (!user) return NO_PERMISSION;
  if (type !== "ajuste" && parsed.data.qty <= 0) return { ok: false, message: "Indica a quantidade." };
  if (type === "ajuste" && !parsed.data.reason) return { ok: false, message: "Diz o motivo do ajuste." };
  const db = adminDb();
  let low: LowStock | null = null;
  try {
    await db.runTransaction(async (tx) => {
      const [material, task] = await Promise.all([
        tx.get(db.collection("materials").doc(materialId)),
        taskId ? tx.get(db.collection("productionTasks").doc(taskId)) : null,
      ]);
      if (!material.exists) throw new Error("Material não encontrado.");
      if (taskId && !task?.exists) throw new Error("Tarefa não encontrada.");
      const current = (material.get("qty") as number) ?? 0;
      const delta =
        type === "saida" ? -parsed.data.qty : type === "entrada" ? parsed.data.qty : parsed.data.qty - current;
      if (delta === 0) throw new Error("O saldo já é esse.");
      low = moveStock(tx, material, user, {
        type,
        delta,
        unitCost: type === "entrada" ? parsed.data.unitCost : undefined,
        reason:
          parsed.data.reason ||
          (task
            ? `Consumo · ${task.get("itemName")}` // o número do pedido aparece como link ao lado
            : type === "saida"
              ? "Saída"
              : "Entrada"),
        ...(task
          ? { orderId: task.get("orderId"), orderNumber: task.get("orderNumber"), productionTaskId: task.id }
          : {}),
      });
      if (type === "ajuste")
        audit(tx, user, "stock.adjusted", materialId, material.get("name"), { from: current, to: parsed.data.qty });
    });
  } catch (error) {
    return fail(error, "Não foi possível registar.");
  }
  await warnLowStock([low]);
  refresh(materialId);
  if (taskId) revalidatePath("/admin/producao");
  return { ok: true };
}

/**
 * Fecha uma contagem de inventário: cada diferença vira um movimento "inventario" (docs/02 · inventoryCounts).
 * shortcut: a contagem faz-se de uma vez (não fica guardada aberta); até ~200 materiais por transação.
 */
export async function closeInventory(lines: { materialId: string; counted: number }[]): Promise<StockResult> {
  const user = await staffCan("stock", "approve");
  if (!user) return NO_PERMISSION;
  const parsed = z
    .array(z.object({ materialId: z.string().min(1), counted: qty }))
    .min(1, "Conta pelo menos um material.")
    .max(200)
    .safeParse(lines);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const ids = new Set(parsed.data.map((l) => l.materialId));
  if (ids.size !== parsed.data.length) return { ok: false, message: "Material repetido na contagem." };
  const db = adminDb();
  const countRef = db.collection("inventoryCounts").doc();
  const lows: (LowStock | null)[] = [];
  let changed = 0;
  try {
    await db.runTransaction(async (tx) => {
      lows.length = 0;
      changed = 0;
      const materials = await Promise.all(parsed.data.map((l) => tx.get(db.collection("materials").doc(l.materialId))));
      const at = Timestamp.now();
      const result = parsed.data.map((line, i) => {
        const material = materials[i];
        if (!material.exists) throw new Error("Um dos materiais já não existe. Atualiza a página.");
        const expected = (material.get("qty") as number) ?? 0;
        const delta = roundQty(line.counted - expected);
        if (delta !== 0) {
          changed++;
          lows.push(
            moveStock(tx, material, user, {
              type: "inventario",
              delta,
              reason: "Contagem de inventário",
              inventoryCountId: countRef.id,
            }),
          );
        }
        return { materialId: line.materialId, expected, counted: line.counted };
      });
      tx.set(countRef, { status: "fechada", lines: result, changed, closedAt: at, closedBy: user.uid, createdAt: at });
      tx.set(db.collection("auditLogs").doc(), {
        actorId: user.uid,
        actorName: actorName(user),
        actorRole: user.role,
        action: "stock.inventory_closed",
        entity: { type: "inventoryCounts", id: countRef.id, label: `${result.length} materiais` },
        after: { changed },
        at,
      });
    });
  } catch (error) {
    return fail(error, "Não foi possível fechar o inventário.");
  }
  await warnLowStock(lows);
  refresh();
  return { ok: true, id: countRef.id, changed };
}
