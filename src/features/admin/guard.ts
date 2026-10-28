import "server-only";
import { notFound } from "next/navigation";
import { getSession, requireStaff, type SessionUser } from "@/lib/auth/session";
import { can, isStaff, type Action, type Module } from "@/lib/domain/permissions";

/**
 * Páginas do painel: exige sessão de equipa e permissão no módulo (docs/03 · matriz RBAC).
 * Sem permissão responde 404, para não revelar o que existe.
 */
export async function requireModule(module: Module, action: Action = "view", path = "/admin") {
  const user = await requireStaff(path);
  if (!can(user, module, action)) notFound();
  return user;
}

/** Server Actions do painel: o utilizador da equipa, se tiver a permissão; senão null. */
export async function staffCan(module: Module, action: Action): Promise<SessionUser | null> {
  const user = await getSession();
  return user && isStaff(user.role) && can(user, module, action) ? user : null;
}

export const NO_PERMISSION = { ok: false as const, message: "Não tens permissão para esta ação." };
