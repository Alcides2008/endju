"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatKz, fromCents, toCents } from "@/lib/domain/money";
import { quoteTotals } from "@/lib/domain/pricing";
import { assignQuote, convertQuote, sendQuoteVersion, type QuoteResult } from "../quote-actions";

const DEFAULT_TERMS =
  "Preços com IVA incluído (14 %). Pagamento: sinal de 50 % na adjudicação e o restante no levantamento. " +
  "Prazo de produção: 5 dias úteis após a aprovação da prova e o pagamento do sinal. Entrega combinada à parte.";

type Draft = { description: string; quantity: string; price: string };

export function QuoteEditor({
  quoteId,
  nextVersion,
  initial,
}: {
  quoteId: string;
  nextVersion: number;
  initial: {
    lines: { description: string; quantity: number; unitPrice: number }[];
    discount: number;
    terms: string;
    notes?: string;
  } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<Draft[]>(
    initial?.lines.map((l) => ({
      description: l.description,
      quantity: String(l.quantity),
      price: fromCents(l.unitPrice),
    })) ?? [{ description: "", quantity: "1", price: "" }],
  );
  const [discount, setDiscount] = useState(initial?.discount ? fromCents(initial.discount) : "");
  const [validDays, setValidDays] = useState("15");
  const [terms, setTerms] = useState(initial?.terms ?? DEFAULT_TERMS);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const parsed = lines.map((l) => ({
    description: l.description,
    quantity: Number(l.quantity),
    unitPrice: toCents(l.price),
  }));
  const valid = parsed.every(
    (l) => Number.isInteger(l.quantity) && l.quantity > 0 && Number.isFinite(l.unitPrice) && l.unitPrice > 0,
  );
  const discountCents = discount.trim() ? toCents(discount) : 0;
  const totals = valid && Number.isFinite(discountCents) ? quoteTotals(parsed, discountCents) : null;
  const set = (i: number, patch: Partial<Draft>) =>
    setLines((all) => all.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const send = () =>
    start(async () => {
      const result = await sendQuoteVersion(quoteId, {
        lines: parsed,
        discount: discountCents,
        validDays: Number(validDays),
        terms,
        notes,
      });
      if (!result.ok) return void toast.error(result.message);
      toast.success(`Proposta v${nextVersion} enviada ao cliente.`);
      router.refresh();
    });

  return (
    <section aria-labelledby="editor" className="space-y-4 rounded-sm border border-line bg-card p-5">
      <h2 id="editor" className="text-base font-semibold">
        {nextVersion === 1 ? "Preparar a proposta" : `Nova versão (v${nextVersion})`}
      </h2>
      <div className="space-y-3">
        <div className="hidden grid-cols-[minmax(0,1fr)_5rem_8rem_2.75rem] gap-2 text-xs font-medium text-ink-3 sm:grid">
          <span>Descrição</span>
          <span>Qtd.</span>
          <span>Preço unit. (Kz, c/ IVA)</span>
        </div>
        {lines.map((line, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_8rem_2.75rem]"
          >
            <Input
              aria-label={`Descrição da linha ${i + 1}`}
              placeholder="Ex.: Roll-up 85 × 200 cm com estrutura e bolsa"
              value={line.description}
              onChange={(e) => set(i, { description: e.target.value })}
              className="col-span-2 sm:col-span-1"
            />
            <Input
              aria-label={`Quantidade da linha ${i + 1}`}
              inputMode="numeric"
              value={line.quantity}
              onChange={(e) => set(i, { quantity: e.target.value })}
            />
            <Input
              aria-label={`Preço unitário da linha ${i + 1}`}
              inputMode="decimal"
              placeholder="0,00"
              value={line.price}
              onChange={(e) => set(i, { price: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remover linha ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((all) => all.filter((_, j) => j !== i))}
              className="hidden sm:inline-flex"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLines((all) => [...all, { description: "", quantity: "1", price: "" }])}
        >
          <Plus className="size-4" aria-hidden /> Adicionar linha
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Desconto (Kz)" hint="Opcional, com IVA.">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </Field>
        <Field label="Validade">
          <Select
            value={validDays}
            onValueChange={setValidDays}
            options={[
              { value: "7", label: "7 dias" },
              { value: "15", label: "15 dias" },
              { value: "30", label: "30 dias" },
            ]}
          />
        </Field>
      </div>
      <Field label="Condições">
        <Textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
      </Field>
      <Field label="Nota para o cliente" hint="Opcional. Aparece no PDF da proposta.">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <p className="text-sm text-ink-2">
          {totals ? (
            <>
              IVA {formatKz(totals.tax)} ·{" "}
              <span className="text-base font-semibold text-ink">Total {formatKz(totals.total)}</span>
            </>
          ) : (
            "Preenche quantidades e preços para ver o total."
          )}
        </p>
        <Button loading={pending} disabled={!totals || totals.total <= 0} onClick={send}>
          Enviar proposta v{nextVersion}
        </Button>
      </div>
    </section>
  );
}

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<QuoteResult>, done: (result: Extract<QuoteResult, { ok: true }>) => void) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.message);
      done(result);
      router.refresh();
    });
  return { pending, run, router };
}

export function QuoteAssign({
  quoteId,
  assigneeId,
  staff,
}: {
  quoteId: string;
  assigneeId?: string;
  staff: { uid: string; name: string }[];
}) {
  const { run } = useRun();
  return (
    <Field label="Responsável">
      <Select
        options={[
          { value: "ninguem", label: "Sem responsável" },
          ...staff.map((s) => ({ value: s.uid, label: s.name })),
        ]}
        value={assigneeId ?? "ninguem"}
        onValueChange={(v) =>
          run(
            () => assignQuote(quoteId, v === "ninguem" ? "" : v),
            () => toast.success("Responsável atualizado."),
          )
        }
      />
    </Field>
  );
}

export function ConvertQuoteButton({
  quoteId,
  accepted,
  total,
}: {
  quoteId: string;
  accepted: boolean;
  total: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run, router } = useRun();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="ink">Converter em pedido</Button>}
      title="Converter em pedido"
      description={
        accepted
          ? `Cria um pedido de ${total} com as linhas desta proposta.`
          : `O cliente ainda não aceitou no site. Converte só se aceitou por telefone ou WhatsApp. Total ${total}.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              run(
                () => convertQuote(quoteId),
                (result) => {
                  toast.success(`Pedido ${result.number} criado.`);
                  router.push(`/admin/pedidos/${result.number}`);
                },
              )
            }
          >
            Criar pedido
          </Button>
        </>
      }
    />
  );
}
