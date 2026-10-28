"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { ROLES_TAG, type EditableRole } from "@/lib/auth/roles";
import { DEFAULTS, LETTER, MODULES, ROLE_LABELS, type Matrix } from "@/lib/domain/permissions";
import { escapeHtml, sendEmail } from "@/lib/email";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { NO_PERMISSION, staffCan } from "./guard";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const STAFF_ROLES = ["admin", "gestor", "designer", "operador", "financeiro", "atendimento"] as const;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function audit(user: SessionUser, action: string, type: string, id: string, label: string, after?: object) {
  return adminDb()
    .collection("auditLogs")
    .add({
      actorId: user.uid,
      actorName: user.name ?? user.email ?? "Equipa",
      actorRole: user.role,
      action,
      entity: { type, id, label },
      ...(after ? { after } : {}),
      at: Timestamp.now(),
    });
}

const refresh = () => revalidatePath("/admin/equipa", "layout");

/** Há outro Administrador ativo além deste? (docs/03: nunca ficar sem nenhum). */
async function otherActiveAdmin(uid: string) {
  const snap = await adminDb().collection("users").where("roleId", "==", "admin").get();
  return snap.docs.some((d) => d.id !== uid && d.get("active") !== false && d.get("kind") === "equipa");
}

/** Muda o papel de alguém da equipa. A sessão antiga deixa de valer: a pessoa volta a entrar com o papel novo. */
export async function setMemberRole(uid: string, role: string) {
  const user = await staffCan("team", "edit");
  if (!user) return NO_PERMISSION;
  if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]))
    return { ok: false as const, message: "Papel inválido." };
  if (uid === user.uid) return { ok: false as const, message: "Não podes mudar o teu próprio papel." };
  const ref = adminDb().collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists || snap.get("kind") !== "equipa") return { ok: false as const, message: "Membro não encontrado." };
  if (snap.get("roleId") === "admin" && role !== "admin" && !(await otherActiveAdmin(uid)))
    return { ok: false as const, message: "Tem de ficar pelo menos um Administrador ativo." };
  const auth = adminAuth();
  const account = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...account.customClaims, role });
  await auth.revokeRefreshTokens(uid);
  await ref.update({ roleId: role, updatedAt: Timestamp.now() });
  await audit(user, "team.role", "users", uid, snap.get("displayName") ?? snap.get("email") ?? uid, { role });
  refresh();
  return { ok: true as const };
}

/** Desativar tira o acesso sem apagar a conta (fica o histórico do que a pessoa fez). */
export async function setMemberActive(uid: string, active: boolean) {
  const user = await staffCan("team", "edit");
  if (!user) return NO_PERMISSION;
  if (uid === user.uid) return { ok: false as const, message: "Não podes desativar a tua própria conta." };
  const ref = adminDb().collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists || snap.get("kind") !== "equipa") return { ok: false as const, message: "Membro não encontrado." };
  if (!active && snap.get("roleId") === "admin" && !(await otherActiveAdmin(uid)))
    return { ok: false as const, message: "Tem de ficar pelo menos um Administrador ativo." };
  await adminAuth().updateUser(uid, { disabled: !active });
  if (!active) await adminAuth().revokeRefreshTokens(uid);
  await ref.update({ active, updatedAt: Timestamp.now() });
  await audit(user, active ? "team.activated" : "team.deactivated", "users", uid, snap.get("displayName") ?? uid);
  refresh();
  return { ok: true as const };
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Indica um email válido."),
  role: z.enum(STAFF_ROLES),
});

/**
 * Convite para a equipa: link de uso único, válido 7 dias. Guarda-se só o hash do código.
 * Sem email configurado, o painel mostra o link para enviar por WhatsApp.
 */
export async function createInvite(input: z.input<typeof inviteSchema>) {
  const user = await staffCan("team", "create");
  if (!user) return NO_PERMISSION;
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  const { email, role } = parsed.data;
  const db = adminDb();
  const existing = await db.collection("users").where("email", "==", email).limit(1).get();
  if (existing.docs[0]?.get("kind") === "equipa")
    return { ok: false as const, message: "Esta pessoa já faz parte da equipa." };
  const token = randomBytes(24).toString("hex");
  const ref = await db.collection("invites").add({
    email,
    roleId: role,
    tokenHash: hash(token),
    invitedBy: user.uid,
    invitedByName: user.name ?? user.email ?? "Equipa",
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
    status: "pendente",
    createdAt: Timestamp.now(),
  });
  const link = `${SITE}/convite/${token}`;
  const sent = await sendEmail({
    to: email,
    subject: "Convite para a equipa da Endju",
    text: `Foste convidado para o painel da Endju como ${ROLE_LABELS[role]}. Aceita aqui (válido 7 dias): ${link}`,
    html: `<p>Foste convidado para o painel da Endju como <strong>${escapeHtml(ROLE_LABELS[role])}</strong>.</p><p><a href="${link}">Aceitar o convite</a> (válido 7 dias)</p>`,
  });
  await audit(user, "team.invited", "invites", ref.id, email, { role });
  refresh();
  return { ok: true as const, link, emailed: sent.sent };
}

