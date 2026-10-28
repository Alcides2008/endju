"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatKz } from "@/lib/domain/money";
import { NEXT_STATUSES, ORDER_STATUS_META, type OrderStatus } from "@/lib/domain/order-status";
import {
  addInternalNote,
  assignOrder,
  changeOrderStatus,
  registerPayment,
  setOrderDueDate,
  type AdminResult,
} from "../order-actions";

/** Corre uma Server Action do painel: mostra o erro ou o aviso de sucesso e atualiza a página. */
export function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (action: () => Promise<AdminResult>, done: string, after?: () => void) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.message);
      toast.success(done);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-sm border border-line bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function StatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const options = NEXT_STATUSES[status];
  const [to, setTo] = useState<OrderStatus | "">(options[0] ?? "");
  const [reason, setReason] = useState("");
  const { pending, run } = useRun();
  if (options.length === 0) return null;
  return (
    <Card title="Estado">
      <Select
        options={options.map((s) => ({ value: s, label: ORDER_STATUS_META[s].label }))}
        value={to}
        onValueChange={(v) => setTo(v as OrderStatus)}
      />
      {to === "cancelado" && (
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo do cancelamento"
          aria-label="Motivo do cancelamento"
        />
      )}
      <Button
        size="sm"
        className="w-full"
        loading={pending}
        disabled={!to}
        onClick={() => to && run(() => changeOrderStatus(orderId, to, reason), "Estado atualizado.")}
      >
        Mudar para {to ? ORDER_STATUS_META[to].label : "…"}
      </Button>
    </Card>
  );
}

export function AssignControl({
  orderId,
  assigneeId,
  dueAt,
  staff,
}: {
  orderId: string;
  assigneeId?: string;
  dueAt: string;
  staff: { uid: string; name: string; role: string }[];
}) {
  const [date, setDate] = useState(dueAt);
  const { pending, run } = useRun();
  return (
    <Card title="Responsável e prazo">
      <Select
        options={[
          { value: "ninguem", label: "Sem responsável" },
          ...staff.map((s) => ({ value: s.uid, label: s.name })),
        ]}
        value={assigneeId ?? "ninguem"}
        onValueChange={(v) => run(() => assignOrder(orderId, v === "ninguem" ? "" : v), "Responsável atualizado.")}
      />
      <div className="flex items-end gap-2">
        <Field label="Prazo" className="flex-1">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          disabled={!date || date === dueAt}
          onClick={() => run(() => setOrderDueDate(orderId, date), "Prazo atualizado.")}
        >
          Guardar
        </Button>
      </div>
    </Card>
  );
}

const METHODS = [
  { value: "numerario", label: "Numerário" },
  { value: "tpa", label: "TPA (cartão)" },
  { value: "transferencia", label: "Transferência" },
  { value: "multicaixa_express", label: "Multicaixa Express" },
  { value: "referencia", label: "Pagamento por referência" },
];

export function PaymentControl({ orderId, due, depositLeft }: { orderId: string; due: number; depositLeft: number }) {
  const [amount, setAmount] = useState(String((depositLeft || due) / 100));
  const [method, setMethod] = useState("transferencia");
  const [reference, setReference] = useState("");
  const { pending, run } = useRun();
  if (due <= 0) return null;
  const cents = Math.round(Number(amount.replace(/\s/g, "").replace(",", ".")) * 100);
  return (
    <Card title="Registar pagamento">
      <p className="text-xs text-ink-3">
        Em falta {formatKz(due)}
        {depositLeft > 0 && ` · sinal em falta ${formatKz(depositLeft)}`}
      </p>
      <Field label="Valor (Kz)">
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Select options={METHODS} value={method} onValueChange={setMethod} />
      <Field label="Referência (opcional)">
        <Input
          placeholder="N.º do talão ou da transferência"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>
      <Button
        size="sm"
        className="w-full"
        loading={pending}
        disabled={!Number.isFinite(cents) || cents <= 0}
        onClick={() =>
          run(
            () =>
              registerPayment(orderId, {
                amount: cents,
                method: method as "numerario",
                kind: depositLeft > 0 ? (cents >= due ? "total" : "sinal") : "restante",
                reference,
              }),
            "Pagamento registado.",
          )
        }
      >
        Registar {Number.isFinite(cents) && cents > 0 ? formatKz(cents) : ""}
      </Button>
    </Card>
  );
}

export function NoteControl({ orderId }: { orderId: string }) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const { pending, run } = useRun();
  return (
    <Card title="Nota">
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: cliente pediu para ligar antes de entregar."
        aria-label="Nota"
      />
      <Checkbox checked={visible} onChange={(e) => setVisible(e.target.checked)}>
        Visível para o cliente na linha do tempo
      </Checkbox>
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        disabled={text.trim().length < 2}
        onClick={() =>
          run(
            () => addInternalNote(orderId, text, visible),
            "Nota guardada.",
            () => setText(""),
          )
        }
      >
        Guardar nota
      </Button>
    </Card>
  );
}
