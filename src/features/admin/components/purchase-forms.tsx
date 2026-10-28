"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatKz, fromCents, parseDecimal, toCents } from "@/lib/domain/money";
import {
  CATEGORY_LABELS,
  formatQty,
  MATERIAL_CATEGORIES,
  purchaseTotals,
  roundQty,
  UNIT_LABELS,
  type MaterialCategory,
  type StockUnit,
} from "@/lib/domain/stock";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  payPurchaseOrder,
  receivePurchaseOrder,
  updatePurchaseOrder,
  updateSupplier,
  type SupplierInput,
} from "../purchase-actions";
import { useRun } from "./order-admin-panel";

// ── Fornecedores ────────────────────────────────────────────────────────────

type SupplierDraft = Omit<SupplierInput, "paymentTermsDays" | "rating"> & { paymentTermsDays: string; rating: string };

const EMPTY_SUPPLIER: SupplierDraft = {
  name: "",
  nif: "",
  contactName: "",
  phone: "",
  email: "",
  categories: [],
  paymentTermsDays: "0",
  iban: "",
  address: "",
  rating: "0",
  notes: "",
  active: true,
};

const supplierInput = (d: SupplierDraft): SupplierInput => ({
  ...d,
  paymentTermsDays: Number(d.paymentTermsDays) || 0,
  rating: Number(d.rating) || 0,
});

