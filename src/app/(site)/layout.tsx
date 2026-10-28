import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Cursor } from "@/components/motion/cursor";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { getBanners } from "@/features/content/server";
import { PopupHost } from "@/features/marketing/components/popup-host";
import { getActivePopups } from "@/features/marketing/server";
import { getCompany } from "@/features/settings/server";
import { jsonLd, localBusinessLd } from "@/lib/seo";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="paper-grain flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>
      <SmoothScroll />
      <Cursor />
      <SiteHeader banners={await getBanners("site_topbar")} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <PopupHost popups={await getActivePopups()} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessLd(await getCompany())) }}
      />
    </div>
  );
}
