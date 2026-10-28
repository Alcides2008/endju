import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { CommerceForm, CompanyForm } from "@/features/admin/components/settings-forms";
import { requireModule } from "@/features/admin/guard";
import { getCommerce, getCompany } from "@/features/settings/server";
import { cloudinaryConfigured } from "@/lib/cloudinary";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Definições" };

/** Só interruptores e estados: os segredos ficam nas variáveis de ambiente, nunca no painel. */
const INTEGRATIONS = () =>
  [
    ["Firebase (contas e base de dados)", Boolean(process.env.FIREBASE_PROJECT_ID), "Ligado"],
    ["Cloudinary (imagens e provas)", cloudinaryConfigured, "CLOUDINARY_URL"],
    ["Email (Resend)", Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), "RESEND_API_KEY e EMAIL_FROM"],
    ["WhatsApp Business (Meta)", false, "Por contratar: hoje a equipa envia pelo próprio WhatsApp"],
    ["Pagamentos Multicaixa", false, "Por contratar: pagamentos registados à mão"],
    ["Faturação certificada (AGT)", false, "Documentos registados à mão em Financeiro → Faturas"],
  ] as const;

export default async function SettingsPage() {
  const user = await requireModule("settings", "view", "/admin/definicoes");
  const [company, commerce] = await Promise.all([getCompany(), getCommerce()]);
  const canEdit = can(user, "settings", "edit");

  return (
    <>
      <AccountHeading title="Definições">
        Dados da empresa, pagamentos, entregas e o estado das ligações externas.
      </AccountHeading>
      <div className="max-w-3xl space-y-6">
        <CompanyForm company={company} canEdit={canEdit} />
        <CommerceForm
          depositPct={commerce.depositPct}
          zones={commerce.zones.map((z) => ({
            id: z.id,
            name: z.name,
            fee: z.fee,
            extraDays: z.extraDays,
            active: z.active,
          }))}
          pickup={{ address: commerce.pickupPoints[0].address, hours: commerce.pickupPoints[0].hours }}
          canEdit={canEdit}
        />
        <section className="space-y-3 rounded-sm border border-line bg-card p-5">
          <h2 className="font-semibold">Produção</h2>
          <p className="text-sm text-ink-2">
            Prazos em dias úteis de segunda a sexta · 3 revisões de prova incluídas · percurso e consumo de material
            editam-se em cada produto do Catálogo.
          </p>
        </section>
        <section className="space-y-3 rounded-sm border border-line bg-card p-5">
          <h2 className="font-semibold">Integrações</h2>
          <ul className="divide-y divide-line text-sm">
            {INTEGRATIONS().map(([name, on, hint]) => (
              <li key={name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  {name}
                  {!on && <span className="block text-xs text-ink-3">{hint}</span>}
                </span>
                <Badge tone={on ? "success" : "neutral"}>{on ? "Ligado" : "Desligado"}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
