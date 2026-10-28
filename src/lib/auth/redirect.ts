import { isStaff, type RoleId } from "@/lib/domain/permissions";

/**
 * Aceita só caminhos internos no parâmetro `?voltar=`, para não abrir redirecionamentos para outros sites.
 * Rejeita `//site`, `/\site` e caracteres de controlo (o browser remove tabs/quebras e `/\t/site` vira `//site`).
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value?.startsWith("/") || value[1] === "/") return null;
  for (const char of value) {
    if (char === "\\" || char.charCodeAt(0) <= 0x20) return null;
  }
  return value;
}

/** Destino depois do login: o `voltar` pedido, se o papel lhe tiver acesso; senão a casa do papel. */
export function postLoginPath(role: RoleId, voltar: string | null | undefined): string {
  const home = isStaff(role) ? "/admin" : "/conta";
  const target = safeRedirectPath(voltar);
  if (!target) return home;
  if (target.startsWith("/admin") && !isStaff(role)) return home;
  return target;
}
