import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getCompany } from "@/features/settings/server";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Que dados pessoais a Endju recolhe, para que os usa, com quem os partilha e como exerces os teus direitos.",
};

// Rascunho com base na Lei n.º 22/11 (Proteção de Dados Pessoais). Rever com jurista antes de publicar.
export default async function PrivacyPage() {
  const COMPANY = await getCompany();
  return (
    <>
      <PageHeader eyebrow="Legal" title="Política de privacidade.">
        Última atualização: 27 de outubro de 2026
      </PageHeader>

      <div className="container-page pb-section">
        <div className="prose-endju max-w-2xl">
          <p>
            Esta política explica que dados pessoais a {COMPANY.name} recolhe quando usas este site, a tua conta de
            cliente ou falas connosco, para que os usamos e que direitos tens, nos termos da Lei n.º 22/11, de 17 de
            junho, Lei da Proteção de Dados Pessoais.
          </p>

          <h2>1. Quem é responsável pelos teus dados</h2>
          <p>
            {COMPANY.name}, {COMPANY.address ?? COMPANY.city}
            {COMPANY.nif && `, NIF ${COMPANY.nif}`}. Para qualquer questão sobre privacidade, usa o{" "}
            <Link href="/contacto">formulário de contacto</Link>
            {COMPANY.email && (
              <>
                {" "}
                ou escreve para <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </>
            )}
            .
          </p>

          <h2>2. Que dados recolhemos</h2>
          <ul>
            <li>
              <strong>Conta de cliente:</strong> nome, email, telemóvel e senha. A senha é guardada cifrada pelo serviço
              de autenticação e nunca a vemos.
            </li>
            <li>
              <strong>Encomendas e orçamentos:</strong> dados de faturação, NIF, moradas de entrega, ficheiros enviados,
              provas, comentários, aprovações e comprovativos de pagamento.
            </li>
            <li>
              <strong>Contactos:</strong> o que escreves no formulário de contacto, no WhatsApp ou por email.
            </li>
            <li>
              <strong>Dados técnicos:</strong> um cookie de sessão para manter a tua conta aberta e a preferência de
              tema claro ou escuro guardada no teu navegador.
            </li>
          </ul>

          <h2>3. Para que os usamos</h2>
          <ul>
            <li>Responder a pedidos de contacto e de orçamento.</li>
            <li>Produzir, entregar e faturar as tuas encomendas.</li>
            <li>Enviar-te provas, avisos de estado do pedido e documentos de pagamento.</li>
            <li>Cumprir obrigações legais, como a faturação e a conservação de documentos fiscais.</li>
            <li>
              Enviar novidades e promoções, só se tiveres dado consentimento, e podes retirá-lo a qualquer momento.
            </li>
          </ul>

          <h2>4. Com quem partilhamos</h2>
          <p>Não vendemos dados pessoais. Partilhamos apenas o necessário com quem nos presta serviços:</p>
          <ul>
            <li>Alojamento do site, autenticação e base de dados (Vercel e Google Firebase).</li>
            <li>Armazenamento de imagens (Cloudinary) e envio de emails (Resend).</li>
            <li>Meios de pagamento e transportadoras, para concluir pagamentos e entregas.</li>
            <li>Autoridades, quando a lei o exigir.</li>
          </ul>
          <p>
            Alguns destes serviços guardam dados fora de Angola. Escolhemos fornecedores com medidas de segurança
            reconhecidas e transferimos apenas o necessário para cada serviço.
          </p>

          <h2>5. Durante quanto tempo guardamos</h2>
          <ul>
            <li>Dados da conta: enquanto a conta estiver ativa.</li>
            <li>Encomendas, faturas e pagamentos: pelo prazo exigido pela lei fiscal.</li>
            <li>Mensagens de contacto que não deram origem a encomenda: até 2 anos.</li>
          </ul>

          <h2>6. Os teus direitos</h2>
          <p>
            Podes pedir acesso aos teus dados, a sua correção ou eliminação, e opor-te ao seu uso para fins de
            marketing. Respondemos no prazo previsto na lei. Se considerares que os teus dados não foram tratados
            corretamente, podes apresentar queixa à Agência de Proteção de Dados (APD).
          </p>

          <h2>7. Cookies</h2>
          <p>
            Usamos apenas o cookie essencial de sessão, necessário para entrares na tua conta. Não usamos cookies de
            publicidade. Se um dia usarmos ferramentas de estatística, atualizamos esta política e pedimos o teu
            consentimento.
          </p>

          <h2>8. Segurança</h2>
          <p>
            As ligações ao site são cifradas, o acesso aos dados é limitado por função dentro da equipa e as ações sobre
            encomendas ficam registadas.
          </p>

          <h2>9. Alterações</h2>
          <p>Quando esta política mudar, atualizamos a data no topo da página.</p>
        </div>
      </div>
    </>
  );
}
