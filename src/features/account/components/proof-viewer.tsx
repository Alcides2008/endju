"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { CircleCheck, MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/dates";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { addProofComment, approveProof, requestProofChanges } from "../actions";
import type { ProofComment, ProofView } from "../server";
import { PROOF_TERMS } from "../terms";

const MAX_ZOOM = 6;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Imagem da prova com zoom (botões, Ctrl + roda, pinça) e arrastar; em modo comentário, um toque marca um pino. */
export function ZoomImage({
  src,
  alt,
  ratio,
  pins,
  draftPin,
  pinMode,
  onPin,
}: {
  src: string;
  alt: string;
  ratio: number;
  pins: { n: number; x: number; y: number }[];
  draftPin: { x: number; y: number } | null;
  pinMode: boolean;
  onPin: (pin: { x: number; y: number }) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; pinch?: number; startS?: number }>({ moved: false });

  const zoomAt = (s: number, cx: number, cy: number) =>
    setView((v) => {
      const el = box.current;
      if (!el) return v;
      const ns = clamp(s, 1, MAX_ZOOM);
      const u = (cx - v.x) / v.s;
      const w = (cy - v.y) / v.s;
      return {
        s: ns,
        x: clamp(cx - u * ns, el.clientWidth * (1 - ns), 0),
        y: clamp(cy - w * ns, el.clientHeight * (1 - ns), 0),
      };
    });

  const center = () => ({ x: (box.current?.clientWidth ?? 0) / 2, y: (box.current?.clientHeight ?? 0) / 2 });

  // Ctrl + roda (e a pinça do trackpad) aproxima; a roda sozinha continua a fazer scroll à página
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      setView((v) => {
        const ns = clamp(v.s * Math.exp(-event.deltaY * 0.01), 1, MAX_ZOOM);
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        const u = (cx - v.x) / v.s;
        const w = (cy - v.y) / v.s;
        return {
          s: ns,
          x: clamp(cx - u * ns, el.clientWidth * (1 - ns), 0),
          y: clamp(cy - w * ns, el.clientHeight * (1 - ns), 0),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const local = (event: React.PointerEvent) => {
    const rect = box.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    gesture.current = { moved: false };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { moved: true, pinch: Math.hypot(a.x - b.x, a.y - b.y), startS: view.s };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const prev = pointers.current.get(event.pointerId);
    if (!prev) return;
    const next = local(event);
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 2 && gesture.current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((gesture.current.startS ?? 1) * (distance / gesture.current.pinch), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) gesture.current.moved = true;
    setView((v) => {
      const el = box.current!;
      return {
        ...v,
        x: clamp(v.x + dx, el.clientWidth * (1 - v.s), 0),
        y: clamp(v.y + dy, el.clientHeight * (1 - v.s), 0),
      };
    });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const point = pointers.current.get(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (pinMode && point && !gesture.current.moved && pointers.current.size === 0) {
      const el = box.current!;
      onPin({
        x: clamp((point.x - view.x) / view.s / el.clientWidth, 0, 1),
        y: clamp((point.y - view.y) / view.s / el.clientHeight, 0, 1),
      });
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={box}
        className={cn(
          "relative mx-auto max-h-[72vh] overflow-hidden rounded-sm border border-line bg-[repeating-conic-gradient(var(--paper-2)_0_25%,var(--card)_0_50%)] bg-[length:24px_24px] select-none",
          pinMode ? "cursor-crosshair" : view.s > 1 ? "cursor-grab active:cursor-grabbing" : "",
          view.s > 1 || pinMode ? "touch-none" : "touch-pan-y",
        )}
        style={{ aspectRatio: ratio, maxWidth: `calc(72vh * ${ratio})` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(event) => {
          const rect = box.current!.getBoundingClientRect();
          zoomAt(view.s > 1 ? 1 : 2.5, event.clientX - rect.left, event.clientY - rect.top);
        }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- prova em alta, com zoom próprio; o otimizador reduziria a resolução */}
          <img src={src} alt={alt} draggable={false} className="size-full object-contain" />
          {[...pins, ...(draftPin ? [{ n: 0, ...draftPin }] : [])].map((pin) => (
            <span
              key={`${pin.n}-${pin.x}-${pin.y}`}
              className={cn(
                "absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-paper",
                pin.n === 0 ? "bg-brand text-brand-fg" : "bg-ink text-paper",
              )}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, scale: `${1 / view.s}` }}
            >
              {pin.n || "+"}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Afastar"
          onClick={() => zoomAt(view.s / 1.5, center().x, center().y)}
        >
          <Minus aria-hidden />
        </Button>
        <span className="w-14 text-center font-mono text-xs">{Math.round(view.s * 100)} %</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Aproximar"
          onClick={() => zoomAt(view.s * 1.5, center().x, center().y)}
        >
          <Plus aria-hidden />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setView({ s: 1, x: 0, y: 0 })}>
          <RotateCcw aria-hidden /> Ajustar
        </Button>
        <span className="hidden sm:inline">Duplo clique, Ctrl + roda ou pinça para aproximar.</span>
      </div>
    </div>
  );
}

export function ProofViewer({ proof, initialComments }: { proof: ProofView; initialComments: ProofComment[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [changes, setChanges] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState("");
  const [dialog, setDialog] = useState<"aprovar" | "alteracoes" | null>(null);
  const [pending, start] = useTransition();
  const open = proof.status === "pendente";

  // Comentários em tempo real (a equipa pode responder enquanto o cliente revê)
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onSnapshot(
      collection(getClientDb(), "proofs", proof.id, "comments"),
      (snap) =>
        setComments(
          snap.docs
            .map((d) => ({
              id: d.id,
              authorName: d.get("authorName"),
              authorKind: d.get("authorKind"),
              body: d.get("body"),
              pin: d.get("pin"),
              at: (d.get("createdAt") as Timestamp | null)?.toDate() ?? null,
            }))
            .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0)),
        ),
      (error) => console.warn("[prova] sem tempo real:", error.message),
    );
  }, [proof.id]);

  const pinned = comments.filter((c) => c.pin);
  const pinNumber = (id: string) => pinned.findIndex((c) => c.id === id) + 1;

  const sendComment = () =>
    start(async () => {
      const result = await addProofComment({ proofId: proof.id, body: draft, pin: draftPin });
      if (!result.ok) return void toast.error(result.message);
      setDraft("");
      setDraftPin(null);
      setPinMode(false);
      router.refresh();
    });

  const decide = (kind: "aprovar" | "alteracoes") =>
    start(async () => {
      const result =
        kind === "aprovar"
          ? await approveProof(proof.id, accepted, note)
          : await requestProofChanges(proof.id, changes);
      if (!result.ok) return void toast.error(result.message);
      setDialog(null);
      toast.success(kind === "aprovar" ? "Prova aprovada. Obrigado!" : "Pedido de alterações enviado ao designer.");
      router.refresh();
    });

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <ZoomImage
          src={proof.preview.url}
          alt={`Prova v${proof.version} de ${proof.itemName}`}
          ratio={proof.preview.width / proof.preview.height}
          pins={pinned.map((c) => ({ n: pinNumber(c.id), ...c.pin! }))}
          draftPin={draftPin}
          pinMode={pinMode}
          onPin={setDraftPin}
        />
      </div>

      <aside className="space-y-6">
        {proof.message && (
          <div className="rounded-sm border border-line bg-card p-4 text-sm">
            <p className="eyebrow text-ink-3">Nota do designer</p>
            <p className="mt-2 text-ink-2">{proof.message}</p>
          </div>
        )}

        {proof.status === "aprovada" && proof.decision && (
          <p className="flex items-start gap-2 rounded-sm border border-success/30 bg-success/10 p-4 text-sm">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            Aprovada por {proof.decision.byName} a {formatDateTime(proof.decision.at)}.
          </p>
        )}
        {proof.status === "alteracoes_pedidas" && (
          <p className="rounded-sm border border-line bg-card p-4 text-sm text-ink-2">
            Pediste alterações. O designer vai enviar uma nova versão.
          </p>
        )}

        <section aria-labelledby="comentarios" className="space-y-3">
          <h2 id="comentarios" className="text-base font-semibold">
            Comentários
          </h2>
          {comments.length === 0 && <p className="text-sm text-ink-3">Ainda sem comentários.</p>}
          <ol className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-sm border border-line bg-card p-3 text-sm">
                <p className="flex items-center gap-2 text-xs text-ink-3">
                  {comment.pin && (
                    <span className="grid size-5 place-items-center rounded-full bg-ink text-[0.625rem] font-bold text-paper">
                      {pinNumber(comment.id)}
                    </span>
                  )}
                  <span className="font-medium text-ink">
                    {comment.authorKind === "equipa" ? `${comment.authorName} · Endju` : comment.authorName}
                  </span>
                  {formatDateTime(comment.at)}
                </p>
                <p className="mt-1.5 text-ink-2">{comment.body}</p>
              </li>
            ))}
          </ol>

          {open && (
            <div className="space-y-2 rounded-sm border border-dashed border-line p-3">
              <Button
                type="button"
                variant={pinMode ? "ink" : "outline"}
                size="sm"
                onClick={() => {
                  setPinMode((m) => !m);
                  setDraftPin(null);
                }}
              >
                <MapPin aria-hidden />{" "}
                {pinMode ? (draftPin ? "Ponto marcado" : "Toca na prova para marcar") : "Marcar um ponto"}
              </Button>
              <Textarea
                rows={3}
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ex.: o telefone está errado, é 923 456 789."
                aria-label="Novo comentário"
              />
              <Button
                type="button"
                size="sm"
                loading={pending}
                disabled={draft.trim().length < 2}
                onClick={sendComment}
              >
                Comentar
              </Button>
            </div>
          )}
        </section>

        {open && (
          <div className="flex flex-col gap-2 border-t border-line pt-6">
            <Modal
              open={dialog === "aprovar"}
              onOpenChange={(v) => setDialog(v ? "aprovar" : null)}
              trigger={<Button size="lg">Aprovar prova</Button>}
              title={`Aprovar a prova v${proof.version}?`}
              description="A aprovação fica registada com a data e a hora. A produção começa quando o sinal estiver pago."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDialog(null)}>
                    Voltar
                  </Button>
                  <Button loading={pending} disabled={!accepted} onClick={() => decide("aprovar")}>
                    Aprovar e autorizar a produção
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
                  {PROOF_TERMS}
                </Checkbox>
                <Textarea
                  rows={2}
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota (opcional)"
                  aria-label="Nota da aprovação"
                />
              </div>
            </Modal>
            <Modal
              open={dialog === "alteracoes"}
              onOpenChange={(v) => setDialog(v ? "alteracoes" : null)}
              trigger={<Button variant="outline">Pedir alterações</Button>}
              title="O que devemos mudar?"
              description="Os comentários com pinos também seguem para o designer. Estão incluídas 3 revisões."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDialog(null)}>
                    Voltar
                  </Button>
                  <Button loading={pending} disabled={changes.trim().length < 5} onClick={() => decide("alteracoes")}>
                    Enviar pedido de alterações
                  </Button>
                </>
              }
            >
              <Textarea
                rows={5}
                value={changes}
                maxLength={1000}
                onChange={(e) => setChanges(e.target.value)}
                placeholder="Ex.: aumentar o logótipo e trocar o fundo para branco."
                aria-label="Alterações"
              />
            </Modal>
          </div>
        )}
      </aside>
    </div>
  );
}
