import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { PROOF_STATUS } from "@/features/account/proof-status";
import { listProofComments } from "@/features/account/server";
import { AdminProofView } from "@/features/admin/components/admin-proof-view";
import { requireModule } from "@/features/admin/guard";
import { getAdminProof } from "@/features/admin/proofs";
import { formatDateTime } from "@/lib/dates";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Prova" };

export default async function AdminProofPage({ params }: PageProps<"/admin/provas/[id]">) {
  const user = await requireModule("proofs", "view", "/admin/provas");
  const proof = await getAdminProof((await params).id);
  if (!proof) notFound();
  const comments = await listProofComments(proof.id);
  const canCreate = can(user, "proofs", "create");

  return (
    <div className="space-y-6">
      <AccountHeading
        back={{ href: "/admin/provas", label: "Provas" }}
        title={`${proof.itemName} · v${proof.version}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={PROOF_STATUS[proof.status].tone}>{PROOF_STATUS[proof.status].label}</Badge>
            {canCreate && proof.status !== "aprovada" && (
              <Link
                href={`/admin/provas/nova?pedido=${proof.orderNumber}&item=${proof.itemId}`}
                className="text-sm font-medium text-brand hover:underline"
              >
                Enviar nova versão
              </Link>
            )}
          </div>
        }
      >
        <Link href={`/admin/pedidos/${proof.orderNumber}`} className="font-mono hover:underline">
          {proof.orderNumber}
        </Link>{" "}
        · enviada a {formatDateTime(proof.sentAt)}
        {proof.message && ` · «${proof.message}»`}
      </AccountHeading>
      {proof.decision && (
        <p className="rounded-sm border border-success/30 bg-success/10 p-3 text-sm">
          Aprovada por {proof.decision.byName} a {formatDateTime(proof.decision.at)} · IP {proof.decision.ip} · texto{" "}
          {proof.decision.termsVersion}
          {proof.decision.note && ` · nota: ${proof.decision.note}`}
        </p>
      )}
      <AdminProofView proofId={proof.id} preview={proof.preview} comments={comments} canComment={canCreate} />
    </div>
  );
}
