import bonesBordados from "@/assets/portfolio/bones-bordados.webp";
import bordadoMaquinas from "@/assets/portfolio/bordado-maquinas.webp";
import bordadoMaquinas2 from "@/assets/portfolio/bordado-maquinas-2.webp";
import efaiSaude from "@/assets/portfolio/efai-saude.webp";
import efaiOutdoor1 from "@/assets/portfolio/efai-saude-outdoor-1.webp";
import efaiOutdoor2 from "@/assets/portfolio/efai-saude-outdoor-2.webp";
import efaiViatura1 from "@/assets/portfolio/efai-saude-viatura-1.webp";
import efaiViatura2 from "@/assets/portfolio/efai-saude-viatura-2.webp";
import equipamentos from "@/assets/portfolio/equipamentos-basquetebol.webp";
import equipamentos2 from "@/assets/portfolio/equipamentos-basquetebol-2.webp";
import equipamentos3 from "@/assets/portfolio/equipamentos-basquetebol-3.webp";
import equipamentos4 from "@/assets/portfolio/equipamentos-basquetebol-4.webp";
import fachadaAtelier from "@/assets/portfolio/fachada-atelier.webp";
import fachadaAtelier2 from "@/assets/portfolio/fachada-atelier-2.webp";
import fachadaAtelier3 from "@/assets/portfolio/fachada-atelier-3.webp";
import fachadaAtelierOficina from "@/assets/portfolio/fachada-atelier-oficina.webp";
import fachadaAtelierOficina2 from "@/assets/portfolio/fachada-atelier-oficina-2.webp";
import fachadaPecasAuto from "@/assets/portfolio/fachada-pecas-auto.webp";
import fachadaPecasAutoMontagem from "@/assets/portfolio/fachada-pecas-auto-montagem.webp";
import nkentoStuff from "@/assets/portfolio/nkento-stuff.webp";
import nkentoStuff2 from "@/assets/portfolio/nkento-stuff-2.webp";
import nkentoStuff3 from "@/assets/portfolio/nkento-stuff-3.webp";
import pradoOsKambas from "@/assets/portfolio/prado-os-kambas.webp";
import pradoOsKambas2 from "@/assets/portfolio/prado-os-kambas-2.webp";
import pradoOsKambas3 from "@/assets/portfolio/prado-os-kambas-3.webp";
import ultraCardioTotem from "@/assets/portfolio/ultra-cardio-totem.webp";
import ultraCardioTotem2 from "@/assets/portfolio/ultra-cardio-totem-2.webp";
import ultraCardioMontagem from "@/assets/portfolio/ultra-cardio-totem-montagem.webp";
import trofeus from "@/assets/portfolio/trofeus-premios.webp";
import trofeus2 from "@/assets/portfolio/trofeus-premios-2.webp";
import tshirts from "@/assets/portfolio/t-shirts-jiu-jitsu.webp";
import tshirts2 from "@/assets/portfolio/t-shirts-jiu-jitsu-2.webp";
import tshirts3 from "@/assets/portfolio/t-shirts-jiu-jitsu-3.webp";
import zukaKissewas from "@/assets/portfolio/zuka-kissewas.webp";
import zukaKissewas2 from "@/assets/portfolio/zuka-kissewas-2.webp";
import zukaKissewas3 from "@/assets/portfolio/zuka-kissewas-3.webp";

import type { ProjectBase } from "@/lib/domain/content";

/**
 * Portfólio tal como estava no código antes do CMS (Etapa 6.3): trabalhos reais, com fotogramas e vídeos
 * filmados na oficina ou na montagem. Só serve para a primeira importação no painel; depois edita-se lá.
 * clientVisible = false quando o nome do cliente não está confirmado (o site mostra só o setor).
 */
