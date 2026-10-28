import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import type { RoleId } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

export type NotificationEvent =
  | "pedido.novo"
  | "pedido.estado"
  | "pagamento.confirmado"
  | "prova.enviada"
  | "prova.decisao"
  | "orcamento.novo"
  | "orcamento.enviado"
  | "mensagem.nova"
  | "stock.baixo"
  | "prazo.a_expirar"
  | "tarefa.atribuida";

type Payload = { event: NotificationEvent; title: string; body: string; link: string };

/**
 * Notificações do painel (docs/02 · notifications): um documento por destinatário, lido em tempo real no sino.
 * Best effort: corre depois da escrita principal e nunca a desfaz (um aviso perdido não pode estragar um pedido).
 * O email ao cliente sai em features/messages (emailCustomer); o WhatsApp automático espera pela API da Meta.
 */
export async function notifyRoles(roles: RoleId[], payload: Payload, exceptUid?: string) {
  try {
    const db = adminDb();
    const staff = await db.collection("users").where("roleId", "in", roles).get();
    const batch = db.batch();
    for (const user of staff.docs) {
      if (user.id === exceptUid || user.get("active") === false) continue;
      batch.set(db.collection("notifications").doc(), {
        recipientId: user.id,
        ...payload,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.error("[notificações] falhou", payload.event, error);
  }
}

export async function notifyUser(uid: string, payload: Payload) {
  try {
    await adminDb()
      .collection("notifications")
      .add({ recipientId: uid, ...payload, read: false, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error("[notificações] falhou", payload.event, error);
  }
}

/** Quem trata de cada tipo de aviso (docs/04 · Notificações). */
export const AUDIENCE = {
  sales: ["admin", "gestor", "atendimento"] as RoleId[],
  design: ["admin", "gestor", "designer"] as RoleId[],
  finance: ["admin", "gestor", "financeiro"] as RoleId[],
  managers: ["admin", "gestor"] as RoleId[],
};
