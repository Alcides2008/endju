import type { Metadata } from "next";
import { AdminShell } from "@/components/layout/admin-shell";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

/**
 * Moldura estática do painel (não lê a sessão): cada página verifica sessão, papel e permissão com requireModule,
 * e o proxy barra quem não tem cookie. Assim a navegação entre módulos mostra logo o loading.tsx.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
