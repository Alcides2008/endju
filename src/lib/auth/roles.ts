import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULTS, MODULES, type Matrix, type RoleId } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

/** Papéis editados no painel (Equipa → Papéis), em cache até alguém os guardar (updateTag(ROLES_TAG)). */
export const ROLES_TAG = "roles";

export type EditableRole = Exclude<RoleId, "admin" | "cliente">;

/** Matriz de permissões de todos os papéis editáveis: a guardada, ou a inicial do código. */
export async function getRoleMatrices(): Promise<Record<EditableRole, Matrix>> {
  "use cache";
  cacheLife("max");
  cacheTag(ROLES_TAG);
  const snap = await adminDb().collection("roles").get();
  const saved = new Map(snap.docs.map((d) => [d.id, d.get("matrix") as Matrix | undefined]));
  return Object.fromEntries(
    (Object.keys(DEFAULTS) as EditableRole[]).map((role) => {
      const matrix = saved.get(role);
      // Só módulos conhecidos: um campo estranho no documento nunca dá acesso
      return [
        role,
        matrix ? Object.fromEntries(MODULES.filter((m) => matrix[m]).map((m) => [m, matrix[m]!])) : DEFAULTS[role],
      ];
    }),
  ) as Record<EditableRole, Matrix>;
}

export async function getRolePerms(role: RoleId): Promise<Matrix | undefined> {
  if (role === "admin" || role === "cliente") return undefined;
  return (await getRoleMatrices())[role];
}
