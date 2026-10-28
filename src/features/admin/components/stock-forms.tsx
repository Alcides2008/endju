"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { fromCents, parseDecimal, toCents } from "@/lib/domain/money";
import {
  CATEGORY_LABELS,
  formatQty,
  MATERIAL_CATEGORIES,
  roundQty,
  UNIT_LABELS,
  UNITS,
  type MaterialCategory,
  type StockUnit,
} from "@/lib/domain/stock";
import { closeInventory, createMaterial, recordMovement, updateMaterial, type MaterialInput } from "../stock-actions";
import { useRun } from "./order-admin-panel";

type SupplierOption = { id: string; name: string };

type Draft = {
  sku: string;
  name: string;
  category: MaterialCategory;
  unit: StockUnit;
  minQty: string;
  location: string;
  supplierIds: string[];
  active: boolean;
};

const toInput = (d: Draft): MaterialInput => ({ ...d, minQty: parseDecimal(d.minQty || "0") });

function MaterialFields({
  values,
  set,
  suppliers,
}: {
  values: Draft;
  set: (patch: Partial<Draft>) => void;
  suppliers: SupplierOption[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome" className="sm:col-span-2">
        <Input
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Ex.: Lona frontlit 440 g · rolo 3,20 m"
        />
      </Field>
      <Field label="Código (SKU)">
        <Input value={values.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="Ex.: LON-440-320" />
      </Field>
      <Field label="Categoria">
        <Select
          options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
          value={values.category}
          onValueChange={(v) => set({ category: v as MaterialCategory })}
        />
      </Field>
      <Field label="Unidade">
        <Select
          options={UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
          value={values.unit}
          onValueChange={(v) => set({ unit: v as StockUnit })}
        />
      </Field>
      <Field label="Mínimo (avisa abaixo disto)">
        <Input inputMode="decimal" value={values.minQty} onChange={(e) => set({ minQty: e.target.value })} />
      </Field>
      <Field label="Localização (opcional)" className="sm:col-span-2">
        <Input
          value={values.location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="Ex.: Armazém · prateleira B2"
        />
      </Field>
      {suppliers.length > 0 && (
        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">Fornecedores</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {suppliers.map((s) => (
              <Checkbox
                key={s.id}
                checked={values.supplierIds.includes(s.id)}
                onChange={(e) =>
                  set({
                    supplierIds: e.target.checked
                      ? [...values.supplierIds, s.id]
                      : values.supplierIds.filter((id) => id !== s.id),
                  })
                }
              >
                {s.name}
              </Checkbox>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

const EMPTY: Draft = {
  sku: "",
  name: "",
  category: "papel",
  unit: "folha",
  minQty: "",
  location: "",
  supplierIds: [],
  active: true,
};

export function NewMaterialButton({ suppliers }: { suppliers: SupplierOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [initialQty, setInitialQty] = useState("");
  const [initialCost, setInitialCost] = useState("");
  const [pending, start] = useTransition();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo material</Button>}
      title="Novo material"
      description="O stock inicial entra como primeira entrada, para o custo médio começar certo."
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await createMaterial(toInput(values), {
                  qty: initialQty ? parseDecimal(initialQty) : 0,
                  unitCost: initialCost ? toCents(initialCost) : 0,
                });
                if (!result.ok) return void toast.error(result.message);
                setOpen(false);
                setValues(EMPTY);
                router.push(`/admin/stock/${result.id}`);
              })
            }
          >
            Criar material
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <MaterialFields values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} suppliers={suppliers} />
        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field label={`Stock inicial (${UNIT_LABELS[values.unit]})`}>
            <Input
              inputMode="decimal"
              value={initialQty}
              onChange={(e) => setInitialQty(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Custo por unidade, com IVA (Kz)">
            <Input inputMode="decimal" value={initialCost} onChange={(e) => setInitialCost(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export function EditMaterialForm({
  id,
  defaults,
  suppliers,
}: {
  id: string;
  defaults: Omit<Draft, "minQty"> & { minQty: number };
  suppliers: SupplierOption[];
}) {
  const [values, setValues] = useState<Draft>({ ...defaults, minQty: String(defaults.minQty).replace(".", ",") });
  const { pending, run } = useRun();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateMaterial(id, toInput(values)), "Material atualizado.");
      }}
      className="space-y-4"
    >
      <MaterialFields values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} suppliers={suppliers} />
      <Checkbox checked={!values.active} onChange={(e) => setValues((v) => ({ ...v, active: !e.target.checked }))}>
        Material descontinuado (sai das listas de consumo e compra)
      </Checkbox>
      <Button type="submit" loading={pending}>
        Guardar material
      </Button>
    </form>
  );
}

type MovementKind = "saida" | "entrada" | "ajuste";
const KIND_LABELS: Record<MovementKind, string> = {
  saida: "Saída (consumo, perda)",
  entrada: "Entrada sem encomenda",
  ajuste: "Ajuste do saldo",
};

/** Saída, entrada avulsa ou ajuste, conforme o que o papel pode fazer. */
export function MovementForm({
  materialId,
  unit,
  qty: current,
  avgCost,
  kinds,
}: {
  materialId: string;
  unit: StockUnit;
  qty: number;
  avgCost: number;
  kinds: MovementKind[];
}) {
  const [type, setType] = useState<MovementKind>(kinds[0]);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(avgCost ? fromCents(avgCost) : "");
  const [reason, setReason] = useState("");
  const { pending, run } = useRun();
  if (kinds.length === 0) return null;
  const amount = parseDecimal(qty);
  return (
    <div className="space-y-4">
      {kinds.length > 1 && (
        <Field label="Tipo">
          <Select
            options={kinds.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
            value={type}
            onValueChange={(v) => setType(v as MovementKind)}
          />
        </Field>
      )}
      <Field
        label={type === "ajuste" ? `Saldo certo agora (${UNIT_LABELS[unit]})` : `Quantidade (${UNIT_LABELS[unit]})`}
        hint={
          type === "ajuste" && qty && !Number.isNaN(amount)
            ? `Diferença: ${roundQty(amount - current) > 0 ? "+" : ""}${formatQty(roundQty(amount - current), unit)}`
            : `Saldo atual: ${formatQty(current, unit)}`
        }
      >
        <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      {type === "entrada" && (
        <Field label="Custo por unidade, com IVA (Kz)">
          <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
      )}
      <Field label={type === "ajuste" ? "Motivo" : "Motivo (opcional)"}>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            type === "saida"
              ? "Ex.: rolo danificado"
              : type === "ajuste"
                ? "Ex.: erro na contagem"
                : "Ex.: compra ao balcão"
          }
        />
      </Field>
      <Button
        loading={pending}
        disabled={!qty || Number.isNaN(amount)}
        onClick={() =>
          run(
            () =>
              recordMovement({
                materialId,
                type,
                qty: amount,
                unitCost: type === "entrada" && cost ? toCents(cost) : undefined,
                reason,
              }),
            "Movimento registado.",
            () => {
              setQty("");
              setReason("");
            },
          )
        }
      >
        Registar {type === "ajuste" ? "ajuste" : type === "entrada" ? "entrada" : "saída"}
      </Button>
    </div>
  );
}

type CountRow = { id: string; sku: string; name: string; unit: StockUnit; qty: number; location?: string };

/** Contagem física: escreve o que há na prateleira; só as linhas preenchidas entram no fecho. */
export function InventoryForm({ materials }: { materials: CountRow[] }) {
  const router = useRouter();
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const lines = materials
    .filter((m) => counted[m.id]?.trim())
    .map((m) => ({ materialId: m.id, counted: parseDecimal(counted[m.id]), expected: m.qty }));
  const invalid = lines.some((l) => Number.isNaN(l.counted) || l.counted < 0);
  const diffs = lines.filter((l) => roundQty(l.counted - l.expected) !== 0).length;
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-sm border border-line bg-card">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs text-ink-3">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-2 font-medium">
                Material
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                No sistema
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Contado
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Diferença
              </th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const value = counted[m.id] ?? "";
              const n = parseDecimal(value);
              const diff = value.trim() && !Number.isNaN(n) ? roundQty(n - m.qty) : null;
              return (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">
                    <span className="block font-medium">{m.name}</span>
                    <span className="text-xs text-ink-3">
                      {m.sku}
                      {m.location && ` · ${m.location}`}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs whitespace-nowrap">
                    {formatQty(m.qty, m.unit)}
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setCounted((c) => ({ ...c, [m.id]: e.target.value }))}
                      aria-label={`Quantidade contada de ${m.name}`}
                      className="h-10 w-32"
                    />
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono text-xs whitespace-nowrap ${diff ? (diff < 0 ? "text-danger" : "text-success") : "text-ink-3"}`}
                  >
                    {diff === null ? "—" : `${diff > 0 ? "+" : ""}${formatQty(diff, m.unit)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        trigger={
          <Button disabled={lines.length === 0 || invalid}>
            Fechar inventário ({lines.length} contado{lines.length === 1 ? "" : "s"})
          </Button>
        }
        title="Fechar o inventário?"
        description={`${lines.length} material(is) contado(s), ${diffs} com diferença. Cada diferença vira um movimento de inventário e o saldo passa a ser o contado. Não se desfaz.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Voltar
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const result = await closeInventory(
                    lines.map(({ materialId, counted: c }) => ({ materialId, counted: c })),
                  );
                  if (!result.ok) return void toast.error(result.message);
                  toast.success(`Inventário fechado: ${result.changed ?? 0} saldo(s) corrigido(s).`);
                  setConfirm(false);
                  setCounted({});
                  router.push("/admin/stock/movimentos");
                })
              }
            >
              Fechar e corrigir saldos
            </Button>
          </>
        }
      />
    </div>
  );
}
