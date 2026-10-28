/** Estados do pedido e do pagamento (docs/04-fluxos.md). A máquina de estados entra na Etapa 4. */

export const ORDER_STATUSES = [
  "recebido",
  "em_design",
  "em_aprovacao",
  "em_producao",
  "pronto",
  "entregue",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pendente", "parcial", "pago", "reembolsado"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type Tone = "neutral" | "info" | "brand" | "warning" | "success" | "danger" | "process";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  recebido: { label: "Recebido", tone: "info" },
  em_design: { label: "Em design", tone: "process" },
  em_aprovacao: { label: "Em aprovação", tone: "warning" },
  em_producao: { label: "Em produção", tone: "brand" },
  pronto: { label: "Pronto", tone: "success" },
  entregue: { label: "Entregue", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Por pagar", tone: "warning" },
  parcial: { label: "Sinal pago", tone: "info" },
  pago: { label: "Pago", tone: "success" },
  reembolsado: { label: "Reembolsado", tone: "neutral" },
};

// ── Máquina de estados (docs/04-fluxos.md · Estado do pedido) ───────────────

/** Estados que o cliente vê na linha do tempo, por ordem. */
export const TIMELINE: OrderStatus[] = ["recebido", "em_design", "em_aprovacao", "em_producao", "pronto", "entregue"];

export const ACTIVE_STATUSES: OrderStatus[] = ["recebido", "em_design", "em_aprovacao", "em_producao", "pronto"];

/** Revisões de prova incluídas no preço (decisão 8); a partir da seguinte, o Atendimento avisa do custo. */
export const INCLUDED_REVISIONS = 3;

export type ProofStatus = "nao_necessaria" | "pendente" | "enviada" | "aprovada" | "alteracoes";

/**
 * Estado do pedido depois de o cliente aprovar uma prova: entra em produção só com todas as provas aprovadas
 * e o sinal pago; senão fica em aprovação ("Aprovado · a aguardar sinal").
 */
export function statusAfterApproval(input: { itemProofs: ProofStatus[]; paid: number; depositRequired: number }): {
  status: OrderStatus;
  waitingDeposit: boolean;
} {
  const allApproved = input.itemProofs.every((s) => s === "aprovada" || s === "nao_necessaria");
  if (!allApproved) return { status: "em_aprovacao", waitingDeposit: false };
  if (input.paid >= input.depositRequired) return { status: "em_producao", waitingDeposit: false };
  return { status: "em_aprovacao", waitingDeposit: true };
}

/** O cliente só cancela sozinho um pedido ainda em "recebido" e sem pagamentos (docs/04). */
export function customerCanCancel(order: { status: OrderStatus; paid: number }) {
  return order.status === "recebido" && order.paid === 0;
}

// ── Transições feitas pela equipa (docs/04 · tabela de transições) ──────────

export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  recebido: ["em_design", "em_aprovacao", "em_producao", "cancelado"],
  em_design: ["em_aprovacao", "cancelado"],
  em_aprovacao: ["em_design", "em_producao", "cancelado"],
  em_producao: ["pronto", "cancelado"],
  pronto: ["entregue"],
  entregue: [],
  cancelado: [],
};

export type TransitionContext = {
  isAdmin: boolean;
  itemProofs: ProofStatus[];
  paid: number;
  total: number;
  depositRequired: number;
  reason?: string;
};

/** Devolve o motivo pelo qual a mudança não é permitida, ou null se pode avançar. */
export function transitionError(from: OrderStatus, to: OrderStatus, ctx: TransitionContext): string | null {
  if (!NEXT_STATUSES[from].includes(to))
    return `Um pedido em "${ORDER_STATUS_META[from].label}" não passa para "${ORDER_STATUS_META[to].label}".`;
  if (to === "cancelado") {
    if (from === "em_producao" && !ctx.isAdmin) return "Só o Administrador cancela um pedido já em produção.";
    if (!ctx.reason?.trim()) return "Indica o motivo do cancelamento.";
  }
  if (to === "em_aprovacao" && !ctx.itemProofs.some((s) => s === "enviada" || s === "aprovada")) {
    return "Envia primeiro a prova de pelo menos um produto.";
  }
  if (to === "em_producao") {
    if (!ctx.itemProofs.every((s) => s === "aprovada" || s === "nao_necessaria"))
      return "Há provas por aprovar pelo cliente.";
    if (ctx.paid < ctx.depositRequired) return "O sinal ainda não está pago.";
  }
  if (to === "entregue" && ctx.paid < ctx.total) return "Regista primeiro o pagamento do restante.";
  return null;
}

/** Estado do pagamento a partir do total confirmado (docs/04 · Estado do pagamento). */
export function paymentStatusFor(paid: number, total: number): PaymentStatus {
  if (paid <= 0) return "pendente";
  return paid >= total ? "pago" : "parcial";
}