function SupplierFields({ values, set }: { values: SupplierDraft; set: (patch: Partial<SupplierDraft>) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome ou razão social" className="sm:col-span-2">
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="NIF (opcional)">
        <Input value={values.nif} onChange={(e) => set({ nif: e.target.value })} />
      </Field>
      <Field label="Prazo de pagamento">
        <Select
          options={[
            { value: "0", label: "Pronto pagamento" },
            { value: "15", label: "15 dias" },
            { value: "30", label: "30 dias" },
            { value: "60", label: "60 dias" },
          ]}
          value={values.paymentTermsDays}
          onValueChange={(v) => set({ paymentTermsDays: v })}
        />
      </Field>
      <Field label="Pessoa de contacto">
        <Input value={values.contactName} onChange={(e) => set({ contactName: e.target.value })} />
      </Field>
      <Field label="Telefone">
        <Input type="tel" inputMode="tel" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field label="Email (opcional)">
        <Input type="email" value={values.email} onChange={(e) => set({ email: e.target.value })} />
      </Field>
      <Field label="Avaliação">
        <Select
          options={[
            { value: "0", label: "Sem avaliação" },
            ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} de 5` })),
          ]}
          value={values.rating}
          onValueChange={(v) => set({ rating: v })}
        />
      </Field>
      <Field label="IBAN (opcional)" className="sm:col-span-2">
        <Input value={values.iban} onChange={(e) => set({ iban: e.target.value })} placeholder="AO06…" />
      </Field>
      <Field label="Morada (opcional)" className="sm:col-span-2">
        <Input value={values.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">O que fornece</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MATERIAL_CATEGORIES.map((c) => (
            <Checkbox
              key={c}
              checked={values.categories.includes(c)}
              onChange={(e) =>
                set({
                  categories: e.target.checked
                    ? [...values.categories, c]
                    : values.categories.filter((x: MaterialCategory) => x !== c),
                })
              }
            >
              {CATEGORY_LABELS[c]}
            </Checkbox>
          ))}
        </div>
      </fieldset>
      <Field label="Notas" className="sm:col-span-2">
        <Textarea rows={2} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

export function NewSupplierButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY_SUPPLIER);
  const [pending, start] = useTransition();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo fornecedor</Button>}
      title="Novo fornecedor"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await createSupplier(supplierInput(values));
                if (!result.ok) return void toast.error(result.message);
                setOpen(false);
                setValues(EMPTY_SUPPLIER);
                router.push(`/admin/compras/fornecedores/${result.id}`);
              })
            }
          >
            Criar fornecedor
          </Button>
        </>
      }
    >
      <SupplierFields values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} />
    </Modal>
  );
}

export function EditSupplierForm({ id, defaults }: { id: string; defaults: SupplierInput }) {
  const [values, setValues] = useState<SupplierDraft>({
    ...defaults,
    paymentTermsDays: String(defaults.paymentTermsDays),
    rating: String(defaults.rating),
  });
  const { pending, run } = useRun();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateSupplier(id, supplierInput(values)), "Fornecedor atualizado.");
      }}
      className="space-y-4"
    >
      <SupplierFields values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} />
      <Checkbox checked={!values.active} onChange={(e) => setValues((v) => ({ ...v, active: !e.target.checked }))}>
        Fornecedor inativo (deixa de aparecer nas encomendas novas)
      </Checkbox>
      <Button type="submit" loading={pending}>
        Guardar fornecedor
      </Button>
    </form>
  );
}

// ── Encomendas de compra ────────────────────────────────────────────────────

type MaterialOption = { id: string; name: string; unit: StockUnit; avgCost: number; supplierIds: string[] };
type LineDraft = { materialId: string; qty: string; cost: string };

/** Nova encomenda ou rascunho a rever: fornecedor, linhas, data prevista. Total com IVA incluído. */
export function PurchaseOrderForm({
  id,
  suppliers,
  materials,
  initial,
}: {
  id?: string;
  suppliers: { id: string; name: string }[];
  materials: MaterialOption[];
  initial?: {
    supplierId: string;
    lines: { materialId: string; qty: number; unitCost: number }[];
    expectedAt: string;
    notes: string;
  };
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines.length
      ? initial.lines.map((l) => ({
          materialId: l.materialId,
          qty: String(l.qty).replace(".", ","),
          cost: fromCents(l.unitCost),
        }))
      : [{ materialId: "", qty: "", cost: "" }],
  );
  const [expectedAt, setExpectedAt] = useState(initial?.expectedAt ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, start] = useTransition();
  // Os materiais deste fornecedor aparecem primeiro
  const sorted = [...materials].sort(
    (a, b) => Number(b.supplierIds.includes(supplierId)) - Number(a.supplierIds.includes(supplierId)),
  );
  const parsed = lines.map((l) => ({ materialId: l.materialId, qty: parseDecimal(l.qty), unitCost: toCents(l.cost) }));
  const valid = parsed.filter((l) => l.materialId && l.qty > 0 && l.unitCost >= 0);
  const totals = purchaseTotals(valid);
  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((all) => all.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const input = { supplierId, lines: parsed, expectedAt, notes };
          const result = id ? await updatePurchaseOrder(id, input) : await createPurchaseOrder(input);
          if (!result.ok) return void toast.error(result.message);
          toast.success(id ? "Encomenda atualizada." : "Encomenda criada em rascunho.");
          router.push(`/admin/compras/encomendas/${result.id}`);
          router.refresh();
        });
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fornecedor">
          <Select
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            value={supplierId}
            onValueChange={setSupplierId}
          />
        </Field>
        <Field label="Entrega prevista (opcional)">
          <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Linhas</legend>
        {lines.map((line, i) => {
          const material = materials.find((m) => m.id === line.materialId);
          return (
            <div
              key={i}
              className="grid items-end gap-3 rounded-sm border border-line bg-card p-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]"
            >
              <Field label="Material">
                <Select
                  options={sorted.map((m) => ({ value: m.id, label: m.name }))}
                  value={line.materialId}
                  onValueChange={(v) => {
                    const m = materials.find((x) => x.id === v);
                    setLine(i, { materialId: v, cost: line.cost || (m?.avgCost ? fromCents(m.avgCost) : "") });
                  }}
                />
              </Field>
              <Field label={material ? `Qtd. (${UNIT_LABELS[material.unit]})` : "Quantidade"}>
                <Input inputMode="decimal" value={line.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
              </Field>
              <Field label="Custo unit. (Kz)">
                <Input inputMode="decimal" value={line.cost} onChange={(e) => setLine(i, { cost: e.target.value })} />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Tirar linha"
                disabled={lines.length === 1}
                onClick={() => setLines((all) => all.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines((all) => [...all, { materialId: "", qty: "", cost: "" }])}
        >
          <Plus aria-hidden /> Juntar linha
        </Button>
      </fieldset>

      <Field label="Notas para o fornecedor (opcional)">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <p className="text-sm text-ink-2">
          Total <span className="ml-1 text-lg font-semibold text-ink">{formatKz(totals.total)}</span>
          <span className="ml-2 text-xs text-ink-3">IVA incluído {formatKz(totals.tax)}</span>
        </p>
        <Button type="submit" loading={pending} disabled={!supplierId || valid.length === 0}>
          {id ? "Guardar rascunho" : "Criar em rascunho"}
        </Button>
      </div>
    </form>
  );
}

export function ApprovePurchaseButton({ id }: { id: string }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" loading={pending} onClick={() => run(() => approvePurchaseOrder(id), "Encomenda aprovada.")}>
      Aprovar e marcar como enviada
    </Button>
  );
}

/** Receção do que chegou: por omissão, o que falta de cada linha. */
export function ReceiveForm({
  id,
  lines,
}: {
  id: string;
  lines: { materialId: string; description: string; qty: number; receivedQty: number; unit?: StockUnit }[];
}) {
  const open = lines.filter((l) => l.receivedQty < l.qty);
  const [got, setGot] = useState<Record<string, string>>(
    Object.fromEntries(open.map((l) => [l.materialId, String(roundQty(l.qty - l.receivedQty)).replace(".", ",")])),
  );
  const { pending, run } = useRun();
  return (
    <div className="space-y-3">
      {open.map((l) => (
        <Field
          key={l.materialId}
          label={l.description}
          hint={`Faltam ${l.unit ? formatQty(roundQty(l.qty - l.receivedQty), l.unit) : roundQty(l.qty - l.receivedQty)}`}
        >
          <Input
            inputMode="decimal"
            value={got[l.materialId] ?? ""}
            onChange={(e) => setGot((g) => ({ ...g, [l.materialId]: e.target.value }))}
          />
        </Field>
      ))}
      <Button
        size="sm"
        className="w-full"
        loading={pending}
        onClick={() =>
          run(
            () =>
              receivePurchaseOrder(
                id,
                open.map((l) => ({ materialId: l.materialId, qty: parseDecimal(got[l.materialId] || "0") || 0 })),
              ),
            "Receção registada: o stock foi atualizado.",
          )
        }
      >
        Registar receção
      </Button>
    </div>
  );
}

export function PaySupplierForm({ id, due }: { id: string; due: number }) {
  const [amount, setAmount] = useState(fromCents(due));
  const [reference, setReference] = useState("");
  const { pending, run } = useRun();
  return (
    <div className="space-y-3">
      <Field label="Valor (Kz)" hint={`Em falta: ${formatKz(due)}`}>
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Referência (opcional)">
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Nº da transferência ou recibo"
        />
      </Field>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        loading={pending}
        onClick={() => run(() => payPurchaseOrder(id, toCents(amount), reference), "Pagamento registado.")}
      >
        Registar pagamento
      </Button>
    </div>
  );
}

export function CancelPurchaseButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useRun();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="ghost">
          Cancelar encomenda
        </Button>
      }
      title="Cancelar a encomenda?"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button
            variant="danger"
            loading={pending}
            disabled={reason.trim().length < 3}
            onClick={() =>
              run(
                () => cancelPurchaseOrder(id, reason),
                "Encomenda cancelada.",
                () => setOpen(false),
              )
            }
          >
            Cancelar encomenda
          </Button>
        </>
      }
    >
      <Textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (ex.: fornecedor sem stock)"
        aria-label="Motivo do cancelamento"
      />
    </Modal>
  );
}
