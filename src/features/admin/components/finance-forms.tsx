"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  INVOICE_LABELS,
  INVOICE_TYPES,
  PAYMENT_METHOD_LABELS,
  type ExpenseCategory,
  type InvoiceType,
  type MatchCandidate,
} from "@/lib/domain/finance";
import { formatKz, fromCents, toCents } from "@/lib/domain/money";
import {
  importStatement,
  lineCandidates,
  payExpense,
  registerInvoice,
  saveExpense,
  setLine,
  validateTransfer,
  voidInvoice,
} from "../finance-actions";
import { useRun } from "./order-admin-panel";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda" }).format(new Date());
const kz = (text: string) => (text.trim() ? toCents(text) || 0 : 0);
const METHODS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

export type ExpenseDraft = {
  id: string;
  category: ExpenseCategory;
  description: string;
  supplierId: string;
  amount: number;
  taxAmount: number;
  day: string;
  dueDay: string;
  recurring: boolean;
};

/** Nova despesa ou edição de uma pendente. */
export function ExpenseButton({
  expense,
  suppliers,
}: {
  expense?: ExpenseDraft;
  suppliers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const blank = {
    category: "outros" as ExpenseCategory,
    description: "",
    supplierId: "",
    amount: "",
    tax: "",
    day: today(),
    dueDay: "",
    recurring: false,
  };
  const [d, setD] = useState(
    expense
      ? { ...expense, amount: fromCents(expense.amount), tax: expense.taxAmount ? fromCents(expense.taxAmount) : "" }
      : blank,
  );
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={expense ? "Editar despesa" : "Nova despesa"}
      description="Valor com IVA incluído. O IVA à parte é o que se pode deduzir (está na fatura do fornecedor)."
      trigger={
        expense ? (
          <Button size="sm" variant="ghost">
            Editar
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> Nova despesa
          </Button>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              run(
                () =>
                  saveExpense(expense?.id ?? null, {
                    category: d.category,
                    description: d.description,
                    supplierId: d.supplierId,
                    amount: kz(d.amount),
                    taxAmount: kz(d.tax),
                    day: d.day,
                    dueDay: d.dueDay,
                    recurring: d.recurring,
                  }),
                expense ? "Despesa guardada." : "Despesa registada.",
                () => {
                  setOpen(false);
                  if (!expense) setD(blank);
                },
              )
            }
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" className="sm:col-span-2">
          <Input
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Ex.: Gasóleo do gerador · semana 44"
          />
        </Field>
        <Field label="Categoria">
          <Select
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_LABELS[c] }))}
            value={d.category}
            onValueChange={(v) => set({ category: v as ExpenseCategory })}
          />
        </Field>
        <Field label="Fornecedor (opcional)">
          <Select
            options={[{ value: "nenhum", label: "Nenhum" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]}
            value={d.supplierId || "nenhum"}
            onValueChange={(v) => set({ supplierId: v === "nenhum" ? "" : v })}
          />
        </Field>
        <Field label="Valor com IVA (Kz)">
          <Input inputMode="decimal" value={d.amount} onChange={(e) => set({ amount: e.target.value })} />
        </Field>
        <Field label="IVA dedutível (Kz)" hint="Vazio se a fatura não tiver IVA.">
          <Input inputMode="decimal" value={d.tax} onChange={(e) => set({ tax: e.target.value })} />
        </Field>
        <Field label="Data">
          <Input type="date" value={d.day} onChange={(e) => set({ day: e.target.value })} />
        </Field>
        <Field label="Vence a (opcional)">
          <Input type="date" value={d.dueDay} onChange={(e) => set({ dueDay: e.target.value })} />
        </Field>
      </div>
      <Checkbox checked={d.recurring} onChange={(e) => set({ recurring: e.target.checked })}>
        Repete todos os meses (renda, internet, salários): ao pagar, fica criada a do mês seguinte
      </Checkbox>
    </Modal>
  );
}

