/**
 * Papéis, módulos e permissões por omissão (docs/03-rotas-e-permissoes.md).
 * Função pura: usada no servidor (Server Actions, layouts) e no cliente (mostrar/esconder UI).
 * As permissões de cada papel editam-se no painel (roles/{roleId}); isto é o valor inicial e o de recurso.
 */

export const MODULES = [
  "dashboard",
  "orders",
  "quotes",
  "customers",
  "production",
  "proofs",
  "catalog",
  "stock",
  "purchasing",
  "finance",
  "portfolio",
  "cms",
  "marketing",
  "messaging",
  "team",
  "reports",
  "audit",
  "settings",
] as const;
export type Module = (typeof MODULES)[number];

export const ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;
export type Action = (typeof ACTIONS)[number];

export const ROLE_IDS = ["admin", "gestor", "designer", "operador", "financeiro", "atendimento", "cliente"] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const ROLE_LABELS: Record<RoleId, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  designer: "Designer",
  operador: "Operador de produção",
  financeiro: "Financeiro",
  atendimento: "Atendimento",
  cliente: "Cliente",
};

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && (ROLE_IDS as readonly string[]).includes(value);
}

export function isStaff(role: RoleId): boolean {
  return role !== "cliente";
}

// Letras como na matriz da documentação: V ver · C criar · E editar · X eliminar · A ação especial · D exportar
export const LETTER: Record<string, Action> = {
  V: "view",
  C: "create",
  E: "edit",
  X: "delete",
  A: "approve",
  D: "export",
};

export type Matrix = Partial<Record<Module, string>>;

export const DEFAULTS: Record<Exclude<RoleId, "admin" | "cliente">, Matrix> = {
  gestor: {
    dashboard: "V",
    orders: "VCEAD",
    quotes: "VCEAD",
    customers: "VCED",
    production: "VCEA",
    proofs: "VCEA",
    catalog: "VCE",
    stock: "VCEAD",
    purchasing: "VCEA",
    finance: "VD",
    portfolio: "VCEA",
    cms: "VCEA",
    marketing: "VCED",
    messaging: "VCE",
    team: "V",
    reports: "VD",
    audit: "V",
    settings: "V",
  },
  designer: {
    dashboard: "V",
    orders: "VE",
    quotes: "V",
    customers: "V",
    production: "VE",
    proofs: "VCE",
    catalog: "V",
    portfolio: "VCE",
    cms: "VCE",
    messaging: "V",
  },
  operador: {
    dashboard: "V",
    orders: "VE",
    production: "VE",
    proofs: "V",
    catalog: "V",
    stock: "VC",
    purchasing: "V",
  },
  financeiro: {
    dashboard: "V",
    orders: "VD",
    quotes: "V",
    customers: "VE",
    catalog: "V",
    stock: "VD",
    purchasing: "VEAD",
    finance: "VCEAD",
    marketing: "V",
    reports: "VD",
    settings: "VE",
  },
  atendimento: {
    dashboard: "V",
    orders: "VCE",
    quotes: "VCEA",
    customers: "VCE",
    production: "V",
    proofs: "VC",
    catalog: "V",
    finance: "VC",
    portfolio: "V",
    cms: "VE",
    marketing: "VE",
    messaging: "VCE",
  },
};

/** Quem pede: o papel, com as permissões editadas no painel quando já foram carregadas (sessão). */
export type Subject = RoleId | { role: RoleId; perms?: Matrix };

/** Pode executar esta ação neste módulo do painel? O Administrador pode tudo; o cliente nunca acede ao painel. */
export function can(subject: Subject, module: Module, action: Action): boolean {
  const role = typeof subject === "string" ? subject : subject.role;
  if (role === "admin") return true;
  if (role === "cliente") return false;
  const matrix = (typeof subject === "object" && subject.perms) || DEFAULTS[role];
  return [...(matrix[module] ?? "")].some((letter) => LETTER[letter] === action);
}

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  orders: "Pedidos",
  quotes: "Orçamentos",
  customers: "Clientes",
  production: "Produção",
  proofs: "Provas",
  catalog: "Catálogo",
  stock: "Stock",
  purchasing: "Compras",
  finance: "Financeiro",
  portfolio: "Portfólio",
  cms: "Conteúdo",
  marketing: "Marketing",
  messaging: "Mensagens e comunicação",
  team: "Equipa",
  reports: "Relatórios",
  audit: "Auditoria",
  settings: "Definições",
};
