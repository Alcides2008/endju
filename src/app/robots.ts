import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/conta", "/api", "/carrinho", "/checkout", "/convite", "/design-system", "/newsletter"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
