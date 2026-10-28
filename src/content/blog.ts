import corRender from "@/assets/hero/cor.webp";
import bordadoMaquinas from "@/assets/portfolio/bordado-maquinas.webp";
import efaiOutdoor from "@/assets/portfolio/efai-saude-outdoor-2.webp";
import pradoOsKambas from "@/assets/portfolio/prado-os-kambas-2.webp";

import type { PostBase } from "@/lib/domain/content";

/** Artigos tal como estavam no código antes do CMS (Etapa 6.3). Só servem para a primeira importação no painel. */
export const POSTS: PostBase[] = [
  {
    slug: "como-preparar-ficheiro-para-impressao",
    title: "Como preparar o ficheiro para impressão, sem surpresas",
    excerpt:
      "Sangria, margem de segurança, CMYK e resolução: os cinco pontos que evitam fios brancos, cores apagadas e imagens desfocadas.",
    cover: { src: corRender, alt: "Leque de cores e prova de cor com marcas de corte" },
    tags: ["Ficheiros", "Guia"],
    publishedAt: "2026-10-27",
    author: "Equipa Endju",
    blocks: [
      {
        type: "p",
        text: "A maior parte dos atrasos numa gráfica não vem da máquina: vem do ficheiro. Um logótipo colado à margem, uma fotografia tirada da internet ou cores pensadas para o ecrã obrigam a corrigir e a pedir nova aprovação. Estes cinco pontos resolvem quase todos os casos.",
      },
      { type: "h2", text: "1. Tamanho final e sangria" },
      {
        type: "p",
        text: "Cria o documento no tamanho final, por exemplo 85 × 55 mm para um cartão de visita, e acrescenta 3 mm de sangria em cada lado. Fundos e imagens que tocam a margem devem continuar até ao fim da sangria. O corte tem uma pequena tolerância e, sem sangria, pode aparecer um fio branco na borda.",
      },
      { type: "h2", text: "2. Margem de segurança" },
      {
        type: "p",
        text: "Mantém textos, logótipos e contactos a pelo menos 3 a 5 mm da linha de corte. Tudo o que estiver mais perto arrisca ficar cortado ou demasiado encostado à borda.",
      },
      { type: "h2", text: "3. Cores em CMYK" },
      {
        type: "p",
        text: "O ecrã mostra cores em RGB, com luz. A impressora usa quatro tintas: ciano, magenta, amarelo e preto (CMYK). Converte o ficheiro para CMYK antes de o enviar e conta com cores um pouco menos vivas do que no ecrã, sobretudo verdes, laranjas e azuis muito saturados.",
      },
      {
        type: "p",
        text: "Para texto pequeno, usa só preto (K 100). Para grandes áreas de preto, um preto rico, por exemplo C 40 M 30 Y 30 K 100, fica mais profundo.",
      },
      { type: "h2", text: "4. Resolução das imagens" },
      {
        type: "p",
        text: "Para impressos vistos de perto, como cartões, flyers e brochuras, as imagens devem ter 300 dpi no tamanho final. Numa lona vista a vários metros, 100 a 150 dpi no tamanho final chegam. Uma imagem copiada de uma página web raramente tem resolução suficiente para imprimir.",
      },
      { type: "h2", text: "5. Fontes e formato do ficheiro" },
      {
        type: "p",
        text: "Converte os textos em contornos ou incorpora as fontes, e exporta em PDF. Se o programa oferecer, escolhe PDF/X-1a: é o formato pensado para impressão.",
      },
      {
        type: "ul",
        items: [
          "Tamanho final certo, com 3 mm de sangria",
          "Textos a 3–5 mm do corte",
          "Cores em CMYK",
          "Imagens a 300 dpi (100–150 dpi em lonas)",
          "Fontes em contornos, ficheiro em PDF",
        ],
      },
      {
        type: "tip",
        text: "Não tens a certeza se o ficheiro está certo? Envia-o assim mesmo. Verificamos tudo antes de imprimir e dizemos-te o que é preciso corrigir. Se não tiveres ficheiro, a nossa equipa de design cria a arte.",
      },
    ],
  },
  {
    slug: "lona-vinil-ou-roll-up",
    title: "Lona, vinil ou roll-up: o que escolher para a tua marca",
    excerpt:
      "Fachada, montra, viatura ou feira: cada sítio pede um material diferente. Um guia rápido para acertar à primeira.",
    cover: { src: efaiOutdoor, alt: "Outdoor do Centro Médico Efai Saúde montado na estrada" },
    tags: ["Grande formato", "Guia"],
    publishedAt: "2026-10-27",
    author: "Equipa Endju",
    blocks: [
      {
        type: "p",
        text: "Em grande formato, o material decide quanto tempo a peça dura e como se vê. A mesma arte impressa em lona, vinil ou tecido tem resultados muito diferentes. Começa pela pergunta: onde vai ficar?",
      },
      { type: "h2", text: "Lona: fachadas, outdoors e eventos ao ar livre" },
      {
        type: "p",
        text: "A lona frontlit é o material mais usado em exterior. Aguenta sol e chuva, leva ilhós para fixar com cordas ou parafusos e pode ser esticada numa estrutura metálica, como no outdoor que montámos para a Efai Saúde. Em sítios com muito vento, a lona microperfurada deixa passar o ar e diminui o esforço sobre a estrutura.",
      },
      {
        type: "p",
        text: "Se a imagem vai ser iluminada por dentro, numa caixa de luz, o material certo é a lona backlit, que deixa passar a luz de forma uniforme.",
      },
      { type: "h2", text: "Vinil: montras, paredes e viaturas" },
      {
        type: "p",
        text: "O vinil autocolante cola diretamente na superfície. O vinil monomérico serve para montras, paredes e superfícies planas. Para viaturas, com curvas e muito sol, usa-se vinil polimérico, mais estável e duradouro.",
      },
      {
        type: "p",
        text: "Nos vidros, o vinil microperfurado mostra a publicidade a quem está fora e deixa ver para fora a quem está dentro.",
      },
      { type: "h2", text: "Roll-up: feiras, receções e eventos que mudam de sítio" },
      {
        type: "p",
        text: "O roll-up enrola-se dentro da própria base, monta-se em segundos e cabe num saco. É a escolha certa para feiras, apresentações e balcões de atendimento.",
      },
      { type: "h2", text: "Resumo" },
      {
        type: "ul",
        items: [
          "Fachada ou outdoor ao ar livre: lona frontlit (microperfurada se houver vento)",
          "Caixa de luz: lona backlit",
          "Montra ou parede: vinil monomérico",
          "Viatura: vinil polimérico",
          "Vidros: vinil microperfurado",
          "Eventos que mudam de sítio: roll-up",
        ],
      },
      {
        type: "tip",
        text: "Quanto mais longe for vista a peça, maior deve ser a letra e menos texto deve ter. Numa lona de estrada, o nome, o que fazes e um contacto chegam.",
      },
    ],
  },
  {
    slug: "letras-3d-letras-caixa-ou-caixa-de-luz",
    title: "Letras 3D, letras caixa ou caixa de luz: qual escolher para a fachada?",
    excerpt:
      "Três formas de pôr a marca na parede, com custos, visibilidade à noite e manutenção diferentes. Exemplos reais da nossa oficina.",
    cover: { src: pradoOsKambas, alt: "Letras retroiluminadas do Prado Group acesas na oficina" },
    tags: ["Sinalética", "Guia"],
    publishedAt: "2026-10-27",
    author: "Equipa Endju",
    blocks: [
      {
        type: "p",
        text: "Um letreiro é muitas vezes a peça mais cara e mais duradoura da imagem de uma loja. Antes de escolher, pensa em três coisas: a loja abre à noite? A fachada é vista de perto ou da estrada? Quanta informação precisa de mostrar?",
      },
      { type: "h2", text: "Letras 3D sem luz" },
      {
        type: "p",
        text: "Letras recortadas em acrílico, PVC ou alumínio, fixadas com afastadores para criar sombra na parede. São ideais em interiores, receções e fachadas bem iluminadas. As paredes douradas da Nkento Stuff e da Zuka & Kissewas Eventos foram feitas assim, em acrílico espelhado.",
      },
      { type: "h2", text: "Letras caixa com LED" },
      {
        type: "p",
        text: "Cada letra é uma pequena caixa com LED no interior. Na luz frontal, é a face da letra que acende. Na retroiluminação, a luz sai por trás e desenha um halo na parede, como nas letras que fizemos para o Prado Group. É a opção mais elegante para quem trabalha depois de escurecer.",
      },
      { type: "h2", text: "Caixa de luz" },
      {
        type: "p",
        text: "Um painel iluminado por dentro, com a imagem impressa em lona ou vinil translúcido. Mostra mais informação por metro quadrado e costuma ser mais económica do que as letras caixa. O Complexo Escolar Os Kambas e a fachada da loja de peças auto do nosso portfólio usam caixas de luz.",
      },
      { type: "h2", text: "Como decidir" },
      {
        type: "ul",
        items: [
          "Interior ou receção: letras 3D sem luz",
          "Fachada que tem de se destacar à noite: letras caixa com LED",
          "Muita informação ou orçamento mais apertado: caixa de luz",
        ],
      },
      {
        type: "tip",
        text: "Em fachadas e outdoors, confirma junto da administração municipal se precisas de licença de publicidade antes de montar. Ajudamos com as medidas e as imagens de simulação para o pedido.",
      },
    ],
  },
  {
    slug: "bordado-dtf-sublimacao-ou-serigrafia",
    title: "Bordado, DTF, sublimação ou serigrafia: como personalizar o fardamento",
    excerpt:
      "Quatro técnicas, quatro resultados. Qual escolher para polos de empresa, equipamentos desportivos, t-shirts de evento ou bonés.",
    cover: { src: bordadoMaquinas, alt: "Bordadoras multicabeça a trabalhar na oficina da Endju" },
    tags: ["Fardamento", "Guia"],
    publishedAt: "2026-10-27",
    author: "Equipa Endju",
    blocks: [
      {
        type: "p",
        text: "A técnica certa depende do tecido, do desenho e da quantidade. Na nossa oficina temos as quatro, por isso a escolha é feita pelo resultado.",
      },
      { type: "h2", text: "Bordado" },
      {
        type: "p",
        text: "O desenho é feito com linha, ponto a ponto, numa bordadora. Tem relevo, aspeto profissional e dura tanto como a peça. É o mais indicado para logótipos pequenos em polos, batas, casacos e bonés. Não é a melhor escolha para áreas grandes ou fotografias.",
      },
      { type: "h2", text: "DTF" },
      {
        type: "p",
        text: "O desenho é impresso num filme e transferido para o tecido com uma prensa de calor. Reproduz cores ilimitadas e detalhe fino, funciona em algodão e poliéster e não tem custos fixos, por isso compensa em tiragens curtas. Foi a técnica das t-shirts que fizemos para uma academia de jiu-jitsu.",
      },
      { type: "h2", text: "Sublimação" },
      {
        type: "p",
        text: "A tinta passa a gás com o calor e entra nas fibras do tecido. A peça pode ser estampada de ponta a ponta, não se sente ao toque e não estala. Só funciona em poliéster branco ou claro, por isso é a técnica dos equipamentos desportivos, como os de basquetebol do nosso portfólio.",
      },
      { type: "h2", text: "Serigrafia" },
      {
        type: "p",
        text: "Cada cor é aplicada através de uma tela própria. Tem um custo de preparação por cor, mas fica muito barata por peça em tiragens grandes com poucas cores, como t-shirts de campanha ou de evento.",
      },
      { type: "h2", text: "Resumo" },
      {
        type: "ul",
        items: [
          "Polos, batas e bonés com logótipo: bordado",
          "T-shirts a cores em poucas unidades: DTF",
          "Equipamentos desportivos em poliéster: sublimação",
          "Centenas de t-shirts com uma ou duas cores: serigrafia",
        ],
      },
      {
        type: "tip",
        text: "Em encomendas grandes, pede uma amostra antes da produção completa. Vês a cor, o toque e o tamanho na peça real.",
      },
    ],
  },
];
