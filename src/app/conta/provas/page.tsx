import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { PROOF_STATUS } from "@/features/account/proof-status";
import { listMyProofs } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Provas" };

export default async function ProofsPage() {
  const user = await requireCustomer("/conta/provas");
  const proofs = await listMyProofs(user.uid);

  return (
    <>
      <AccountHeading title="Provas">
        Antes de imprimirmos, envias-nos a aprovação aqui. Podes aproximar, comentar com pinos e pedir alterações.
      </AccountHeading>
      {proofs.length === 0 ? (
        <EmptyState title="Ainda não há provas.">
          Quando o designer preparar a prova de um pedido, ela aparece aqui e avisamos-te.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {proofs.map((proof) => (
            <li key={proof.id}>
              <Link
                href={`/conta/provas/${proof.id}`}
                className="group block overflow-hidden rounded-sm border border-line bg-card hover:border-ink/40"
              >
                <div className="aspect-[16/9] overflow-hidden bg-paper-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização da prova (URL do armazenamento de provas) */}
                  <img
                    src={proof.preview.url}
                    alt=""
                    className="size-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-start justify-between gap-3 p-4">
                  <span>
                    <span className="block font-medium">
                      {proof.itemName} · v{proof.version}
                    </span>
                    <span className="text-sm text-ink-3">
                      {proof.orderNumber} · {formatDateTime(proof.sentAt)}
                    </span>
                  </span>
                  <Badge tone={PROOF_STATUS[proof.status].tone}>{PROOF_STATUS[proof.status].label}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
