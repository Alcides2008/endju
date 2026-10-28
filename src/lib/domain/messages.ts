/**
 * Modelos de mensagem (docs/02 · messageTemplates): texto com {{variáveis}} preenchido para cada pedido.
 * O WhatsApp sai do telemóvel da equipa (wa.me com o texto pronto); o email pelo Resend, quando configurado.
 * shortcut: sem API do WhatsApp Business (Meta), o envio é aberto pela equipa e o histórico regista "aberto".
 */
export const TEMPLATE_KEYS = [
  "pedido.confirmado",
  "prova.enviada",
  "sinal.pendente",
  "pagamento.recebido",
  "pedido.pronto",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  "pedido.confirmado": "Pedido recebido",
  "prova.enviada": "Prova para aprovar",
  "sinal.pendente": "Sinal por pagar",
  "pagamento.recebido": "Pagamento recebido",
  "pedido.pronto": "Pedido pronto",
};

export type Template = { key: TemplateKey; whatsapp: string; emailSubject: string; email: string; active: boolean };

export const TEMPLATE_VARIABLES = [
  ["cliente.nome", "Primeiro nome do cliente"],
  ["pedido.numero", "EDJ-2026-00001"],
  ["pedido.total", "Total com IVA"],
  ["pedido.sinal", "Sinal exigido"],
  ["pedido.emFalta", "O que falta pagar"],
  ["pedido.prazo", "Data prevista"],
  ["link.pedido", "Página do pedido na conta do cliente"],
  ["empresa.nome", "ENDJU BUSINESS"],
] as const;

export const DEFAULT_TEMPLATES: Record<TemplateKey, Omit<Template, "key" | "active">> = {
  "pedido.confirmado": {
    whatsapp:
      "Olá {{cliente.nome}}, recebemos o teu pedido {{pedido.numero}} ({{pedido.total}}). Vamos verificar os ficheiros e enviar-te a prova para aprovares. Acompanha aqui: {{link.pedido}}",
    emailSubject: "Recebemos o teu pedido {{pedido.numero}}",
    email:
      "Olá {{cliente.nome}}, obrigado pela encomenda. A nossa equipa vai verificar os ficheiros e enviar-te a prova para aprovares.",
  },
  "prova.enviada": {
    whatsapp:
      "Olá {{cliente.nome}}, a prova do pedido {{pedido.numero}} está pronta. Vê e aprova (ou pede alterações) aqui: {{link.pedido}}",
    emailSubject: "A prova do pedido {{pedido.numero}} está pronta",
    email: "Olá {{cliente.nome}}, a prova do teu pedido está pronta para aprovares na tua conta: {{link.pedido}}",
  },
  "sinal.pendente": {
    whatsapp:
      "Olá {{cliente.nome}}, a prova do pedido {{pedido.numero}} está aprovada. Para começarmos a produção falta o sinal de {{pedido.sinal}}. Assim que pagares, envia-nos o comprovativo por aqui.",
    emailSubject: "Falta o sinal para produzirmos o pedido {{pedido.numero}}",
    email:
      "Olá {{cliente.nome}}, para começarmos a produção do pedido {{pedido.numero}} falta o sinal de {{pedido.sinal}}.",
  },
  "pagamento.recebido": {
    whatsapp:
      "Olá {{cliente.nome}}, confirmámos o pagamento do pedido {{pedido.numero}}. Em falta: {{pedido.emFalta}}. Obrigado!",
    emailSubject: "Pagamento confirmado · {{pedido.numero}}",
    email:
      "Olá {{cliente.nome}}, confirmámos o teu pagamento. Em falta no pedido {{pedido.numero}}: {{pedido.emFalta}}.",
  },
  "pedido.pronto": {
    whatsapp:
      "Olá {{cliente.nome}}, o pedido {{pedido.numero}} está pronto! Em falta: {{pedido.emFalta}}. Diz-nos quando passas para levantar ou se combinamos a entrega.",
    emailSubject: "O pedido {{pedido.numero}} está pronto",
    email: "Olá {{cliente.nome}}, o teu pedido {{pedido.numero}} está pronto. Em falta: {{pedido.emFalta}}.",
  },
};

/** Troca {{variável}} pelo valor; uma variável sem valor fica vazia em vez de aparecer com chavetas ao cliente. */
export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => vars[name] ?? "").replace(/[ \t]{2,}/g, " ");
}

/** wa.me só aceita o número com indicativo e sem "+" nem espaços. */
export const whatsappTo = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
