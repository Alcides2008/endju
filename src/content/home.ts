/**
 * Conteúdo da Home. Os projetos em destaque e os testemunhos vêm do CMS do painel (Firestore).
 * CONTEÚDO DE EXEMPLO: clientes, testemunhos e números são fictícios mas verosímeis, para apresentar o site.
 * Os testemunhos daqui só servem para a primeira importação, marcados como exemplo; clientes e números
 * continuam aqui: substituir pelos reais antes de publicar.
 */

/** Capítulos do hero: cada um troca a fotografia de fundo enquanto o texto muda. */
export const HERO_CHAPTERS = [
  {
    eyebrow: "Papelaria",
    title: "Cartões que se sentem na mão.",
    text: "Couché de 350 g, laminação soft-touch, relevo seco e hot stamping a ouro. A primeira impressão de uma marca cabe em 85 × 55 mm.",
  },
  {
    eyebrow: "Cor",
    title: "A cor certa, do ecrã ao papel.",
    text: "Perfis de cor calibrados, provas aprovadas online e referências Pantone conferidas antes de cada tiragem.",
  },
  {
    eyebrow: "Grande formato e embalagem",
    title: "Da lona de 12 metros à caixa à medida.",
    text: "Fachadas, eventos e embalagens produzidos na nossa oficina, com montagem e entrega em Luanda e nas províncias.",
  },
] as const;

export const PROCESS_STEPS = [
  {
    title: "Briefing",
    when: "Dia 1",
    text: "Contas-nos o que precisas, online ou na loja. Ajudamos a escolher formato, papel e acabamento.",
  },
  {
    title: "Design",
    when: "1 a 3 dias",
    text: "Criamos a arte ou preparamos o teu ficheiro: sangria, cores CMYK e resolução verificadas.",
  },
  {
    title: "Aprovação",
    when: "Online",
    text: "Recebes a prova na área do cliente, comentas, pedes ajustes e aprovas com registo de data e hora.",
  },
  {
    title: "Produção",
    when: "24 a 72 h",
    text: "Impressão, corte e acabamento na nossa oficina, com controlo de qualidade em cada etapa.",
  },
  {
    title: "Entrega",
    when: "Luanda e províncias",
    text: "Levantas na loja ou entregamos: em Luanda no próprio dia, nas 21 províncias por transportadora.",
  },
] as const;

export const STATS = [
  { value: 4800, suffix: "+", label: "pedidos entregues" },
  { value: 98, suffix: " %", label: "dentro do prazo prometido" },
  { value: 21, suffix: "", label: "províncias com entrega" },
  { value: 48, suffix: " h", label: "prazo médio em papelaria" },
] as const;

export const CLIENTS = [
  "Kianda Eventos",
  "Farmácia Mutamba",
  "Restaurante Ilha Azul",
  "Colégio Ngola Kiluanje",
  "Talatona Imobiliária",
  "Lumbu Logística",
  "Kuzola Cosméticos",
] as const;

export const TESTIMONIALS = [
  {
    quote: "A Gala ficou pronta dois dias antes. O palco de 14 metros chegou montado e sem uma única ruga na lona.",
    name: "Edna Cassoma",
    role: "Diretora de Produção",
    company: "Kianda Eventos",
  },
  {
    quote:
      "Aprovamos as provas no telemóvel, entre reuniões. Acabaram-se as surpresas do “não era bem isto” na entrega.",
    name: "Hélder Manuel",
    role: "Responsável de Marketing",
    company: "Farmácia Mutamba",
  },
  {
    quote: "Os polos aguentaram um ano letivo inteiro de lavagens. Para 2027 já nem pedimos orçamento a mais ninguém.",
    name: "Teresa Ndala",
    role: "Diretora Administrativa",
    company: "Colégio Ngola Kiluanje",
  },
] as const;
