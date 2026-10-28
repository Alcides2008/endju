import type { FaqCategory } from "@/lib/domain/content";

/**
 * Perguntas frequentes. Seguem as decisões confirmadas na Etapa 0 (IVA incluído, conta no checkout, sinal de 50 %,
 * 3 revisões de prova). Só servem para a primeira importação no painel (coleção `faqs`).
 */
export const FAQS: { category: FaqCategory; question: string; answer: string }[] = [
  {
    category: "encomendas",
    question: "Como faço uma encomenda?",
    answer:
      "Escolhe o produto no orçamento online, configura formato, material, quantidade e acabamento e vê o preço na hora. Para trabalhos fora do catálogo, como uma fachada ou um kit de evento, descreve o que precisas no orçamento personalizado e respondemos no mesmo dia útil.",
  },
  {
    category: "encomendas",
    question: "Preciso de criar conta para encomendar?",
    answer:
      "Para ver preços e pedir orçamentos, não. Para concluir uma encomenda, sim: é na tua conta que aprovas as provas, acompanhas o estado do pedido e encontras as faturas.",
  },
  {
    category: "encomendas",
    question: "Existe quantidade mínima?",
    answer:
      "Depende do produto. Cartões de visita começam nos 100, bonés bordados nas 12 unidades e caixas à medida nas 100. A quantidade mínima aparece no configurador de cada produto.",
  },
  {
    category: "encomendas",
    question: "Fazem trabalhos urgentes?",
    answer:
      "Sim, na maioria dos produtos. O prazo urgente e o acréscimo aparecem no orçamento antes de confirmares. Em letreiros de fachada e embalagens à medida, o prazo é combinado caso a caso.",
  },
  {
    category: "ficheiros",
    question: "Em que formato envio o meu ficheiro?",
    answer:
      "O ideal é PDF com 3 mm de sangria, cores em CMYK e imagens a 300 dpi no tamanho final. Também aceitamos AI, PSD e PNG. Se não tens ficheiro, a nossa equipa de design cria a arte por ti.",
  },
  {
    category: "ficheiros",
    question: "O que é a prova e porque tenho de a aprovar?",
    answer:
      "A prova é a imagem final do trabalho, tal como vai ser impresso. Aprovas online, na tua conta: revês textos, cores, medidas e contactos. A produção só começa depois da tua aprovação, e fica registado quem aprovou e quando.",
  },
  {
    category: "ficheiros",
    question: "Quantas alterações posso pedir?",
    answer: "Estão incluídas 3 revisões de prova. A partir da quarta, avisamos-te do custo antes de avançar.",
  },
  {
    category: "pagamentos",
    question: "Os preços incluem IVA?",
    answer:
      "Sim. Os preços públicos já incluem IVA de 14 %. No checkout e na fatura vês o valor sem IVA e o imposto separados.",
  },
  {
    category: "pagamentos",
    question: "Tenho de pagar tudo adiantado?",
    answer:
      "Não. Pagas um sinal de 50 % para a produção começar e o restante na entrega ou no levantamento. Empresas com conta corrente podem pagar a 30 dias, combinado na ficha de cliente.",
  },
  {
    category: "pagamentos",
    question: "Que formas de pagamento aceitam?",
    answer:
      "Multicaixa Express, pagamento por referência e transferência bancária. Na transferência, envias o comprovativo na tua conta e confirmamos o pagamento.",
  },
  {
    category: "entregas",
    question: "Entregam fora de Luanda?",
    answer:
      "Sim. Entregamos em Luanda e enviamos para as províncias. O custo e o prazo da entrega aparecem no checkout, conforme a zona.",
  },
  {
    category: "entregas",
    question: "Posso levantar na loja?",
    answer: "Sim. Escolhe levantamento na loja no checkout e avisamos-te quando o trabalho estiver pronto.",
  },
  {
    category: "entregas",
    question: "Fazem a montagem de lonas, letreiros e letras 3D?",
    answer:
      "Sim. A nossa equipa de montagem leva escadas, andaimes e ferramentas e instala no local, em Luanda e nas províncias. A montagem entra no orçamento.",
  },
  {
    category: "geral",
    question: "Quanto tempo demora a resposta a um pedido de orçamento?",
    answer: "Respondemos no mesmo dia útil, dentro do horário de funcionamento.",
  },
  {
    category: "geral",
    question: "Posso ver um exemplo antes de encomendar uma tiragem grande?",
    answer: "Sim. Em brindes, fardamento e embalagens fazemos uma amostra ou um protótipo antes da produção completa.",
  },
];
