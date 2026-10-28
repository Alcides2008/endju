import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Logo, RegistrationMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const BENEFITS = [
  "Acompanha cada pedido em tempo real, do briefing à entrega",
  "Aprova provas online, com zoom e comentários",
  "Faturas, pagamentos e ficheiros num só lugar",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Painel de marca (desktop): a classe "dark" aplica os tokens escuros só aqui */}
      <aside className="dark relative hidden overflow-hidden bg-paper p-12 text-ink lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Link href="/" aria-label="ENDJU BUSINESS, página inicial" className="self-start">
          <Logo />
        </Link>
        <div className="relative z-10 space-y-10">
          <h2 className="text-display-lg font-extrabold [font-stretch:82%]">
            A tua gráfica, <span className="text-brand">sempre à mão.</span>
          </h2>
          <ul className="space-y-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-ink-2">
                <Check className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-2 w-10 bg-process-cyan" />
          <span className="h-2 w-10 bg-process-magenta" />
          <span className="h-2 w-10 bg-process-yellow" />
          <span className="h-2 w-10 bg-ink" />
          <span className="ml-3 eyebrow text-ink-3">C · M · Y · K</span>
        </div>
        <RegistrationMark className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] text-ink/[0.05]" />
      </aside>

      {/* Formulário */}
      <div className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-gutter lg:h-20">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            <span className="lg:hidden">
              <Logo />
            </span>
            <span className="hidden lg:inline">Voltar ao site</span>
          </Link>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center px-gutter py-10">
          <div className="mx-auto w-full max-w-md animate-page-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