export const PROJECTS: ProjectBase[] = [
  {
    slug: "efai-saude-centro-medico",
    title: "Outdoor e viatura para um centro médico",
    clientName: "Efai Saúde",
    clientVisible: true,
    sector: "Saúde",
    serviceSlugs: ["grande-formato"],
    summary: "Outdoor de grande formato na estrada e a viatura da clínica envelopada com a mesma imagem",
    cover: { src: efaiSaude, alt: "Montagem do outdoor do Centro Médico Efai Saúde" },
    video: { src: "/portfolio/efai-saude.mp4", posterTime: 8.6 },
    gallery: [
      { src: efaiOutdoor1, alt: "Equipa da Endju a fixar o outdoor do centro médico" },
      { src: efaiOutdoor2, alt: "Outdoor do Centro Médico Efai Saúde visto da estrada" },
      { src: efaiViatura1, alt: "Viatura da Efai Saúde a ser envelopada à porta da Endju" },
      { src: efaiViatura2, alt: "Viatura da Efai Saúde envelopada com a imagem da clínica" },
    ],
    beforeAfter: null,
    challenge:
      "Um centro médico à beira da estrada tem de ser encontrado por quem passa de carro, e a viatura da clínica circula pela cidade todos os dias. A imagem tinha de ser a mesma nos dois.",
    solution:
      "Produzimos e montámos um outdoor de grande formato com a marca e a equipa médica, e envelopámos a viatura com a mesma imagem, à porta da nossa loja.",
    result: "Quem vê o outdoor na estrada reconhece a viatura na rua: a clínica passou a ter a mesma cara nos dois.",
    featured: true,
  },
  {
    slug: "ultra-cardio-totem",
    title: "Totem de entrada para uma clínica de cardiologia",
    clientName: "Ultra Cardio",
    clientVisible: true,
    sector: "Saúde",
    serviceSlugs: ["sinaletica"],
    summary: "Totem com o coração da marca no topo e o nome em letras recortadas",
    cover: { src: ultraCardioTotem, alt: "Totem da Ultra Cardio concluído à entrada da clínica" },
    video: { src: "/portfolio/ultra-cardio-totem.mp4", posterTime: 18.5 },
    gallery: [{ src: ultraCardioTotem2, alt: "Totem da Ultra Cardio visto de perto, ao lado das palmeiras" }],
    beforeAfter: {
      before: {
        src: ultraCardioMontagem,
        alt: "Totem da Ultra Cardio durante a montagem, com andaime",
        label: "Montagem",
      },
      after: { src: ultraCardioTotem, alt: "Totem da Ultra Cardio concluído à entrada", label: "Concluído" },
    },
    challenge: "Marcar a entrada de uma clínica numa rua movimentada, com uma peça que se visse de longe.",
    solution:
      "Um totem com o coração da marca no topo e o nome em letras recortadas na face, montado no local pela nossa equipa.",
    result: "A entrada da clínica passou a ter um ponto de referência para quem chega.",
    featured: false,
  },
  {
    slug: "prado-group-os-kambas-letreiros-luminosos",
    title: "Letras retroiluminadas e caixa de luz",
    clientName: "Prado Group · Os Kambas",
    clientVisible: true,
    sector: "Educação",
    serviceSlugs: ["sinaletica"],
    summary: "Letras em relevo com luz LED e caixa de luz para o Complexo Escolar Privado Os Kambas",
    cover: { src: pradoOsKambas, alt: "Letras retroiluminadas do Prado Group e caixa de luz do Os Kambas" },
    video: { src: "/portfolio/prado-os-kambas.mp4", posterTime: 13.4 },
    gallery: [
      { src: pradoOsKambas2, alt: "Letras do Prado Group acesas na oficina" },
      { src: pradoOsKambas3, alt: "Caixa de luz do Complexo Escolar Privado Os Kambas acesa" },
    ],
    beforeAfter: null,
    challenge:
      "Duas marcas que tinham de se ler bem à noite: o nome do grupo e a entrada de um complexo escolar com uma identidade colorida.",
    solution:
      "Letras em relevo com retroiluminação LED, que criam um halo de luz na parede, e uma caixa de luz com a marca do Os Kambas impressa em vinil translúcido, com as cores originais.",
    result:
      "Os dois letreiros foram testados acesos na oficina antes da entrega, com a luz uniforme em toda a superfície.",
    featured: true,
  },
  {
    slug: "nkento-stuff-letras-3d",
    title: "A marca em relevo dourado na parede da loja",
    clientName: "Nkento Stuff",
    clientVisible: true,
    sector: "Moda",
    serviceSlugs: ["sinaletica", "branding"],
    summary: "Logótipo e nome recortados em acrílico dourado espelhado",
    cover: { src: nkentoStuff, alt: "Letras douradas da Nkento Stuff na parede da loja" },
    video: { src: "/portfolio/nkento-stuff.mp4", posterTime: 7 },
    gallery: [
      { src: nkentoStuff2, alt: "Logótipo da Nkento Stuff em acrílico dourado" },
      { src: nkentoStuff3, alt: "Nome Nkento Stuff em letras 3D douradas" },
    ],
    beforeAfter: null,
    challenge:
      "Uma loja que queria a marca como peça central da parede, com o desenho fino do logótipo, a figura e o saco, reproduzido sem perder detalhe.",
    solution:
      "Recortámos o logótipo e o nome em acrílico dourado espelhado e fixámo-los afastados da parede, para criar sombra e profundidade.",
    result: "A parede da marca tornou-se o fundo natural das fotografias tiradas na loja.",
    featured: true,
  },
  {
    slug: "zuka-kissewas-eventos-rececao",
    title: "Receção com letras 3D em dourado",
    clientName: "Zuka & Kissewas Eventos",
    clientVisible: true,
    sector: "Eventos",
    serviceSlugs: ["sinaletica"],
    summary: "O nome da casa em letras douradas sobre a parede da receção",
    cover: { src: zukaKissewas, alt: "Letras douradas da Zuka & Kissewas Eventos na receção" },
    video: { src: "/portfolio/zuka-kissewas.mp4", posterTime: 27 },
    gallery: [
      { src: zukaKissewas2, alt: "Letras Zuka & Kissewas Eventos vistas de lado" },
      { src: zukaKissewas3, alt: "Pormenor das letras douradas sobre a parede da receção" },
    ],
    beforeAfter: null,
    challenge:
      "Uma empresa de eventos recebe os clientes na receção: a primeira impressão tinha de estar à altura de uma festa.",
    solution: "Letras 3D em acrílico dourado espelhado, fixadas com afastadores sobre a parede da receção.",
    result: "O nome da casa ficou como cenário de boas-vindas para clientes e visitas.",
    featured: true,
  },
  {
    slug: "fachada-atelier-letras-caixa",
    title: "Da oficina à fachada: letreiro de um atelier",
    clientName: "Atelier",
    clientVisible: false,
    sector: "Moda",
    serviceSlugs: ["sinaletica"],
    summary: "Letras recortadas e montadas na oficina, depois instaladas na fachada com andaime",
    cover: { src: fachadaAtelier, alt: "Montagem do letreiro na fachada de um atelier" },
    video: { src: "/portfolio/fachada-atelier.mp4", posterTime: 6.6 },
    gallery: [
      { src: fachadaAtelierOficina2, alt: "Letras do letreiro a serem montadas na oficina" },
      { src: fachadaAtelier2, alt: "Fachada do atelier vista da rua durante a montagem" },
      { src: fachadaAtelier3, alt: "Equipa da Endju a fixar o letreiro com andaime" },
    ],
    beforeAfter: {
      before: { src: fachadaAtelierOficina, alt: "Letras do atelier a serem montadas na oficina", label: "Na oficina" },
      after: { src: fachadaAtelier, alt: "Letreiro do atelier instalado na fachada", label: "Na fachada" },
    },
    challenge:
      "Um letreiro de fachada com letra manuscrita, com curvas finas que tinham de ficar perfeitas a vários metros do chão.",
    solution:
      "Recortámos e montámos as letras sobre o painel na oficina, onde se controla cada junta, e levámos o letreiro pronto para a fachada, instalado com andaime.",
    result: "O letreiro ficou montado sem fechar a rua mais tempo do que o necessário.",
    featured: false,
  },
  {
    slug: "fachada-luminosa-pecas-auto",
    title: "Fachada luminosa para uma loja de peças auto",
    clientName: "Loja de peças auto",
    clientVisible: false,
    sector: "Comércio",
    serviceSlugs: ["sinaletica", "grande-formato"],
    summary: "Caixa de luz de fachada instalada e acesa à noite",
    cover: { src: fachadaPecasAuto, alt: "Fachada luminosa de uma loja de peças auto acesa à noite" },
    video: { src: "/portfolio/fachada-pecas-auto.mp4", posterTime: 4.6 },
    gallery: [],
    beforeAfter: {
      before: { src: fachadaPecasAutoMontagem, alt: "Montagem da caixa de luz na fachada, à noite", label: "Montagem" },
      after: { src: fachadaPecasAuto, alt: "Caixa de luz da loja acesa depois da montagem", label: "Acesa" },
    },
    challenge: "A loja abre até tarde e precisava de ser vista da estrada depois de escurecer.",
    solution:
      "Uma caixa de luz ao longo da fachada, com lona backlit e iluminação interior, montada pela nossa equipa ao fim do dia.",
    result: "A fachada passou a ser o ponto mais visível da rua à noite.",
    featured: false,
  },
  {
    slug: "equipamentos-basquetebol-sublimados",
    title: "Equipamentos de basquetebol sublimados",
    clientName: "Equipa de basquetebol",
    clientVisible: false,
    sector: "Desporto",
    serviceSlugs: ["fardamento"],
    summary: "Camisolas e calções sublimados com cores, nome e número de cada atleta",
    cover: { src: equipamentos, alt: "Camisolas de basquetebol sublimadas em manequins" },
    video: { src: "/portfolio/equipamentos-basquetebol.mp4", posterTime: 2.2 },
    gallery: [
      { src: equipamentos2, alt: "Camisola de basquetebol branca e vermelha, vista de frente" },
      { src: equipamentos3, alt: "Costas da camisola com o número do atleta" },
      { src: equipamentos4, alt: "Equipamento completo exposto em manequim" },
    ],
    beforeAfter: null,
    challenge:
      "Equipamentos leves para jogo, com bandeira, nome e número de cada atleta, que aguentassem lavagens sem desbotar.",
    solution: "Sublimação total em poliéster: a tinta entra no tecido, por isso não estala nem descola.",
    result: "Cada atleta recebeu o equipamento com o seu número, pronto para o jogo.",
    featured: false,
  },
  {
    slug: "t-shirts-academia-jiu-jitsu",
    title: "T-shirts para uma academia de jiu-jitsu",
    clientName: "Academia de jiu-jitsu",
    clientVisible: false,
    sector: "Desporto",
    serviceSlugs: ["fardamento"],
    summary: "Estampagem DTF a cores com o emblema da academia",
    cover: { src: tshirts, alt: "T-shirts estampadas a sair da impressora DTF" },
    video: { src: "/portfolio/t-shirts-jiu-jitsu.mp4", posterTime: 3.8 },
    gallery: [
      { src: tshirts2, alt: "Equipa da Endju a preparar as t-shirts para estampar" },
      { src: tshirts3, alt: "T-shirts com o emblema da academia acabadas de imprimir" },
    ],
    beforeAfter: null,
    challenge: "Um emblema com muitas cores e detalhe fino, em t-shirts para alunos e treinadores.",
    solution:
      "Impressão DTF, que reproduz todas as cores do emblema numa só passagem, sem custos de quadros como na serigrafia.",
    result: "T-shirts com o emblema completo, prontas a vestir no mesmo dia da prensagem.",
    featured: false,
  },
  {
    slug: "bones-bordados",
    title: "Bonés snapback bordados",
    clientName: "Bonés bordados",
    clientVisible: false,
    sector: "Moda",
    serviceSlugs: ["fardamento", "brindes"],
    summary: "Bonés snapback com logótipo bordado em relevo",
    cover: { src: bonesBordados, alt: "Bonés bordados em branco e vermelho expostos na loja" },
    video: { src: "/portfolio/bones-bordados.mp4", posterTime: 21.6 },
    gallery: [
      { src: bordadoMaquinas, alt: "Bordadoras multicabeça a trabalhar na oficina da Endju" },
      { src: bordadoMaquinas2, alt: "Bordado em curso numa bordadora" },
    ],
    beforeAfter: null,
    challenge: "Num boné, o bordado é o que se vê primeiro: tem de ter relevo, cores limpas e nenhum fio solto.",
    solution: "Bordado computorizado nas nossas bordadoras multicabeça, com várias cores de linha no mesmo logótipo.",
    result: "Bonés com acabamento de loja, prontos para a montra.",
    featured: false,
  },
  {
    slug: "trofeus-cerimonia-premios",
    title: "Troféus e caixas para uma cerimónia de prémios",
    clientName: "Instituição pública",
    clientVisible: false,
    sector: "Cultura",
    serviceSlugs: ["brindes", "embalagens"],
    summary: "Troféus personalizados e caixas de oferta impressas com a identidade do evento",
    cover: { src: trofeus, alt: "Troféu dourado ao lado de caixas de oferta impressas" },
    video: { src: "/portfolio/trofeus-premios.mp4", posterTime: 6.2 },
    gallery: [{ src: trofeus2, alt: "Caixas de oferta e troféus preparados para a entrega" }],
    beforeAfter: null,
    challenge: "Uma cerimónia de prémios precisava de troféus e de caixas para entregar a cada premiado.",
    solution: "Troféus personalizados e caixas de oferta impressas com a identidade oficial do evento.",
    result: "Tudo embalado e pronto a entregar no palco.",
    featured: false,
  },
];
