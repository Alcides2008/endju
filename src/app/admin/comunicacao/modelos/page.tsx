import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { TemplateForm } from "@/features/admin/components/communication-forms";
import { COMMUNICATION_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getTemplates } from "@/features/messages/server";
import { TEMPLATE_VARIABLES } from "@/lib/domain/messages";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Modelos de mensagem" };

export default async function TemplatesPage() {
  const user = await requireModule("messaging", "view", "/admin/comunicacao/modelos");
  const templates = await getTemplates();
  const canEdit = can(user, "messaging", "edit");
  return (
    <>
      <AccountHeading title="Comunicação">
        Os textos que a equipa envia em cada passo do pedido. No pedido, «Mensagem ao cliente» abre o WhatsApp com o
        texto preenchido; o email do pedido recebido usa o assunto e o texto daqui.
      </AccountHeading>
      <SectionTabs tabs={COMMUNICATION_TABS} current="/admin/comunicacao/modelos" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-4">
          {templates.map((t) => (
            <TemplateForm key={t.key + JSON.stringify(t)} template={t} canEdit={canEdit} />
          ))}
        </div>
        <aside className="h-fit space-y-2 rounded-sm border border-line bg-card p-4 text-sm lg:sticky lg:top-24">
          <h2 className="font-semibold">Variáveis</h2>
          <ul className="space-y-1.5">
            {TEMPLATE_VARIABLES.map(([name, hint]) => (
              <li key={name}>
                <code className="font-mono text-xs">{`{{${name}}}`}</code>
                <span className="block text-xs text-ink-3">{hint}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
