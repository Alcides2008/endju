import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false } };

/** Confirma (?confirmar=) ou cancela (?cancelar=) a inscrição pelo código do email. */
async function Result({ searchParams }: Pick<PageProps<"/newsletter">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const confirm = typeof params.confirmar === "string" ? params.confirmar : "";
  const cancel = typeof params.cancelar === "string" ? params.cancelar : "";
  const token = confirm || cancel;
  const doc = /^[a-f0-9]{48}$/.test(token)
    ? (await adminDb().collection("newsletterSubscribers").where("token", "==", token).limit(1).get()).docs[0]
    : undefined;

  if (!doc)
    return (
      <p className="text-ink-2">Este link já não é válido. Se quiseres, inscreve-te outra vez no rodapé do site.</p>
    );
  if (confirm) {
    if (doc.get("status") !== "confirmado")
      await doc.ref.update({ status: "confirmado", confirmedAt: Timestamp.now() });
    return <p className="text-ink-2">Inscrição confirmada. Vais receber as novidades e as campanhas da Endju.</p>;
  }
  if (doc.get("status") !== "cancelado") await doc.ref.update({ status: "cancelado", cancelledAt: Timestamp.now() });
  return <p className="text-ink-2">Pronto: já não vais receber a newsletter.</p>;
}

export default function NewsletterPage({ searchParams }: PageProps<"/newsletter">) {
  return (
    <>
      <PageHeader eyebrow="Newsletter" title="Novidades da oficina." />
      <div className="container-page max-w-2xl space-y-6 pb-section">
        <Suspense fallback={<Skeleton className="h-6 w-80" />}>
          <Result searchParams={searchParams} />
        </Suspense>
        <Link href="/" className="inline-block text-sm underline underline-offset-4">
          Voltar ao site
        </Link>
      </div>
    </>
  );
}
