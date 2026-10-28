import {
  BarChart3,
  ScrollText,
  Settings,
  UserCog,
  Boxes,
  BookOpen,
  Factory,
  Images,
  FileCheck2,
  Inbox,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Send,
  Newspaper,
  ReceiptText,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Module } from "@/lib/domain/permissions";

/**
 * Módulos do painel já construídos (Etapas 6.1 a 6.5). Os restantes entram aqui à medida que forem feitos
 * (ver docs/03-rotas-e-permissoes.md · Painel).
 */
export const ADMIN_NAV: { href: string; label: string; module: Module; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", module: "dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", module: "orders", icon: Inbox },
  { href: "/admin/producao", label: "Produção", module: "production", icon: Factory },
  { href: "/admin/provas", label: "Provas", module: "proofs", icon: FileCheck2 },
  { href: "/admin/orcamentos", label: "Orçamentos", module: "quotes", icon: ReceiptText },
  { href: "/admin/clientes", label: "Clientes", module: "customers", icon: Users },
  { href: "/admin/financeiro", label: "Financeiro", module: "finance", icon: Landmark },
  { href: "/admin/marketing", label: "Marketing", module: "marketing", icon: Megaphone },
  { href: "/admin/stock", label: "Stock", module: "stock", icon: Boxes },
  { href: "/admin/compras", label: "Compras", module: "purchasing", icon: Truck },
  { href: "/admin/catalogo", label: "Catálogo", module: "catalog", icon: BookOpen },
  { href: "/admin/portfolio", label: "Portfólio", module: "portfolio", icon: Images },
  { href: "/admin/conteudo", label: "Conteúdo", module: "cms", icon: Newspaper },
  { href: "/admin/mensagens", label: "Mensagens", module: "messaging", icon: MessagesSquare },
  { href: "/admin/comunicacao", label: "Comunicação", module: "messaging", icon: Send },
  { href: "/admin/relatorios", label: "Relatórios", module: "reports", icon: BarChart3 },
  { href: "/admin/equipa", label: "Equipa", module: "team", icon: UserCog },
  { href: "/admin/auditoria", label: "Auditoria", module: "audit", icon: ScrollText },
  { href: "/admin/definicoes", label: "Definições", module: "settings", icon: Settings },
];
