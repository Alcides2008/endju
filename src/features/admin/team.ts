import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { RoleId } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

const toDate = (t: unknown) => (t as Timestamp | undefined)?.toDate() ?? null;

export type Member = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: RoleId;
  active: boolean;
  lastLoginAt: Date | null;
};

/** Toda a equipa, incluindo quem está desativado. */
export async function listTeam(): Promise<Member[]> {
  const snap = await adminDb().collection("users").where("kind", "==", "equipa").get();
  return snap.docs
    .map((d) => ({
      uid: d.id,
      name: d.get("displayName") ?? d.get("email") ?? "Sem nome",
      email: d.get("email") ?? "",
      phone: d.get("phone") ?? "",
      role: d.get("roleId"),
      active: d.get("active") !== false,
      lastLoginAt: toDate(d.get("lastLoginAt")),
    }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "pt"));
}

export type InviteRow = {
  id: string;
  email: string;
  role: RoleId;
  expiresAt: Date | null;
  status: string;
  invitedByName: string;
};

export async function listInvites(): Promise<InviteRow[]> {
  const snap = await adminDb().collection("invites").where("status", "==", "pendente").get();
  const now = Date.now();
  return snap.docs
    .map((d) => ({
      id: d.id,
      email: d.get("email"),
      role: d.get("roleId"),
      expiresAt: toDate(d.get("expiresAt")),
      status: (toDate(d.get("expiresAt"))?.getTime() ?? 0) < now ? "expirado" : "pendente",
      invitedByName: d.get("invitedByName") ?? "",
    }))
    .sort((a, b) => (b.expiresAt?.getTime() ?? 0) - (a.expiresAt?.getTime() ?? 0));
}
