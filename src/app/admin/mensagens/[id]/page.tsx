import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AccountHeading } from "@/features/account/components/account-heading";
import { AdminThread } from "@/features/admin/components/admin-thread";
import { requireModule } from "@/features/admin/guard";
import { getAdminThread } from "@/features/admin/threads";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Conversa" };

export default async function AdminThreadPage({ params }: PageProps<"/admin/mensagens/[id]">) {
  const user = await requireModule("messaging", "view", "/admin/mensagens");
  const thread = await getAdminThread((await params).id);
  if (!thread) notFound();

  return (
    <>
      <AccountHeading
        back={{ href: "/admin/mensagens", label: "Mensagens" }}
        title={thread.subject}
        action={
          <Badge tone={thread.status === "aberta" ? "info" : "neutral"}>
            {thread.status === "aberta" ? "Aberta" : "Fechada"}
          </Badge>
        }
      >
        {thread.customerName}
        {thread.orderNumber && (
          <>
            {" "}
            · pedido{" "}
            <Link href={`/admin/pedidos/${thread.orderNumber}`} className="font-mono hover:underline">
              {thread.orderNumber}
            </Link>
          </>
        )}
      </AccountHeading>
      <div className="max-w-3xl">
        <AdminThread
          threadId={thread.id}
          messages={thread.messages}
          status={thread.status}
          unread={thread.unread}
          canReply={can(user, "messaging", "create")}
        />
      </div>
    </>
  );
}