export async function revokeInvite(id: string) {
  const user = await staffCan("team", "edit");
  if (!user) return NO_PERMISSION;
  await adminDb()
    .collection("invites")
    .doc(id)
    .update({ status: "revogado", revokedAt: Timestamp.now(), revokedBy: user.uid });
  refresh();
  return { ok: true as const };
}

/**
 * Aceitar o convite: a conta com o mesmo email passa a ser da equipa, com o papel do convite.
 * A sessão é revogada para o novo papel entrar no cookie; a pessoa volta a entrar.
 */
export async function acceptInvite(token: string) {
  const user = await getSession();
  if (!user) return { ok: false as const, message: "Entra primeiro na tua conta." };
  if (!/^[a-f0-9]{48}$/.test(token)) return { ok: false as const, message: "Convite inválido." };
  const db = adminDb();
  const snap = await db.collection("invites").where("tokenHash", "==", hash(token)).limit(1).get();
  const invite = snap.docs[0];
  if (!invite || invite.get("status") !== "pendente")
    return { ok: false as const, message: "Este convite já foi usado ou revogado." };
  if ((invite.get("expiresAt") as Timestamp).toMillis() < Date.now())
    return { ok: false as const, message: "Este convite expirou. Pede um novo." };
  if ((user.email ?? "").toLowerCase() !== invite.get("email"))
    return { ok: false as const, message: `Este convite é para ${invite.get("email")}. Entra com essa conta.` };
  const role = invite.get("roleId") as string;
  const auth = adminAuth();
  const account = await auth.getUser(user.uid);
  await auth.setCustomUserClaims(user.uid, { ...account.customClaims, role });
  await db
    .collection("users")
    .doc(user.uid)
    .set(
      {
        kind: "equipa",
        roleId: role,
        active: true,
        email: user.email,
        displayName: user.name ?? account.displayName ?? user.email,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  await invite.ref.update({ status: "aceite", acceptedBy: user.uid, acceptedAt: Timestamp.now() });
  await auth.revokeRefreshTokens(user.uid);
  await db.collection("auditLogs").add({
    actorId: user.uid,
    actorName: user.name ?? user.email,
    actorRole: role,
    action: "team.joined",
    entity: { type: "users", id: user.uid, label: user.email ?? user.uid },
    at: Timestamp.now(),
  });
  return { ok: true as const };
}

/** Guarda as permissões de um papel (módulo → letras). O Administrador não se edita; equipa e permissões ficam com ele. */
export async function saveRoleMatrix(role: EditableRole, matrix: Matrix) {
  const user = await staffCan("team", "edit");
  if (!user) return NO_PERMISSION;
  if (!(role in DEFAULTS)) return { ok: false as const, message: "Papel inválido." };
  const letters = new Set(Object.keys(LETTER));
  const clean: Matrix = {};
  for (const mod of MODULES) {
    let value = [...new Set((matrix[mod] ?? "").split(""))].filter((l) => letters.has(l)).join("");
    // Equipa e permissões: os outros papéis podem no máximo ver (gerir fica com o Administrador)
    if (mod === "team") value = value.includes("V") ? "V" : "";
    // Sem ver não há o resto: quem não vê o módulo não o pode usar
    if (value.includes("V")) clean[mod] = value;
  }
  await adminDb()
    .collection("roles")
    .doc(role)
    .set({ name: ROLE_LABELS[role], matrix: clean, system: true, updatedAt: Timestamp.now(), updatedBy: user.uid });
  await audit(user, "role.updated", "roles", role, ROLE_LABELS[role], { matrix: clean });
  updateTag(ROLES_TAG);
  refresh();
  return { ok: true as const };
}

/** Volta um papel às permissões iniciais. */
export async function resetRoleMatrix(role: EditableRole) {
  const user = await staffCan("team", "edit");
  if (!user) return NO_PERMISSION;
  await adminDb().collection("roles").doc(role).delete();
  await audit(user, "role.reset", "roles", role, ROLE_LABELS[role]);
  updateTag(ROLES_TAG);
  refresh();
  return { ok: true as const };
}
