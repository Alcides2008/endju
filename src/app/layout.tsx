import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeScript } from "@/lib/theme";
import "./globals.css";
import { ServiceWorker } from "@/components/layout/service-worker";

// Display expressiva (eixos de largura e tamanho ótico) + texto legível + mono para dados técnicos.
// Ficheiros no projeto (subconjunto latino, cobre o português): o build não depende do Google Fonts.
const display = localFont({
  src: "../fonts/bricolage-grotesque-latin.woff2",
  weight: "200 800",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
  variable: "--font-bricolage",
});
const text = localFont({
  src: "../fonts/instrument-sans-latin.woff2",
  weight: "400 700",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
  variable: "--font-instrument",
});
const mono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-400-latin.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-mono-500-latin.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ENDJU BUSINESS · Gráfica e estúdio de design em Luanda",
    template: "%s · ENDJU BUSINESS",
  },
  description:
    "Impressão digital, grande formato, branding, papelaria, brindes, sinalética e embalagens em Luanda. Orçamento online e acompanhamento do pedido em tempo real.",
  applicationName: "ENDJU BUSINESS",
  openGraph: { locale: "pt_AO", siteName: "ENDJU BUSINESS", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e12" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-AO" suppressHydrationWarning className={`${display.variable} ${text.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  );
}
