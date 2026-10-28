import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getCompany } from "@/features/settings/server";

export const metadata: Metadata = {
  title: "Termos e condições",
  description: "Condições de orçamentos, provas, produção, pagamentos, entregas e reclamações da Endju.",
};

// Rascunho que segue as decisões da Etapa 0 (IVA incluído, sinal de 50 %, 3 revisões). Rever com jurista antes de publicar.
export default async function TermsPage() {
  const COMPANY = await getCompany();
  return (
    <>
      <PageHeader eyebrow="Legal" title="Termos e condições.">
        Última atualização: 27 de outubro de 2026
      </PageHeader>

      <div className="container-page pb-section">
        <div className="prose-endju max-w-2xl">
          <p>
            Estes termos aplicam-se às encomendas e orçamentos feitos à {COMPANY.name} através deste site, na loja ou
            por outros canais. Ao confirmares uma encomenda, aceitas estes termos.
          </p>

          <h2>1. Conta</h2>
          <p>
            Para concluir uma encomenda precisas de uma conta. Mantém os teus dados atualizados e a senha em segredo: as
            aprovações feitas na tua conta são consideradas tuas.
          </p>

          <h2>2. Preços e orçamentos</h2>
          <ul>
            <li>Os preços apresentados ao público incluem IVA de 14 %.</li>
            <li>
              O preço do configurador é uma estimativa. O valor final é confirmado no checkout ou na proposta, depois de
              verificado o ficheiro.
            </li>
            <li>As propostas têm a validade indicada em cada uma.</li>
          </ul>

          <h2>3. Ficheiros e conteúdos</h2>
          <p>
            Garantes que tens direito a usar os textos, imagens e marcas que nos envias. Não imprimimos conteúdos que
            violem a lei ou direitos de terceiros.
          </p>

          <h2>4. Provas e aprovação</h2>
          <ul>
            <li>Antes de produzir, enviamos uma prova para aprovares na tua conta.</li>
            <li>Estão incluídas 3 revisões. A partir da quarta, informamos o custo antes de avançar.</li>
            <li>
              A aprovação fica registada com data e hora. Erros presentes na prova aprovada, como textos, contactos ou
              medidas, são da responsabilidade de quem aprovou.
            </li>
          </ul>

          <h2>5. Prazos</h2>
          <p>
            Os prazos contam a partir da aprovação da prova e do pagamento do sinal. Se algo atrasar a produção,
            avisamos-te logo que soubermos.
          </p>

          <h2>6. Pagamentos</h2>
          <ul>
            <li>Pagas um sinal de 50 % para a produção começar e o restante na entrega ou no levantamento.</li>
            <li>Empresas com conta corrente aprovada podem pagar a 30 dias, nas condições combinadas.</li>
            <li>Aceitamos Multicaixa Express, pagamento por referência e transferência bancária.</li>
          </ul>

          <h2>7. Cores e materiais</h2>
          <p>
            As cores no ecrã são diferentes das impressas e podem variar ligeiramente entre materiais e tiragens.
            Diferenças dentro da tolerância normal de impressão não são consideradas defeito. Se a cor for crítica, pede
            uma prova física.
          </p>

          <h2>8. Entregas, levantamento e montagem</h2>
          <p>
            Entregamos em Luanda e enviamos para as províncias, com o custo e o prazo indicados no checkout. Na
            montagem, o local tem de estar acessível e com as autorizações necessárias, como a licença de publicidade
            exterior quando aplicável.
          </p>

          <h2>9. Reclamações</h2>
          <p>
            Verifica o trabalho na entrega e comunica qualquer defeito no prazo de 7 dias. Se o defeito for nosso,
            reimprimimos ou devolvemos o valor das peças afetadas.
          </p>

          <h2>10. Cancelamentos</h2>
          <p>
            Podes cancelar antes de a produção começar; devolvemos o sinal, descontado o trabalho de design já feito.
            Depois de iniciada a produção, as peças já produzidas são cobradas.
          </p>

          <h2>11. Artes criadas pela Endju e portfólio</h2>
          <p>
            Depois do pagamento integral, podes usar livremente as artes que criámos para ti. Os ficheiros abertos (AI,
            PSD) são entregues quando estiverem incluídos no orçamento. Podemos mostrar o trabalho no nosso portfólio,
            exceto se nos pedires o contrário.
          </p>

          <h2>12. Lei aplicável</h2>
          <p>
            Estes termos regem-se pela lei angolana. Em caso de litígio, é competente o foro da comarca de Luanda. Os
            teus dados pessoais são tratados como descrito na <Link href="/privacidade">Política de privacidade</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
