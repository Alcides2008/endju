import type { ProofView, QuoteView } from "./server";

/** Rótulo e cor de cada estado da prova, como o cliente os vê. */
export const PROOF_STATUS: Record<
  ProofView["status"],
  { label: string; tone: "warning" | "success" | "process" | "neutral" }
> = {
  pendente: { label: "Por aprovar", tone: "warning" },
  aprovada: { label: "Aprovada", tone: "success" },
  alteracoes_pedidas: { label: "Alterações pedidas", tone: "process" },
  substituida: { label: "Substituída", tone: "neutral" },
};

/** Estados do orçamento como o cliente os vê (docs/04 · Estado do orçamento). */
export const QUOTE_STATUS: Record<
  QuoteView["status"],
  { label: string; tone: "info" | "warning" | "success" | "neutral" | "danger" | "brand" }
> = {
  novo: { label: "Recebido", tone: "info" },
  em_analise: { label: "Em análise", tone: "info" },
  enviado: { label: "Proposta por responder", tone: "warning" },
  aceite: { label: "Aceite", tone: "success" },
  recusado: { label: "Recusado", tone: "neutral" },
  expirado: { label: "Expirado", tone: "neutral" },
  convertido: { label: "Convertido em pedido", tone: "brand" },
};
