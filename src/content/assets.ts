import type { StaticImageData } from "next/image";
import heroCartoes from "@/assets/hero/cartoes.webp";
import heroCor from "@/assets/hero/cor.webp";
import heroGrandeFormato from "@/assets/hero/grande-formato.webp";
import heroOficina from "@/assets/hero/oficina.webp";
import portfolioBonesBordados from "@/assets/portfolio/bones-bordados.webp";
import portfolioBordadoMaquinas2 from "@/assets/portfolio/bordado-maquinas-2.webp";
import portfolioBordadoMaquinas from "@/assets/portfolio/bordado-maquinas.webp";
import portfolioBordadoOperador from "@/assets/portfolio/bordado-operador.webp";
import portfolioEfaiSaudeOutdoor1 from "@/assets/portfolio/efai-saude-outdoor-1.webp";
import portfolioEfaiSaudeOutdoor2 from "@/assets/portfolio/efai-saude-outdoor-2.webp";
import portfolioEfaiSaudeViatura1 from "@/assets/portfolio/efai-saude-viatura-1.webp";
import portfolioEfaiSaudeViatura2 from "@/assets/portfolio/efai-saude-viatura-2.webp";
import portfolioEfaiSaude from "@/assets/portfolio/efai-saude.webp";
import portfolioEquipamentosBasquetebol2 from "@/assets/portfolio/equipamentos-basquetebol-2.webp";
import portfolioEquipamentosBasquetebol3 from "@/assets/portfolio/equipamentos-basquetebol-3.webp";
import portfolioEquipamentosBasquetebol4 from "@/assets/portfolio/equipamentos-basquetebol-4.webp";
import portfolioEquipamentosBasquetebol from "@/assets/portfolio/equipamentos-basquetebol.webp";
import portfolioFachadaAtelier2 from "@/assets/portfolio/fachada-atelier-2.webp";
import portfolioFachadaAtelier3 from "@/assets/portfolio/fachada-atelier-3.webp";
import portfolioFachadaAtelierOficina2 from "@/assets/portfolio/fachada-atelier-oficina-2.webp";
import portfolioFachadaAtelierOficina from "@/assets/portfolio/fachada-atelier-oficina.webp";
import portfolioFachadaAtelier from "@/assets/portfolio/fachada-atelier.webp";
import portfolioFachadaPecasAutoMontagem from "@/assets/portfolio/fachada-pecas-auto-montagem.webp";
import portfolioFachadaPecasAuto from "@/assets/portfolio/fachada-pecas-auto.webp";
import portfolioLojaEndjuDia from "@/assets/portfolio/loja-endju-dia.webp";
import portfolioLojaEndjuNoite from "@/assets/portfolio/loja-endju-noite.webp";
import portfolioNkentoStuff2 from "@/assets/portfolio/nkento-stuff-2.webp";
import portfolioNkentoStuff3 from "@/assets/portfolio/nkento-stuff-3.webp";
import portfolioNkentoStuff from "@/assets/portfolio/nkento-stuff.webp";
import portfolioPradoOsKambas2 from "@/assets/portfolio/prado-os-kambas-2.webp";
import portfolioPradoOsKambas3 from "@/assets/portfolio/prado-os-kambas-3.webp";
import portfolioPradoOsKambas from "@/assets/portfolio/prado-os-kambas.webp";
import portfolioTShirtsJiuJitsu2 from "@/assets/portfolio/t-shirts-jiu-jitsu-2.webp";
import portfolioTShirtsJiuJitsu3 from "@/assets/portfolio/t-shirts-jiu-jitsu-3.webp";
import portfolioTShirtsJiuJitsu from "@/assets/portfolio/t-shirts-jiu-jitsu.webp";
import portfolioTrofeusPremios2 from "@/assets/portfolio/trofeus-premios-2.webp";
import portfolioTrofeusPremios from "@/assets/portfolio/trofeus-premios.webp";
import portfolioUltraCardioTotem2 from "@/assets/portfolio/ultra-cardio-totem-2.webp";
import portfolioUltraCardioTotemMontagem from "@/assets/portfolio/ultra-cardio-totem-montagem.webp";
import portfolioUltraCardioTotem from "@/assets/portfolio/ultra-cardio-totem.webp";
import portfolioZukaKissewas2 from "@/assets/portfolio/zuka-kissewas-2.webp";
import portfolioZukaKissewas3 from "@/assets/portfolio/zuka-kissewas-3.webp";
import portfolioZukaKissewas from "@/assets/portfolio/zuka-kissewas.webp";

