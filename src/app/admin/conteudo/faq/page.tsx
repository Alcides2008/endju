import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { RecordsEditor } from "@/features/admin/components/content-forms";
import { CONTENT_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getAllFaqs } from "@/features/content/server";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Perguntas frequentes" };

export default async function AdminFaqPage() {
  const user = await requireModule("cms", "view", "/admin/conteudo/faq");
  const faqs = await getAllFaqs();
  return (
    <>
      <AccountHeading title="Conteúdo">
        As respostas da página /faq, por tema. Desliga «Visível no site» para esconder uma pergunta sem a apagar.
      </AccountHeading>
      <SectionTabs tabs={CONTENT_TABS} current="/admin/conteudo/faq" />
      <div className="max-w-3xl">
        <RecordsEditor
          kind="faqs"
          docs={faqs}
          canCreate={can(user, "cms", "create")}
          canSave={can(user, "cms", "edit")}
          canDelete={can(user, "cms", "delete")}
        />
      </div>
    </>
  );
}
