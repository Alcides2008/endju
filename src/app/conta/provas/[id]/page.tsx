import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { ProofViewer } from "@/features/account/components/proof-viewer";
import { getMyProof, listProofComments } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { PROOF_STATUS } from "@/features/account/proof-status";

export const metadata: Metadata = { title: "Prova" };

export default async function ProofPage({ params }: PageProps<"/conta/provas/[id]">) {
  const user = await requireCustomer("/conta/provas");
  const { id } = await params;
  const proof = await getMyProof(id, user.uid);
  if (!proof) notFound();
  const comments = await listProofComments(proof.id);

  return (
    <>
      <AccountHeading
        back={{ href: "/conta/provas", label: "Provas" }}
        title={`${proof.itemName} · prova v${proof.version}`}
        action={<Badge tone={PROOF_STATUS[proof.status].tone}>{PROOF_STATUS[proof.status].label}</Badge>}
      >
        Pedido{" "}
        <Link
          href={`/conta/pedidos/${proof.orderNumber}`}
          className="font-mono text-ink underline-offset-4 hover:underline"
        >
          {proof.orderNumber}
        </Link>
        . Revê textos, cores, medidas e contactos antes de aprovar.
      </AccountHeading>
      <ProofViewer proof={proof} initialComments={comments} />
    </>
  );
}
