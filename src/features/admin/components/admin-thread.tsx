"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { markThreadReadByTeam, replyThread, setThreadStatus } from "../thread-actions";

type Message = {
  id: string;
  authorKind: "cliente" | "equipa" | "sistema";
  authorName: string;
  body: string;
  at: Date | null;
};

/**
 * Conversa vista pela equipa. shortcut: sem tempo real (as regras só deixam o cliente ler a conversa no browser);
 * o sino avisa de respostas novas e a página recarrega ao abrir. A equipa lê pelo servidor, com as permissões do papel.
 */
export function AdminThread({
  threadId,
  messages,
  status,
  unread,
  canReply,
}: {
  threadId: string;
  messages: Message[];
  status: "aberta" | "fechada";
  unread: boolean;
  canReply: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (unread) void markThreadReadByTeam(threadId);
  }, [threadId, unread]);

  const run = (action: () => Promise<{ ok: true } | { ok: false; message: string }>, after?: () => void) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.message);
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <ol className="space-y-4">
        {messages.map((message) => {
          const team = message.authorKind !== "cliente";
          return (
            <li key={message.id} className={cn("flex", team ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-md px-4 py-3 text-sm",
                  team ? "bg-ink text-paper" : "border border-line bg-card",
                )}
              >
                <p className={cn("mb-1 text-xs", team ? "text-paper/60" : "text-ink-3")}>
                  {message.authorName}
                  {team ? " · Endju" : " · cliente"} · {formatDateTime(message.at)}
                </p>
                <p className="whitespace-pre-line">{message.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {canReply && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim())
              run(
                () => replyThread(threadId, body),
                () => setBody(""),
              );
          }}
          className="space-y-2"
        >
          <Textarea
            rows={3}
            maxLength={3000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Responder ao cliente"
            aria-label="Resposta"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending} disabled={!body.trim()}>
              Responder
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setThreadStatus(threadId, status === "aberta" ? "fechada" : "aberta"))}
            >
              {status === "aberta" ? "Fechar conversa" : "Reabrir conversa"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
