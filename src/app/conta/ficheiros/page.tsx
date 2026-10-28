import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck, FileSearch, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/content/company";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { listMyArtwork } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ficheiros" };

const STATUS = {
  ok: { icon: CircleCheck, className: "text-success", label: "Verificado no browser" },
  avisos: { icon: CircleAlert, className: "text-warning", label: "Com avisos" },
  por_verificar: { icon: FileSearch, className: "text-info", label: "A verificar na oficina" },
};

export default async function FilesPage() {
  const user = await requireCustomer("/conta/ficheiros");
  const rows = await listMyArtwork(user.uid);
  const whatsapp = whatsappLink("Olá Endju, envio ficheiros para um pedido.");

  return (
    <>
      <AccountHeading
        title="Ficheiros"
        action={
          whatsapp && (
            <Button asChild variant="outline">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                Enviar ficheiros por WhatsApp
              </a>
            </Button>
          )
        }
      >
        A arte de cada produto e o resultado da verificação. Os ficheiros seguem por WhatsApp com o número do pedido.
      </AccountHeading>
      {rows.length === 0 ? (
        <EmptyState title="Sem ficheiros." />
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {rows.map((row, i) => {
            const status = row.check ? STATUS[row.check.status] : null;
            return (
              <li key={i} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {row.design === "endju_cria" ? (
                      <span className="flex items-center gap-2">
                        <Palette className="size-4 text-brand" aria-hidden /> Design pela Endju
                      </span>
                    ) : row.check ? (
                      row.check.name
                    ) : (
                      "Ficheiro por enviar"
                    )}
                  </p>
                  <p className="text-xs text-ink-3">
                    {row.itemName} ·{" "}
                    <Link href={`/conta/pedidos/${row.orderNumber}`} className="font-mono hover:underline">
                      {row.orderNumber}
                    </Link>
                  </p>
                  {row.check?.messages.map((message) => (
                    <p key={message} className="text-xs text-ink-2">
                      {message}
                    </p>
                  ))}
                </div>
                {status && (
                  <span className={`flex items-center gap-1.5 text-xs ${status.className}`}>
                    <status.icon className="size-4" aria-hidden />
                    {status.label}
                    {row.check?.dpi && ` · ${row.check.dpi} dpi`}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
