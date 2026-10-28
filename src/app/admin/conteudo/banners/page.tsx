import type { Metadata } from "next";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { RecordsEditor } from "@/features/admin/components/content-forms";
import { CONTENT_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { getAllBanners } from "@/features/content/server";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  const user = await requireModule("cms", "view", "/admin/conteudo/banners");
  const banners = await getAllBanners();
  const canPublish = can(user, "cms", "approve");
  return (
    <>
      <AccountHeading title="Conteúdo">
        Avisos e campanhas com datas: a barra do topo aparece em todas as páginas, a faixa só na Home. Com vários ao
        mesmo tempo no mesmo lugar, aparece o que começa mais tarde.
      </AccountHeading>
      <SectionTabs tabs={CONTENT_TABS} current="/admin/conteudo/banners" />
      <div className="max-w-3xl space-y-4">
        {banners.length === 0 && !canPublish && <EmptyState title="Ainda não há banners." />}
        <RecordsEditor
          kind="banners"
          docs={banners}
          canCreate={canPublish}
          canSave={canPublish}
          canDelete={can(user, "cms", "delete")}
        />
      </div>
    </>
  );
}
