import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import type { Timestamp } from "firebase-admin/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AcceptInviteButton } from "@/features/admin/components/team-forms";
import { getSession } from "@/lib/auth/session";
import { ROLE_LABELS, type RoleId } from "@/lib/domain/permissions";
import { adminDb } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Convite para a equipa", robots: { index: false } };

async function Invite({ params }: Pick<PageProps<"/convite/[token]">, "params">) {
  await connection();
  const { token } = await params;
  const now = new Date().getTime();
  const valid = /^[a-f0-9]{48}$/.test(token);
  const invite = valid
    ? (
        await adminDb()
          .collection("invites")
          .where("tokenHash", "==", createHash("sha256").update(token).digest("hex"))
          .limit(1)
          .get()
      ).docs[0]
    : undefined;
  const expired = invite && (invite.get("expiresAt") as Timestamp).toMillis() < now;
  if (!invite || invite.get("status") !== "pendente" || expired)
    return (
      <p className="text-ink-2">
        Este convite já não é válido (usado, revogado ou expirado). Pede um novo ao Administrador.
      </p>
    );

  const email = invite.get("email") as string;
  const user = await getSession();
  const back = encodeURIComponent(`/convite/${token}`);
  return (
    <div className="space-y-6">
      <p className="text-lg text-ink-2">
        Foste convidado como <strong className="text-ink">{ROLE_LABELS[invite.get("roleId") as RoleId]}</strong>, com o
        email <strong className="text-ink">{email}</strong>.
      </p>
      {!user ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/entrar?voltar=${back}`}>Entrar com {email}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/registar?voltar=${back}`}>Criar conta</Link>
          </Button>
        </div>
      ) : (user.email ?? "").toLowerCase() !== email ? (
        <p className="text-ink-2">
          Estás com a conta {user.email ?? "sem email"}. Termina a sessão e entra com {email} para aceitar.
        </p>
      ) : (
        <AcceptInviteButton token={token} />
      )}
    </div>
  );
}

export default function InvitePage({ params }: PageProps<"/convite/[token]">) {
  return (
    <main className="container-page max-w-2xl space-y-6 py-24">
      <p className="eyebrow text-brand">Equipa Endju</p>
      <h1 className="text-display-md font-bold">Convite para o painel</h1>
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}
