import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { RecordsEditor } from "@/features/admin/components/content-forms";
import { CONTENT_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getAllTestimonials } from "@/features/content/server";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Testemunhos" };

export default async function AdminTestimonialsPage() {
  const user = await requireModule("cms", "view", "/admin/conteudo/testemunhos");
  const testimonials = await getAllTestimonials();
  const examples = testimonials.filter((t) => t.example && t.active).length;
  return (
    <>
      <AccountHeading title="Conteúdo">
        Aparecem na Home.{" "}
        {examples > 0 &&
          `${examples} ainda são exemplos do briefing: troca-os por testemunhos reais, com autorização do cliente, antes de publicar o site.`}
      </AccountHeading>
      <SectionTabs tabs={CONTENT_TABS} current="/admin/conteudo/testemunhos" />
      <div className="max-w-3xl">
        <RecordsEditor
          kind="testimonials"
          docs={testimonials}
          canCreate={can(user, "cms", "create")}
          canSave={can(user, "cms", "edit")}
          canDelete={can(user, "cms", "delete")}
        />
      </div>
    </>
  );
}
