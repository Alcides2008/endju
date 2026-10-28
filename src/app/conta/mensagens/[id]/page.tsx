import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { ThreadView } from "@/features/account/components/messages";
import { getMyThread } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Mensagem" };

export default async function ThreadPage({ params }: PageProps<"/conta/mensagens/[id]">) {
  const user = await requireCustomer("/conta/mensagens");
  const thread = await getMyThread((await params).id, user.uid);
  if (!thread) notFound();

  return (
    <>
      <AccountHeading back={{ href: "/conta/mensagens", label: "Mensagens" }} title={thread.subject}>
        {thread.orderNumber && <>Sobre o pedido {thread.orderNumber}.</>}
      </AccountHeading>
      <div className="max-w-3xl">
        <ThreadView threadId={thread.id} initial={thread.messages} />
      </div>
    </>
  );
}
