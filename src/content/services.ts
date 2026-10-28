import cartoes from "@/assets/hero/cartoes.webp";
import cor from "@/assets/hero/cor.webp";
import grandeFormatoRender from "@/assets/hero/grande-formato.webp";
import oficina from "@/assets/hero/oficina.webp";
import bonesBordados from "@/assets/portfolio/bones-bordados.webp";
import bordadoMaquinas from "@/assets/portfolio/bordado-maquinas.webp";
import efaiOutdoor from "@/assets/portfolio/efai-saude-outdoor-1.webp";
import efaiViatura from "@/assets/portfolio/efai-saude-viatura-1.webp";
import equipamentos from "@/assets/portfolio/equipamentos-basquetebol.webp";
import fachadaAtelier from "@/assets/portfolio/fachada-atelier.webp";
import fachadaPecasAuto from "@/assets/portfolio/fachada-pecas-auto.webp";
import nkentoStuff from "@/assets/portfolio/nkento-stuff.webp";
import pradoOsKambas from "@/assets/portfolio/prado-os-kambas.webp";
import ultraCardioTotem from "@/assets/portfolio/ultra-cardio-totem.webp";
import trofeus from "@/assets/portfolio/trofeus-premios.webp";
import tshirts from "@/assets/portfolio/t-shirts-jiu-jitsu.webp";
import zukaKissewas from "@/assets/portfolio/zuka-kissewas.webp";
import type { ServiceBase } from "@/lib/domain/catalog";

/**
 * Páginas de serviço tal como estavam no código antes do catálogo no Firestore (Etapa 6.3).
 * Só servem para a primeira importação no painel; depois edita-se lá.
 * Preços "a partir de" com IVA incluído. Valores de referência de mercado em Luanda: confirmar com a Endju.
 */
const RENDER = "Visualização";

