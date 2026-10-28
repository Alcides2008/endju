import type { MetadataRoute } from "next";

/** PWA: instala-se no telemóvel e, com o service worker (public/sw.js), abre páginas já vistas sem rede. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ENDJU BUSINESS · Gráfica e estúdio de design",
    short_name: "Endju",
    description: "Orçamentos, pedidos e provas da Endju, em Luanda.",
    lang: "pt-AO",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e8",
    theme_color: "#f3f0e8",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
