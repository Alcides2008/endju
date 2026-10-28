import Link from "next/link";
import { cn } from "@/lib/utils";

/** Separadores de uma secção do painel (Stock: materiais, movimentos, inventário; Compras: encomendas, fornecedores). */
export function SectionTabs({ tabs, current }: { tabs: { href: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Secções" className="mb-6 flex gap-1 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm",
            tab.href === current ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export const STOCK_TABS = [
  { href: "/admin/stock", label: "Materiais" },
  { href: "/admin/stock/movimentos", label: "Movimentos" },
  { href: "/admin/stock/inventario", label: "Inventário" },
];

export const PURCHASING_TABS = [
  { href: "/admin/compras/encomendas", label: "Encomendas" },
  { href: "/admin/compras/fornecedores", label: "Fornecedores" },
];

export const CATALOG_TABS = [
  { href: "/admin/catalogo/produtos", label: "Produtos" },
  { href: "/admin/catalogo/servicos", label: "Serviços" },
];

export const CONTENT_TABS = [
  { href: "/admin/conteudo/blog", label: "Blog" },
  { href: "/admin/conteudo/faq", label: "Perguntas frequentes" },
  { href: "/admin/conteudo/testemunhos", label: "Testemunhos" },
  { href: "/admin/conteudo/banners", label: "Banners" },
];

export const FINANCE_TABS = [
  { href: "/admin/financeiro", label: "Resumo" },
  { href: "/admin/financeiro/pagamentos", label: "Pagamentos" },
  { href: "/admin/financeiro/dividas", label: "Dívidas" },
  { href: "/admin/financeiro/despesas", label: "Despesas" },
  { href: "/admin/financeiro/faturas", label: "Faturas" },
  { href: "/admin/financeiro/conciliacao", label: "Conciliação" },
  { href: "/admin/financeiro/iva", label: "IVA" },
];

export const MARKETING_TABS = [
  { href: "/admin/marketing/leads", label: "Leads" },
  { href: "/admin/marketing/cupoes", label: "Cupões" },
  { href: "/admin/marketing/campanhas", label: "Campanhas" },
  { href: "/admin/marketing/newsletter", label: "Newsletter" },
  { href: "/admin/marketing/popups", label: "Pop-ups" },
];

export const COMMUNICATION_TABS = [
  { href: "/admin/comunicacao/modelos", label: "Modelos" },
  { href: "/admin/comunicacao/historico", label: "Histórico" },
  { href: "/admin/mensagens", label: "Mensagens dos clientes" },
];

export const TEAM_TABS = [
  { href: "/admin/equipa", label: "Membros e convites" },
  { href: "/admin/equipa/papeis", label: "Papéis e permissões" },
];
