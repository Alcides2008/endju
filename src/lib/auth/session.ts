import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { isRoleId, isStaff, type Matrix, type RoleId } from "@/lib/domain/permissions";
import { getRolePerms } from "./roles";
import { SESSION_COOKIE } from "./constants";

export type SessionUser = {
  uid: string;
  role: RoleId;
  name?: string;
  email?: string;
  phone?: string;
  /** Permissões do papel, editáveis no painel (só equipa, exceto Administrador) */
  perms?: Matrix;
};

/**
 * Utilizador da sessão atual, verificado com o Admin SDK (uma vez por pedido).
 * `checkRevoked` apanha contas desativadas e mudanças de papel sem esperar os 14 dias do cookie.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  // A verificação usa a hora atual (expiração): marca o resto como pedido-a-pedido para o pré-render do Next
  await connection();
  try {
    const token = await adminAuth().verifySessionCookie(value, true);
    const role: RoleId = isRoleId(token.role) ? token.role : "cliente";
    return {
      uid: token.uid,
      role,
      perms: isStaff(role) ? await getRolePerms(role) : undefined,
      name: token.name as string | undefined,
      email: token.email,
      phone: token.phone_number,
    };
  } catch {
    return null;
  }
});

/** Exige sessão; sem ela manda para o login e volta a `path` depois. */
export async function requireSession(path: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/entrar?voltar=${encodeURIComponent(path)}`);
  return user;
}

/** Área do cliente: a equipa vai para o painel. */
export async function requireCustomer(path: string) {
  const user = await requireSession(path);
  if (isStaff(user.role)) redirect("/admin");
  return user;
}

/** Painel: só papéis de equipa. */
export async function requireStaff(path: string) {
  const user = await requireSession(path);
  if (!isStaff(user.role)) redirect("/conta");
  return user;
}