/**
 * Biblioteca de imagens do site: as fotografias reais da oficina e dos trabalhos, empacotadas com o código.
 * No Firestore uma imagem guarda-se como "asset:<chave>" (daqui) ou como URL do Cloudinary (carregada no painel).
 */
export const ASSETS: Record<string, StaticImageData> = {
  "hero/cartoes": heroCartoes,
  "hero/cor": heroCor,
  "hero/grande-formato": heroGrandeFormato,
  "hero/oficina": heroOficina,
  "portfolio/bones-bordados": portfolioBonesBordados,
  "portfolio/bordado-maquinas-2": portfolioBordadoMaquinas2,
  "portfolio/bordado-maquinas": portfolioBordadoMaquinas,
  "portfolio/bordado-operador": portfolioBordadoOperador,
  "portfolio/efai-saude-outdoor-1": portfolioEfaiSaudeOutdoor1,
  "portfolio/efai-saude-outdoor-2": portfolioEfaiSaudeOutdoor2,
  "portfolio/efai-saude-viatura-1": portfolioEfaiSaudeViatura1,
  "portfolio/efai-saude-viatura-2": portfolioEfaiSaudeViatura2,
  "portfolio/efai-saude": portfolioEfaiSaude,
  "portfolio/equipamentos-basquetebol-2": portfolioEquipamentosBasquetebol2,
  "portfolio/equipamentos-basquetebol-3": portfolioEquipamentosBasquetebol3,
  "portfolio/equipamentos-basquetebol-4": portfolioEquipamentosBasquetebol4,
  "portfolio/equipamentos-basquetebol": portfolioEquipamentosBasquetebol,
  "portfolio/fachada-atelier-2": portfolioFachadaAtelier2,
  "portfolio/fachada-atelier-3": portfolioFachadaAtelier3,
  "portfolio/fachada-atelier-oficina-2": portfolioFachadaAtelierOficina2,
  "portfolio/fachada-atelier-oficina": portfolioFachadaAtelierOficina,
  "portfolio/fachada-atelier": portfolioFachadaAtelier,
  "portfolio/fachada-pecas-auto-montagem": portfolioFachadaPecasAutoMontagem,
  "portfolio/fachada-pecas-auto": portfolioFachadaPecasAuto,
  "portfolio/loja-endju-dia": portfolioLojaEndjuDia,
  "portfolio/loja-endju-noite": portfolioLojaEndjuNoite,
  "portfolio/nkento-stuff-2": portfolioNkentoStuff2,
  "portfolio/nkento-stuff-3": portfolioNkentoStuff3,
  "portfolio/nkento-stuff": portfolioNkentoStuff,
  "portfolio/prado-os-kambas-2": portfolioPradoOsKambas2,
  "portfolio/prado-os-kambas-3": portfolioPradoOsKambas3,
  "portfolio/prado-os-kambas": portfolioPradoOsKambas,
  "portfolio/t-shirts-jiu-jitsu-2": portfolioTShirtsJiuJitsu2,
  "portfolio/t-shirts-jiu-jitsu-3": portfolioTShirtsJiuJitsu3,
  "portfolio/t-shirts-jiu-jitsu": portfolioTShirtsJiuJitsu,
  "portfolio/trofeus-premios-2": portfolioTrofeusPremios2,
  "portfolio/trofeus-premios": portfolioTrofeusPremios,
  "portfolio/ultra-cardio-totem-2": portfolioUltraCardioTotem2,
  "portfolio/ultra-cardio-totem-montagem": portfolioUltraCardioTotemMontagem,
  "portfolio/ultra-cardio-totem": portfolioUltraCardioTotem,
  "portfolio/zuka-kissewas-2": portfolioZukaKissewas2,
  "portfolio/zuka-kissewas-3": portfolioZukaKissewas3,
  "portfolio/zuka-kissewas": portfolioZukaKissewas,
};
