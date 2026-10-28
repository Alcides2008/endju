"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/dates";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { createThread, markThreadRead, sendThreadMessage } from "../actions";

export function NewThreadForm({ orders }: { orders: string[] }) {
  const router = useRouter();
  const [values, setValues] = useState({ subject: "", body: "", orderNumber: "" });
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await createThread(values);
          if (!result.ok) return void toast.error(result.message);
          router.push(`/conta/mensagens/${result.id}`);
        });
      }}
      className="grid gap-4 rounded-sm border border-line bg-card p-5 md:grid-cols-2"
    >
      <Field label="Assunto">
        <Input
          value={values.subject}
          maxLength={120}
          onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))}
        />
      </Field>
      <Field label="Pedido (opcional)">
        <Select
          options={[{ value: "nenhum", label: "Nenhum em particular" }, ...orders.map((n) => ({ value: n, label: n }))]}
          value={values.orderNumber || "nenhum"}
          onValueChange={(value) => setValues((v) => ({ ...v, orderNumber: value === "nenhum" ? "" : value }))}
        />
      </Field>
      <Field label="Mensagem" className="md:col-span-2">
        <Textarea
          rows={4}
          maxLength={3000}
          value={values.body}
          onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
        />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" loading={pending}>
          Enviar mensagem
        </Button>
      </div>
    </form>
  );
}

type Message = {
  id: string;
  authorKind: "cliente" | "equipa" | "sistema";
  authorName: string;
  body: string;
  at: Date | null;
};

/** Conversa com a equipa: novas respostas aparecem sem recarregar (onSnapshot). */
export function ThreadView({ threadId, initial }: { threadId: string; initial: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const live = useRef(false);

  useEffect(() => {
    void markThreadRead(threadId);
    if (!isFirebaseConfigured) return;
    return onSnapshot(
      collection(getClientDb(), "threads", threadId, "messages"),
      (snap) => {
        live.current = true;
        setMessages(
          snap.docs
            .map((d) => ({
              id: d.id,
              authorKind: d.get("authorKind"),
              authorName: d.get("authorName"),
              body: d.get("body"),
              at: (d.get("createdAt") as Timestamp | null)?.toDate() ?? null,
            }))
            .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0)),
        );
      },
      (error) => console.warn("[mensagens] sem tempo real:", error.message),
    );
  }, [threadId]);

  // Em bloco: o scrollIntoView do Chrome recente devolve uma Promise, que o React tomaria por função de limpeza
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = () =>
    start(async () => {
      const result = await sendThreadMessage(threadId, body);
      if (!result.ok) return void toast.error(result.message);
      setBody("");
      // Com tempo real a mensagem chega pelo onSnapshot; sem ele, mostra-se já do lado do cliente
      if (!live.current) {
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), authorKind: "cliente", authorName: "Tu", body, at: new Date() },
        ]);
      }
    });

  return (
    <div className="space-y-6">
      <ol className="space-y-4" aria-live="polite">
        {messages.map((message) => {
          const mine = message.authorKind === "cliente";
          return (
            <li key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-md px-4 py-3 text-sm",
                  mine ? "bg-ink text-paper" : "border border-line bg-card",
                )}
              >
                <p className={cn("mb-1 text-xs", mine ? "text-paper/60" : "text-ink-3")}>
                  {mine ? "Tu" : `${message.authorName} · Endju`} · {formatDateTime(message.at)}
                </p>
                <p className="whitespace-pre-line">{message.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={end} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) send();
        }}
        className="space-y-2"
      >
        <Textarea
          rows={3}
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreve a tua resposta"
          aria-label="Resposta"
        />
        <Button type="submit" loading={pending} disabled={!body.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