export const SERVICES: ServiceBase[] = [
  {
    slug: "impressao-digital",
    name: "Impressão digital",
    summary: "Flyers, brochuras, catálogos e relatórios em tiragens curtas, com cor fiel e entrega em 24 a 48 horas.",
    priceFrom: 25000,
    unit: "por A4 a cores",
    leadTime: "24–48 h",
    tags: ["Flyers", "Brochuras", "Catálogos"],
    intro: "Impressão a cores para tiragens curtas e médias, com a mesma cor do primeiro ao último exemplar.",
    body: [
      "Imprimimos flyers, brochuras, catálogos, relatórios, menus e convites, do A6 ao A3+. Antes de entrar na máquina, cada ficheiro é verificado: sangria, resolução das imagens e perfil de cor.",
      "Corte, vinco, dobra, agrafo, espiral e laminação são feitos na oficina, por isso o trabalho sai acabado e pronto a entregar.",
    ],
    products: [
      "Flyers e folhetos",
      "Brochuras e catálogos",
      "Menus",
      "Relatórios e manuais",
      "Convites",
      "Autocolantes em folha",
    ],
    specs: {
      title: "Papéis",
      items: [
        { name: "Couché brilho e mate", detail: "115 a 350 g, para cor viva e fotografia" },
        { name: "Offset", detail: "80 a 120 g, para relatórios e formulários" },
        { name: "Cartolina", detail: "250 a 350 g, para capas e convites" },
        { name: "Papel autocolante", detail: "Branco, brilho ou mate, cortado à forma" },
      ],
    },
    deadlines: [
      { item: "Flyers e folhetos", normal: "24 h", urgent: "No próprio dia" },
      { item: "Brochuras agrafadas", normal: "48 h", urgent: "24 h" },
      { item: "Catálogos com espiral", normal: "3 dias úteis", urgent: "48 h" },
    ],
    gallery: [
      { src: oficina, alt: "Provas de cor, cartões e caixa kraft com a marca Endju", caption: RENDER },
      { src: cor, alt: "Leque de cores ao lado de uma prova de cor", caption: RENDER },
    ],
  },
  {
    slug: "grande-formato",
    name: "Grande formato",
    summary: "Lonas, banners, roll-ups e vinil para fachadas, eventos e montras, até 3,2 m de largura sem emendas.",
    priceFrom: 850000,
    unit: "por m²",
    leadTime: "2–3 dias úteis",
    tags: ["Lonas", "Roll-ups", "Vinil"],
    intro: "Lonas, vinil, roll-ups e envelopamento de viaturas, impressos até 3,2 m de largura e montados por nós.",
    body: [
      "Da fachada da loja ao palco do evento: imprimimos em lona, vinil autocolante, papel fotográfico e tecido, com tintas preparadas para o sol de Luanda.",
      "A nossa equipa de montagem leva escadas, andaimes e ferramentas e instala no local, em Luanda e nas províncias. Foi assim no outdoor e na viatura da Efai Saúde.",
    ],
    products: [
      "Lonas para fachada e outdoor",
      "Roll-ups e X-banners",
      "Vinil para montras",
      "Envelopamento de viaturas",
      "Backdrops e painéis de evento",
      "Bandeiras e wind banners",
    ],
    specs: {
      title: "Materiais",
      items: [
        { name: "Lona frontlit", detail: "440 a 510 g, para fachadas e outdoors" },
        { name: "Lona backlit", detail: "Para caixas de luz iluminadas por dentro" },
        { name: "Vinil autocolante", detail: "Monomérico para montras, polimérico para viaturas" },
        { name: "Vinil microperfurado", detail: "Vê-se de dentro para fora; ideal para vidros" },
        { name: "Tecido", detail: "Backdrops leves, laváveis e sem reflexos" },
      ],
    },
    deadlines: [
      { item: "Lona até 10 m²", normal: "48 h", urgent: "24 h" },
      { item: "Roll-up com estrutura", normal: "2 dias úteis", urgent: "24 h" },
      { item: "Envelopamento de viatura", normal: "3 a 5 dias úteis", urgent: null },
    ],
    gallery: [
      { src: efaiOutdoor, alt: "Montagem do outdoor do Centro Médico Efai Saúde", caption: "Efai Saúde · outdoor" },
      { src: efaiViatura, alt: "Viatura da Efai Saúde envelopada à porta da Endju", caption: "Efai Saúde · viatura" },
      { src: grandeFormatoRender, alt: "Roll-up com o logo Endju ao lado de caixas kraft", caption: RENDER },
    ],
  },
  {
    slug: "design-grafico",
    name: "Design gráfico",
    summary:
      "Peças para campanhas, redes sociais e impressão, criadas pela nossa equipa e entregues prontas a produzir.",
    priceFrom: 3500000,
    unit: "por peça",
    leadTime: "2–4 dias úteis",
    tags: ["Campanhas", "Redes sociais", "Editorial"],
    intro: "Peças gráficas pensadas para imprimir bem: campanhas, redes sociais, editorial e embalagem.",
    body: [
      "Os nossos designers trabalham ao lado da produção. Cada arte sai com sangria, cores em CMYK e textos verificados, e chega-te como prova para aprovares online.",
      "Estão incluídas 3 revisões de prova. Se precisares de mais, avisamos antes de cobrar.",
    ],
    products: [
      "Cartazes e flyers",
      "Campanhas para redes sociais",
      "Catálogos e revistas",
      "Menus",
      "Apresentações",
      "Preparação de ficheiros para impressão",
    ],
    specs: {
      title: "O que recebes",
      items: [
        { name: "PDF pronto a imprimir", detail: "Com sangria, marcas de corte e cores CMYK" },
        { name: "Imagens para redes sociais", detail: "PNG e JPG nos tamanhos de cada rede" },
        { name: "Ficheiros abertos", detail: "AI ou PSD, quando combinado no orçamento" },
      ],
    },
    deadlines: [
      { item: "Peça simples", normal: "2 dias úteis", urgent: "24 h" },
      { item: "Campanha de 3 a 5 peças", normal: "4 dias úteis", urgent: "2 dias úteis" },
      { item: "Catálogo até 24 páginas", normal: "7 dias úteis", urgent: null },
    ],
    gallery: [
      {
        src: cartoes,
        alt: "Cartões de visita Endju com versos em degradê e cartão preto com logo a ouro",
        caption: RENDER,
      },
      { src: cor, alt: "Prova de cor com o logo Endju e leque de cores", caption: RENDER },
    ],
  },
  {
    slug: "branding",
    name: "Branding e identidade visual",
    summary:
      "Logótipo, paleta, tipografia e manual de marca para empresas que querem ser reconhecidas à primeira vista.",
    priceFrom: 45000000,
    unit: "por projeto",
    leadTime: "3–5 semanas",
    tags: ["Logótipo", "Manual de marca", "Naming"],
    intro: "Identidade visual completa, do logótipo ao manual de marca, testada no papel antes de ir para a rua.",
    body: [
      "Começamos por uma conversa sobre o negócio, os clientes e a concorrência. Apresentamos dois ou três caminhos criativos, desenvolvemos o escolhido e aplicamo-lo no que a marca vai usar: cartões, fachada, viatura, fardamento.",
      "Como também produzimos, cada aplicação é testada nos materiais reais. Uma cor que funciona no ecrã e falha na lona é corrigida antes de chegar à rua.",
    ],
    products: [
      "Logótipo e variações",
      "Paleta de cores e tipografia",
      "Manual de normas",
      "Papelaria de marca",
      "Aplicações em fachada, viatura e fardamento",
      "Naming",
    ],
    specs: {
      title: "O que recebes",
      items: [
        { name: "Logótipo em vetor", detail: "AI, SVG e PDF, mais PNG para uso digital" },
        { name: "Manual de marca", detail: "PDF com regras de uso, cores e tipografia" },
        { name: "Modelos de papelaria", detail: "Cartão, timbrado, envelope e assinatura de email" },
        { name: "Aplicações", detail: "Simulações da marca na fachada, viatura e fardamento" },
      ],
    },
    deadlines: [
      { item: "Logótipo", normal: "2 a 3 semanas", urgent: null },
      { item: "Identidade completa", normal: "3 a 5 semanas", urgent: null },
      { item: "Manual de marca", normal: "1 semana após aprovação", urgent: null },
    ],
    gallery: [
      {
        src: nkentoStuff,
        alt: "Logótipo da Nkento Stuff em letras douradas na parede",
        caption: "Nkento Stuff · letras 3D",
      },
      { src: cartoes, alt: "Cartões de visita Endju em três versões", caption: RENDER },
    ],
  },
  {
    slug: "papelaria",
    name: "Papelaria e cartões de visita",
    summary: "Cartões, envelopes, papel timbrado e blocos em papéis especiais, com laminação, relevo e hot stamping.",
    priceFrom: 1250000,
    unit: "100 cartões",
    leadTime: "48 h",
    tags: ["Cartões", "Timbrado", "Hot stamping"],
    intro: "Cartões de visita, papel timbrado, envelopes e blocos, com acabamentos que se sentem na mão.",
    body: [
      "Um cartão em couché de 350 g com laminação soft-touch, ou em papel texturado com ouro a quente: escolhemos contigo o papel e o acabamento certos para a marca e para o orçamento.",
      "Blocos de faturas e recibos saem numerados e com a cópia em papel químico, prontos para o balcão.",
    ],
    products: [
      "Cartões de visita",
      "Papel timbrado",
      "Envelopes",
      "Blocos de notas",
      "Pastas",
      "Blocos de faturas e recibos",
    ],
    specs: {
      title: "Papéis e acabamentos",
      items: [
        { name: "Couché mate 350 g", detail: "O cartão clássico, firme e com boa cor" },
        { name: "Papéis texturados e kraft", detail: "Para marcas artesanais e de luxo" },
        { name: "Laminação", detail: "Mate, brilho ou soft-touch" },
        { name: "Hot stamping", detail: "Ouro, prata ou cobre a quente" },
        { name: "Verniz localizado e relevo seco", detail: "Brilho ou relevo só no logótipo" },
      ],
    },
    deadlines: [
      { item: "Cartões de visita", normal: "48 h", urgent: "24 h" },
      { item: "Cartões com hot stamping", normal: "4 dias úteis", urgent: "2 dias úteis" },
      { item: "Timbrado e envelopes", normal: "3 dias úteis", urgent: "48 h" },
    ],
    gallery: [
      { src: cartoes, alt: "Cartões brancos, versos em degradê e cartão preto com logo a ouro", caption: RENDER },
      { src: oficina, alt: "Cartões de visita ao lado de provas de cor", caption: RENDER },
    ],
  },
  {
    slug: "brindes",
    name: "Brindes personalizados",
    summary: "Canecas, garrafas, cadernos, canetas e sacos com a tua marca, para eventos, equipas e clientes.",
    priceFrom: 350000,
    unit: "por unidade",
    leadTime: "3–7 dias úteis",
    tags: ["Canecas", "Cadernos", "Sacos"],
    intro: "Brindes com a tua marca para eventos, equipas e clientes: bordados, estampados ou sublimados.",
    body: [
      "Bonés bordados, canecas, garrafas, cadernos e sacos para oferecer em eventos ou vender na loja. Também preparamos troféus e caixas de oferta para cerimónias de prémios.",
      "Para quantidades grandes, enviamos uma amostra antes de avançar com a produção completa.",
    ],
    products: [
      "Bonés bordados",
      "Canecas e garrafas",
      "Cadernos e agendas",
      "Canetas e porta-chaves",
      "Sacos e tote bags",
      "Troféus e caixas de oferta",
    ],
    specs: {
      title: "Técnicas",
      items: [
        { name: "Bordado", detail: "Logótipos em bonés, polos e sacos de tecido" },
        { name: "Sublimação", detail: "Canecas, garrafas e tecidos claros, a cores" },
        { name: "DTF", detail: "Estampagem a cores em quase todos os tecidos" },
        { name: "Serigrafia", detail: "Cores sólidas em tiragens grandes" },
      ],
    },
    deadlines: [
      { item: "Bonés bordados (mín. 12)", normal: "5 dias úteis", urgent: "3 dias úteis" },
      { item: "Canecas sublimadas", normal: "3 dias úteis", urgent: "48 h" },
      { item: "Kits para eventos", normal: "7 a 10 dias úteis", urgent: null },
    ],
    gallery: [
      { src: bonesBordados, alt: "Bonés bordados em branco e vermelho expostos na loja", caption: "Bonés bordados" },
      { src: trofeus, alt: "Troféu dourado e caixas de oferta impressas", caption: "Troféus e caixas de oferta" },
    ],
  },
  {
    slug: "sinaletica",
    name: "Sinalética",
    summary: "Placas, letras caixa, sinalização de segurança e wayfinding para escritórios, lojas e obras.",
    priceFrom: 1800000,
    unit: "por placa em PVC",
    leadTime: "3–5 dias úteis",
    tags: ["Placas", "Letras caixa", "Wayfinding"],
    intro: "Letras 3D, letreiros luminosos, totens e placas: a tua marca visível de dia e de noite.",
    body: [
      "Cortamos, montamos e instalamos letras em acrílico, PVC e alumínio, com ou sem luz LED. Fizemos assim a parede dourada da Nkento Stuff e da Zuka & Kissewas Eventos, e as letras retroiluminadas do Prado Group.",
      "Para fachadas, tratamos da estrutura, da eletricidade do letreiro e da montagem em altura com andaime.",
    ],
    products: [
      "Letras 3D em acrílico e PVC",
      "Letras caixa com LED",
      "Caixas de luz",
      "Totens",
      "Placas de porta e de segurança",
      "Wayfinding para escritórios",
    ],
    specs: {
      title: "Materiais",
      items: [
        { name: "Acrílico", detail: "Espelhado (dourado, prateado) ou colorido" },
        { name: "PVC expandido", detail: "3 a 19 mm, leve e fácil de fixar" },
        { name: "ACM", detail: "Painel de alumínio composto para fachadas" },
        { name: "LED", detail: "Luz frontal, lateral ou retroiluminação" },
      ],
    },
    deadlines: [
      { item: "Placas em PVC", normal: "3 dias úteis", urgent: "48 h" },
      { item: "Letras 3D de interior", normal: "5 a 7 dias úteis", urgent: null },
      { item: "Letreiro luminoso de fachada", normal: "10 a 15 dias úteis, com montagem", urgent: null },
    ],
    gallery: [
      { src: nkentoStuff, alt: "Letras douradas da Nkento Stuff na parede da loja", caption: "Nkento Stuff" },
      {
        src: pradoOsKambas,
        alt: "Letras retroiluminadas do Prado Group e caixa de luz do Os Kambas",
        caption: "Prado Group · Os Kambas",
      },
      {
        src: zukaKissewas,
        alt: "Letras douradas da Zuka & Kissewas Eventos na receção",
        caption: "Zuka & Kissewas Eventos",
      },
      { src: ultraCardioTotem, alt: "Totem de entrada da clínica Ultra Cardio", caption: "Ultra Cardio · totem" },
      { src: fachadaAtelier, alt: "Montagem de letreiro numa fachada com andaime", caption: "Fachada de atelier" },
      {
        src: fachadaPecasAuto,
        alt: "Fachada luminosa de uma loja de peças auto à noite",
        caption: "Fachada de loja de peças auto",
      },
    ],
  },
  {
    slug: "embalagens",
    name: "Embalagens",
    summary: "Caixas, sacos e etiquetas à medida, em kraft, cartolina ou canelado, do protótipo à produção.",
    priceFrom: 95000,
    unit: "por caixa (mín. 100)",
    leadTime: "7–10 dias úteis",
    tags: ["Caixas", "Sacos", "Etiquetas"],
    intro: "Caixas, sacos e etiquetas à medida, do protótipo à produção.",
    body: [
      "Desenhamos a faca à medida do produto, fazemos um protótipo para testares e só depois avançamos com a tiragem.",
      "Caixas de envio para lojas online, caixas de oferta, sacos de papel e etiquetas para restauração, cosmética e comércio.",
    ],
    products: [
      "Caixas de envio",
      "Caixas de oferta",
      "Sacos de papel",
      "Etiquetas e autocolantes",
      "Cintas e mangas",
      "Embalagens para restauração",
    ],
    specs: {
      title: "Materiais",
      items: [
        { name: "Kraft", detail: "Natural, resistente e com aspeto artesanal" },
        { name: "Cartolina", detail: "300 a 400 g, para caixas de oferta a cores" },
        { name: "Cartão canelado", detail: "Microcanelado para caixas de envio" },
        { name: "Papel autocolante e vinil", detail: "Etiquetas cortadas à forma" },
      ],
    },
    deadlines: [
      { item: "Protótipo", normal: "3 dias úteis", urgent: null },
      { item: "Etiquetas", normal: "3 dias úteis", urgent: "48 h" },
      { item: "Caixas (mín. 100)", normal: "7 a 10 dias úteis", urgent: null },
    ],
    gallery: [
      {
        src: grandeFormatoRender,
        alt: "Caixas kraft impressas com o logo Endju, uma aberta com papel de seda",
        caption: RENDER,
      },
      { src: oficina, alt: "Caixa de envio kraft com o logo Endju", caption: RENDER },
    ],
  },
  {
    slug: "fardamento",
    name: "Fardamento e serigrafia",
    summary:
      "Coletes refletores, t-shirts, polos e batas com serigrafia, bordado ou transfer, para equipas de qualquer dimensão.",
    priceFrom: 450000,
    unit: "por peça",
    leadTime: "5–7 dias úteis",
    tags: ["Coletes refletores", "Polos", "Bordado"],
    intro:
      "Coletes refletores, t-shirts, polos, batas e equipamentos desportivos com bordado, DTF, sublimação ou serigrafia.",
    body: [
      "A oficina tem bordadoras multicabeça e impressão DTF e de sublimação, por isso escolhemos a técnica pelo resultado e não pelo que há disponível.",
      "Equipamentos de basquetebol sublimados, t-shirts para academias e bonés bordados estão entre os trabalhos que saíram daqui.",
    ],
    products: [
      "T-shirts e polos",
      "Equipamentos desportivos",
      "Coletes refletores com a marca",
      "Batas e aventais",
      "Fardas de empresa e de escola",
      "Bonés",
    ],
    specs: {
      title: "Técnicas",
      items: [
        { name: "Bordado", detail: "Logótipos em polos, batas e bonés; dura tanto como a peça" },
        { name: "DTF", detail: "Cores ilimitadas e detalhe fino em tiragens curtas" },
        { name: "Sublimação", detail: "Peça inteira estampada, em poliéster claro" },
        { name: "Serigrafia", detail: "Cores sólidas e preço baixo em tiragens grandes" },
      ],
    },
    deadlines: [
      { item: "T-shirts em DTF", normal: "3 dias úteis", urgent: "24 h" },
      { item: "Polos bordados", normal: "5 dias úteis", urgent: "3 dias úteis" },
      { item: "Equipamentos sublimados", normal: "7 dias úteis", urgent: "5 dias úteis" },
    ],
    gallery: [
      {
        src: equipamentos,
        alt: "Camisolas de basquetebol sublimadas em manequins",
        caption: "Equipamentos de basquetebol",
      },
      {
        src: tshirts,
        alt: "T-shirts estampadas a sair da impressora DTF",
        caption: "T-shirts para academia de jiu-jitsu",
      },
      { src: bordadoMaquinas, alt: "Bordadoras multicabeça a trabalhar na oficina", caption: "Oficina de bordado" },
      { src: bonesBordados, alt: "Bonés bordados expostos na loja", caption: "Bonés bordados" },
    ],
  },
];
