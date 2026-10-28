import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Fornecedor de pagamentos (docs/04 · Pagamento). Hoje só existe o de teste: cria pedidos de pagamento
 * Multicaixa Express e referências que nunca cobram, e confirma-os pelo webhook assinado ou pelo botão
 * "simular" (só em teste).
 * shortcut: o fornecedor real (EMIS GPO ou agregador) entra aqui quando houver contrato: as mesmas três
 * funções, com PAYMENT_PROVIDER e as chaves no ambiente; o resto do sistema não muda.
 */
export type ProviderName = "teste";

export const paymentMode = (): ProviderName => "teste";
/**
 * O fornecedor de teste confirma pagamentos com um botão: só no computador de desenvolvimento ou num ambiente
 * de testes com PAYMENT_TEST_MODE=on. No site publicado, sem fornecedor real, o pagamento online fica desligado
 * e o cliente paga por transferência ou ao balcão.
 */
export const isTestMode = () => process.env.NODE_ENV !== "production" || process.env.PAYMENT_TEST_MODE === "on";
/** Multicaixa Express e referência disponíveis? Com o fornecedor real: `paymentMode() !== "teste" || isTestMode()`. */
export const onlinePaymentsEnabled = () => isTestMode();

// Em produção não há segredo por omissão: sem PAYMENT_WEBHOOK_SECRET o webhook recusa tudo
const secret = () => process.env.PAYMENT_WEBHOOK_SECRET || (process.env.NODE_ENV === "production" ? "" : "teste-endju");

/** Multicaixa Express: o cliente recebe o pedido no telemóvel e aprova na app (no teste, fica à espera). */
export function createExpressPayment(input: { amount: number; phone: string; orderNumber: string }) {
  return {
    name: paymentMode(),
    transactionId: `MCX-${randomBytes(6).toString("hex").toUpperCase()}`,
    phone: input.phone,
  };
}

/** Pagamento por referência: entidade + referência para pagar no Multicaixa ou no homebanking, válida 72 h. */
export function createReferencePayment(_input: { amount: number; orderNumber: string }) {
  const digits = [...randomBytes(9)].map((b) => b % 10).join("");
  return {
    name: paymentMode(),
    entity: "00000", // entidade de teste: nenhum banco a aceita
    reference: `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
    expiresAt: new Date(Date.now() + 72 * 3_600_000),
  };
}

export const signWebhook = (body: string) => createHmac("sha256", secret()).update(body).digest("hex");

/** Confirma que o webhook veio do fornecedor (assinatura HMAC do corpo, cabeçalho x-endju-signature). */
export function verifyWebhook(body: string, signature: string | null) {
  if (!signature || !secret()) return false;
  const expected = Buffer.from(signWebhook(body));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