export function PayExpenseButton({ id, amount }: { id: string; amount: number }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("transferencia");
  const [day, setDay] = useState(today());
  const { pending, run } = useRun();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={`Pagar ${formatKz(amount)}`}
      trigger={<Button size="sm">Pagar</Button>}
      footer={
        <Button
          loading={pending}
          onClick={() =>
            run(
              () => payExpense(id, { method, day }),
              "Despesa paga.",
              () => setOpen(false),
            )
          }
        >
          Marcar como paga
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meio">
          <Select options={METHODS} value={method} onValueChange={setMethod} />
        </Field>
        <Field label="Data do pagamento">
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Regista um documento já emitido no programa de faturação certificado. */
export function InvoiceButton() {
  const [open, setOpen] = useState(false);
  const blank = {
    docType: "fatura_recibo" as InvoiceType,
    number: "",
    orderNumber: "",
    customerName: "",
    customerNif: "",
    total: "",
    tax: "",
    day: today(),
  };
  const [d, setD] = useState(blank);
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Registar documento"
      description="Copia os dados do documento emitido no programa de faturação certificado (AGT). O painel não emite faturas."
      trigger={
        <Button>
          <Plus aria-hidden /> Registar documento
        </Button>
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              run(
                () => registerInvoice({ ...d, total: kz(d.total), tax: kz(d.tax) }),
                "Documento registado.",
                () => {
                  setOpen(false);
                  setD(blank);
                },
              )
            }
          >
            Registar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <Select
            options={INVOICE_TYPES.map((t) => ({ value: t, label: INVOICE_LABELS[t] }))}
            value={d.docType}
            onValueChange={(v) => set({ docType: v as InvoiceType })}
          />
        </Field>
        <Field label="Número do documento">
          <Input value={d.number} onChange={(e) => set({ number: e.target.value })} placeholder="Ex.: FR A/123" />
        </Field>
        <Field label="Pedido (opcional)" hint="Liga ao pedido e copia o cliente.">
          <Input
            value={d.orderNumber}
            onChange={(e) => set({ orderNumber: e.target.value })}
            placeholder="EDJ-2026-00001"
          />
        </Field>
        <Field label="Data de emissão">
          <Input type="date" value={d.day} onChange={(e) => set({ day: e.target.value })} />
        </Field>
        <Field label="Cliente (sem pedido)">
          <Input value={d.customerName} onChange={(e) => set({ customerName: e.target.value })} />
        </Field>
        <Field label="NIF do cliente (opcional)">
          <Input value={d.customerNif} onChange={(e) => set({ customerNif: e.target.value })} />
        </Field>
        <Field label="Total com IVA (Kz)">
          <Input inputMode="decimal" value={d.total} onChange={(e) => set({ total: e.target.value })} />
        </Field>
        <Field label="IVA (Kz)">
          <Input inputMode="decimal" value={d.tax} onChange={(e) => set({ tax: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

export function VoidInvoiceButton({ id, number }: { id: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useRun();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={`Anular ${number}?`}
      description="Anula aqui o que já foi anulado no programa de faturação. O registo fica, mas sai das contas do IVA."
      trigger={
        <Button size="sm" variant="ghost">
          Anular
        </Button>
      }
      footer={
        <Button
          variant="danger"
          loading={pending}
          onClick={() =>
            run(
              () => voidInvoice(id, reason),
              "Documento anulado.",
              () => setOpen(false),
            )
          }
        >
          Anular documento
        </Button>
      }
    >
      <Field label="Motivo">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}

/** Importa o CSV do extrato: o ficheiro é lido aqui e só o texto vai para o servidor. */
export function StatementImportForm() {
  const router = useRouter();
  const [source, setSource] = useState("banco");
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-sm border border-line bg-card p-4">
      <Field label="Origem" className="w-48">
        <Select
          options={[
            { value: "banco", label: "Extrato do banco" },
            { value: "multicaixa", label: "Multicaixa" },
          ]}
          value={source}
          onValueChange={setSource}
        />
      </Field>
      <Field label="Ficheiro CSV" className="min-w-60 flex-1">
        <Input
          type="file"
          accept=".csv,text/csv"
          className="py-2.5"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <Button
        loading={pending}
        disabled={!file}
        onClick={() =>
          start(async () => {
            if (!file) return;
            if (file.size > 2_000_000)
              return void toast.error("Ficheiro grande demais: divide o extrato por quinzena.");
            const result = await importStatement({ source, fileName: file.name, csv: await file.text() });
            if (!result.ok) return void toast.error(result.message);
            toast.success(`${result.lines} entrada(s) lidas, ${result.matched} conciliada(s) sozinhas.`);
            router.push(`/admin/financeiro/conciliacao/${result.id}`);
          })
        }
      >
        Importar e conciliar
      </Button>
    </div>
  );
}

export function LineActions({
  importId,
  lineId,
  status,
  amount,
}: {
  importId: string;
  lineId: string;
  status: "por_conciliar" | "conciliada" | "ignorada";
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<MatchCandidate[] | null>(null);
  const { pending, run } = useRun();
  if (status === "conciliada")
    return (
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        onClick={() => run(() => setLine(importId, lineId, { kind: "unmatch" }), "Conciliação desfeita.")}
      >
        Desfazer
      </Button>
    );
  if (status === "ignorada")
    return (
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        onClick={() => run(() => setLine(importId, lineId, { kind: "unmatch" }), "Linha reposta.")}
      >
        Repor
      </Button>
    );
  return (
    <div className="flex justify-end gap-1">
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next && !options) void lineCandidates(importId, lineId).then(setOptions);
        }}
        title={`Que pagamento é este (${formatKz(amount)})?`}
        description="Pagamentos confirmados e ainda por conciliar, até 6 dias antes ou depois. Os do mesmo valor aparecem primeiro."
        trigger={<Button size="sm">Conciliar</Button>}
      >
        {!options ? (
          <p className="text-sm text-ink-3">A procurar…</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-ink-2">
            Nenhum pagamento por conciliar nessas datas. Se for um pagamento novo, regista-o no pedido.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-sm border border-line">
            {options.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  <span className="font-mono text-xs">{p.orderNumber}</span> · {p.day.split("-").reverse().join("/")}
                  {p.reference && <span className="text-ink-3"> · {p.reference}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className={p.amount === amount ? "font-semibold" : "text-ink-3"}>{formatKz(p.amount)}</span>
                  <Button
                    size="sm"
                    loading={pending}
                    onClick={() =>
                      run(
                        () => setLine(importId, lineId, { kind: "match", paymentId: p.id }),
                        "Linha conciliada.",
                        () => setOpen(false),
                      )
                    }
                  >
                    Escolher
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        onClick={() => run(() => setLine(importId, lineId, { kind: "ignore" }), "Linha ignorada.")}
      >
        Ignorar
      </Button>
    </div>
  );
}

/** Confirmar ou recusar uma transferência com comprovativo. */
export function TransferDecision({ paymentId }: { paymentId: string }) {
  const [reason, setReason] = useState("");
  const [refusing, setRefusing] = useState(false);
  const { pending, run } = useRun();
  return refusing ? (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="h-9 w-56"
        placeholder="Motivo (ex.: valor diferente)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        size="sm"
        variant="danger"
        loading={pending}
        onClick={() =>
          run(
            () => validateTransfer(paymentId, { accept: false, reason }),
            "Comprovativo recusado; o cliente foi avisado.",
          )
        }
      >
        Recusar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setRefusing(false)}>
        Voltar
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button
        size="sm"
        loading={pending}
        onClick={() =>
          run(() => validateTransfer(paymentId, { accept: true }), "Pagamento confirmado e somado ao pedido.")
        }
      >
        Confirmar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setRefusing(true)}>
        Recusar
      </Button>
    </div>
  );
}
