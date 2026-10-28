import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { getServiceDoc } from "@/features/admin/catalog";
import { ServiceForm } from "@/features/admin/components/catalog-forms";
import { requireModule } from "@/features/admin/guard";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Serviço" };

export default async function CatalogServicePage({ params }: PageProps<"/admin/catalogo/servicos/[id]">) {
  const user = await requireModule("catalog", "view", "/admin/catalogo/servicos");
  const service = await getServiceDoc((await params).id);
  if (!service) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/catalogo/servicos" className="text-sm text-ink-2 hover:text-ink">
        ← Serviços
      </Link>
      <AccountHeading
        title={service.name}
        action={
          <Link href={`/servicos/${service.slug}`} target="_blank" className="text-sm text-ink-2 hover:text-ink">
            Ver no site ↗
          </Link>
        }
      />
      <ServiceForm service={service} canEdit={can(user, "catalog", "edit")} />
    </div>
  );
}
