"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { ZoomImage } from "@/features/account/components/proof-viewer";
import type { ProofComment } from "@/features/account/server";
import { formatDateTime } from "@/lib/dates";
import { addStaffProofComment } from "../proof-actions";

/** Prova vista pela equipa: a imagem com os pinos do cliente e a conversa, com resposta da equipa. */
export function AdminProofView({
  proofId,
  preview,
  comments,
  canComment,
}: {
  proofId: string;
  preview: { url: string; width: number; height: number };
  comments: ProofComment[];
  canComment: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const pinned = comments.filter((c) => c.pin);
  const number = (id: string) => pinned.findIndex((c) => c.id === id) + 1;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <ZoomImage
        src={preview.url}
        alt="Prova"
        ratio={preview.width / preview.height}
        pins={pinned.map((c) => ({ n: number(c.id), ...c.pin! }))}
        draftPin={null}
        pinMode={false}
        onPin={() => {}}
      />
      <aside className="space-y-3">
        <h2 className="text-base font-semibold">Comentários</h2>
        {comments.length === 0 && <p className="text-sm text-ink-3">Sem comentários.</p>}
        <ol className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className={`rounded-sm border p-3 text-sm ${c.authorKind === "equipa" ? "border-line bg-paper-2" : "border-line bg-card"}`}
            >
              <p className="flex items-center gap-2 text-xs text-ink-3">
                {c.pin && (
                  <span className="grid size-5 place-items-center rounded-full bg-ink text-[0.625rem] font-bold text-paper">
                    {number(c.id)}
                  </span>
                )}
                <span className="font-medium text-ink">
                  {c.authorKind === "equipa" ? `${c.authorName} · Endju` : `${c.authorName} · cliente`}
                </span>
                {formatDateTime(c.at)}
              </p>
              <p className="mt-1 text-ink-2">{c.body}</p>
            </li>
          ))}
        </ol>
        {canComment && (
          <div className="space-y-2">
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Responder ao cliente"
              aria-label="Responder ao cliente"
            />
            <Button
              size="sm"
              loading={pending}
              disabled={text.trim().length < 2}
              onClick={() =>
                start(async () => {
                  const result = await addStaffProofComment(proofId, text);
                  if (!result.ok) return void toast.error(result.message);
                  setText("");
                  router.refresh();
                })
              }
            >
              Responder
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
