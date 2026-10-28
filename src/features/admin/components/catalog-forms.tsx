"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { defaultConfig, type ConsumptionRule, type ProductDoc, type ServiceDoc } from "@/lib/domain/catalog";
import { formatKz, fromCents, parseDecimal, toCents } from "@/lib/domain/money";
import { priceItem, PricingError, type PriceModifier } from "@/lib/domain/pricing";
import { SECTOR_LABELS, WORKSHOP_SECTORS } from "@/lib/domain/production";
import { slugify } from "@/lib/domain/search";
import { UNIT_LABELS, type StockUnit } from "@/lib/domain/stock";
import { ASSET_KEYS } from "@/lib/media";
import { cn } from "@/lib/utils";
import { importCatalog, updateProduct, updateService, type ProductInput, type ServiceInput } from "../catalog-actions";
import { MediaField } from "./media-field";
import { useRun } from "./order-admin-panel";

const int = (text: string) => Math.round(parseDecimal(text || "0")) || 0;
const kz = (text: string) => (text.trim() ? toCents(text) || 0 : 0);
const kzText = (cents?: number) => (cents ? fromCents(cents) : "");

export function ImportCatalogButton({ label = "Importar o catálogo do site" }: { label?: string }) {
  const { pending, run } = useRun();
  return (
    <Button loading={pending} onClick={() => run(importCatalog, "Catálogo importado para o Firestore.")}>
      {label}
    </Button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-sm border border-line bg-card p-5">
      <div className="space-y-1">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const iconButton = "grid size-10 shrink-0 place-items-center rounded-sm text-ink-3 hover:bg-paper-2 hover:text-danger";

/** Linhas editáveis (escalões, especificações, prazos): cada coluna um campo de texto. */
function Rows<T extends Record<string, string>>({
  rows,
  columns,
  onChange,
  empty,
  addLabel,
  disabled,
}: {
  rows: T[];
  columns: { key: keyof T & string; label: string; inputMode?: "decimal" | "numeric"; className?: string }[];
  onChange: (rows: T[]) => void;
  empty: T;
  addLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-end gap-2">
          {columns.map((col) => (
            <Field
              key={col.key}
              label={i === 0 ? col.label : <span className="sr-only">{col.label}</span>}
              className={cn("flex-1", col.className)}
            >
              <Input
                value={row[col.key]}
                inputMode={col.inputMode}
                disabled={disabled}
                onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, [col.key]: e.target.value } : r)))}
              />
            </Field>
          ))}
          {!disabled && (
            <button
              type="button"
              className={iconButton}
              aria-label="Tirar linha"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, empty])}>
          <Plus aria-hidden /> {addLabel}
        </Button>
      )}
    </div>
  );
}

type Mod = { type: PriceModifier["type"]; value: string };
type ChoiceDraft = { key: string; label: string; default: boolean; mods: Mod[] };
type RuleDraft = { materialId: string; per: ConsumptionRule["per"]; qty: string; wastePct: string; when: string };

const MOD_TYPES: { value: PriceModifier["type"]; label: string }[] = [
  { value: "add_unit", label: "+ Kz por unidade" },
  { value: "add_m2", label: "+ Kz por m²" },
  { value: "add_fixed", label: "+ Kz fixo" },
  { value: "percent", label: "+ % do preço" },
];

const PER_LABELS: Record<ConsumptionRule["per"], string> = {
  unit: "por unidade",
  m2: "por m²",
  sheet: "folhas por unidade",
};

export type MaterialOption = { id: string; name: string; unit: StockUnit };

function productDraft(p: ProductDoc) {
  const mods = (group: string, choice: string): Mod[] =>
    p.pricing.modifiers
      .filter((m) => m.group === group && m.choice === choice)
      .map((m) => ({ type: m.type, value: m.type === "percent" ? String(m.value) : fromCents(m.value) }));
  return {
    name: p.name,
    summary: p.summary,
    unit: p.unit,
    active: p.active,
    sortOrder: String(p.sortOrder),
    image: p.image,
    minQty: String(p.minQty),
    presets: p.quantityPresets.join(", "),
    normalDays: String(p.leadTime.normalDays),
    urgentDays: String(p.leadTime.urgentDays),
    allowDesignService: p.allowDesignService,
    tiers: (p.pricing.tiers ?? []).map((t) => ({ minQty: String(t.minQty), price: fromCents(t.unitPrice) })),
    pricePerM2: kzText(p.pricing.pricePerM2),
    minAreaM2: p.pricing.minAreaM2 ? String(p.pricing.minAreaM2).replace(".", ",") : "",
    fixedPrice: kzText(p.pricing.fixedPrice),
    setupFee: kzText(p.pricing.setupFee),
    designFee: kzText(p.pricing.designFee),
    urgentPct: String(p.pricing.urgentSurchargePct),
    groups: p.optionGroups
      .filter((g) => g.type === "select")
      .map((g) => ({
        key: g.key,
        label: g.label,
        choices: (g.choices ?? []).map((c) => ({
          key: c.key,
          label: c.label,
          default: Boolean(c.default),
          mods: mods(g.key, c.key),
        })),
      })),
    route: p.route as string[],
    consumption: p.consumption.map((r) => ({
      materialId: r.materialId,
      per: r.per,
      qty: String(r.qty).replace(".", ","),
      wastePct: String(r.wastePct),
      when: r.when ? `${r.when.group}:${r.when.choice}` : "",
    })) as RuleDraft[],
  };
}

type ProductDraft = ReturnType<typeof productDraft>;

function toProductInput(d: ProductDraft): ProductInput {
  return {
    name: d.name,
    summary: d.summary,
    unit: d.unit,
    active: d.active,
    sortOrder: int(d.sortOrder),
    image: d.image,
    minQty: int(d.minQty),
    quantityPresets: d.presets
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map(int)
      .filter((n) => n > 0),
    leadTime: { normalDays: int(d.normalDays), urgentDays: int(d.urgentDays) },
    allowDesignService: d.allowDesignService,
    pricing: {
      tiers: d.tiers.filter((t) => t.minQty.trim()).map((t) => ({ minQty: int(t.minQty), unitPrice: kz(t.price) })),
      pricePerM2: kz(d.pricePerM2),
      minAreaM2: parseDecimal(d.minAreaM2 || "0") || 0,
      fixedPrice: kz(d.fixedPrice),
      setupFee: kz(d.setupFee),
      designFee: kz(d.designFee),
      urgentSurchargePct: int(d.urgentPct),
      modifiers: d.groups.flatMap((g) =>
        g.choices.flatMap((c) =>
          c.mods.map((m) => ({
            group: g.key,
            choice: c.key || slugify(c.label),
            type: m.type,
            value: m.type === "percent" ? int(m.value) : kz(m.value),
          })),
        ),
      ),
    },
    choices: Object.fromEntries(
      d.groups.map((g) => [
        g.key,
        g.choices.map((c) => ({ key: c.key || slugify(c.label), label: c.label, default: c.default })),
      ]),
    ),
    route: d.route,
    consumption: d.consumption.map((r) => {
      const [group, choice] = r.when.split(":");
      return {
        materialId: r.materialId,
        per: r.per,
        qty: parseDecimal(r.qty || "0") || 0,
        wastePct: int(r.wastePct),
        ...(r.when ? { when: { group, choice } } : {}),
      };
    }),
  };
}

/** "A partir de", calculado como o configurador: mostra logo se os preços fazem sentido. */
function priceFrom(product: ProductDoc, draft: ProductDraft) {
  const input = toProductInput(draft);
  const optionGroups = product.optionGroups.map((g) => {
    const edited = draft.groups.find((d) => d.key === g.key);
    return edited
      ? {
          ...g,
          choices: edited.choices.map((c) => ({ key: c.key || slugify(c.label), label: c.label, default: c.default })),
        }
      : g;
  });
  const priced = {
    ...product,
    name: input.name,
    minQty: input.minQty,
    optionGroups,
    pricing: { ...product.pricing, ...input.pricing },
  };
  try {
    const { lineTotal } = priceItem(priced, defaultConfig({ ...priced, image: null }));
    return { ok: true as const, total: lineTotal };
  } catch (error) {
    return { ok: false as const, message: error instanceof PricingError ? error.message : "Preço inválido." };
  }
}

export function ProductForm({
  product,
  materials,
  canEdit,
}: {
  product: ProductDoc;
  materials: MaterialOption[];
  canEdit: boolean;
}) {
  const [d, setD] = useState(() => productDraft(product));
  const set = (patch: Partial<ProductDraft>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  const from = priceFrom(product, d);
  const model = product.pricing.model;
  const setChoice = (gi: number, ci: number, patch: Partial<ChoiceDraft>) =>
    set({
      groups: d.groups.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              choices: g.choices.map((c, j) =>
                j === ci ? { ...c, ...patch } : patch.default ? { ...c, default: false } : c,
              ),
            },
      ),
    });
  const whenOptions = [
    { value: "sempre", label: "Sempre" },
    ...d.groups.flatMap((g) => g.choices.map((c) => ({ value: `${g.key}:${c.key}`, label: `Só com ${c.label}` }))),
  ];

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateProduct(product.slug, toProductInput(d)), "Produto guardado. O site já mostra a mudança.");
      }}
    >
      <fieldset disabled={!canEdit} className="space-y-6">
        <Section title="Geral">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input value={d.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Unidade" hint="Como se conta: cartões, flyers, m², bonés…">
              <Input value={d.unit} onChange={(e) => set({ unit: e.target.value })} />
            </Field>
            <Field label="Resumo na lista de produtos" className="sm:col-span-2">
              <Textarea value={d.summary} onChange={(e) => set({ summary: e.target.value })} className="min-h-20" />
            </Field>
            <Field label="Ordem na lista" hint="Os números mais baixos aparecem primeiro.">
              <Input inputMode="numeric" value={d.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
            </Field>
            <div className="flex items-end pb-3">
              <Checkbox checked={d.active} onChange={(e) => set({ active: e.target.checked })}>
                À venda no site (desligado, sai da lista e do configurador)
              </Checkbox>
            </div>
          </div>
          <MediaField value={d.image} onChange={(image) => set({ image })} label="Fotografia da lista" />
        </Section>

        <Section title="Quantidades e prazos" hint="Prazos em dias úteis, contados a partir da entrada em produção.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade mínima">
              <Input inputMode="numeric" value={d.minQty} onChange={(e) => set({ minQty: e.target.value })} />
            </Field>
            <Field label="Quantidades sugeridas" hint="Separadas por vírgulas.">
              <Input value={d.presets} onChange={(e) => set({ presets: e.target.value })} />
            </Field>
            <Field label="Prazo normal (dias)">
              <Input inputMode="numeric" value={d.normalDays} onChange={(e) => set({ normalDays: e.target.value })} />
            </Field>
            <Field label="Prazo urgente (dias)">
              <Input inputMode="numeric" value={d.urgentDays} onChange={(e) => set({ urgentDays: e.target.value })} />
            </Field>
          </div>
          <Checkbox checked={d.allowDesignService} onChange={(e) => set({ allowDesignService: e.target.checked })}>
            O cliente pode pedir que a Endju crie o design
          </Checkbox>
        </Section>

        <Section title="Preço" hint="Valores em Kz, com IVA incluído.">
          {model === "tiered_unit" && (
            <Rows
              rows={d.tiers}
              onChange={(tiers) => set({ tiers })}
              empty={{ minQty: "", price: "" }}
              addLabel="Juntar escalão"
              columns={[
                { key: "minQty", label: "A partir de (unidades)", inputMode: "numeric" },
                { key: "price", label: "Preço por unidade (Kz)", inputMode: "decimal" },
              ]}
            />
          )}
          {model === "area_m2" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preço por m² (Kz)">
                <Input inputMode="decimal" value={d.pricePerM2} onChange={(e) => set({ pricePerM2: e.target.value })} />
              </Field>
              <Field label="Área mínima cobrada (m²)">
                <Input inputMode="decimal" value={d.minAreaM2} onChange={(e) => set({ minAreaM2: e.target.value })} />
              </Field>
            </div>
          )}
          {model === "fixed" && (
            <Field label="Preço por unidade (Kz)">
              <Input inputMode="decimal" value={d.fixedPrice} onChange={(e) => set({ fixedPrice: e.target.value })} />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Preparação e arranque (Kz)">
              <Input inputMode="decimal" value={d.setupFee} onChange={(e) => set({ setupFee: e.target.value })} />
            </Field>
            <Field label="Criação do design (Kz)">
              <Input inputMode="decimal" value={d.designFee} onChange={(e) => set({ designFee: e.target.value })} />
            </Field>
            <Field label="Urgência (+ %)">
              <Input inputMode="numeric" value={d.urgentPct} onChange={(e) => set({ urgentPct: e.target.value })} />
            </Field>
          </div>
          <p className={cn("text-sm", from.ok ? "text-ink-2" : "text-danger")}>
            {from.ok
              ? `A partir de ${formatKz(from.total)} na configuração inicial (${int(d.minQty)} ${d.unit}).`
              : from.message}
          </p>
        </Section>

        {d.groups.map((group, gi) => (
          <Section
            key={group.key}
            title={`Opção: ${group.label}`}
            hint="A escolha marcada é a que o configurador mostra primeiro. Cada escolha pode somar ao preço."
          >
            <ul className="space-y-4">
              {group.choices.map((choice, ci) => (
                <li key={ci} className="space-y-2 border-b border-line pb-4 last:border-0 last:pb-0">
                  <div className="flex items-end gap-3">
                    <Field label="Escolha" className="flex-1">
                      <Input value={choice.label} onChange={(e) => setChoice(gi, ci, { label: e.target.value })} />
                    </Field>
                    <label className="flex h-12 items-center gap-2 text-sm text-ink-2">
                      <input
                        type="radio"
                        name={`default-${group.key}`}
                        checked={choice.default}
                        onChange={() => setChoice(gi, ci, { default: true })}
                        className="accent-brand"
                      />
                      Inicial
                    </label>
                    {group.choices.length > 1 && canEdit && (
                      <button
                        type="button"
                        className={iconButton}
                        aria-label={`Tirar ${choice.label}`}
                        onClick={() =>
                          set({
                            groups: d.groups.map((g, i) =>
                              i === gi ? { ...g, choices: g.choices.filter((_, j) => j !== ci) } : g,
                            ),
                          })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                  {choice.mods.map((mod, mi) => (
                    <div key={mi} className="flex items-center gap-2 pl-4">
                      <Select
                        className="max-w-52"
                        options={MOD_TYPES}
                        value={mod.type}
                        onValueChange={(type) =>
                          setChoice(gi, ci, {
                            mods: choice.mods.map((m, k) => (k === mi ? { ...m, type: type as Mod["type"] } : m)),
                          })
                        }
                      />
                      <Input
                        className="max-w-40"
                        inputMode="decimal"
                        aria-label="Valor"
                        value={mod.value}
                        onChange={(e) =>
                          setChoice(gi, ci, {
                            mods: choice.mods.map((m, k) => (k === mi ? { ...m, value: e.target.value } : m)),
                          })
                        }
                      />
                      <button
                        type="button"
                        className={iconButton}
                        aria-label="Tirar acréscimo"
                        onClick={() => setChoice(gi, ci, { mods: choice.mods.filter((_, k) => k !== mi) })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                  {canEdit && (
                    <button
                      type="button"
                      className="pl-4 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                      onClick={() => setChoice(gi, ci, { mods: [...choice.mods, { type: "add_unit", value: "" }] })}
                    >
                      + Acréscimo de preço
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  set({
                    groups: d.groups.map((g, i) =>
                      i === gi
                        ? { ...g, choices: [...g.choices, { key: "", label: "", default: false, mods: [] }] }
                        : g,
                    ),
                  })
                }
              >
                <Plus aria-hidden /> Juntar escolha
              </Button>
            )}
          </Section>
        ))}

        <Section
          title="Oficina"
          hint="Por onde passa na produção, por ordem, e o material que sai do stock quando o pedido entra em produção."
        >
          <div className="flex flex-wrap gap-6">
            {WORKSHOP_SECTORS.map((sector) => (
              <Checkbox
                key={sector}
                checked={d.route.includes(sector)}
                onChange={(e) =>
                  set({ route: e.target.checked ? [...d.route, sector] : d.route.filter((s) => s !== sector) })
                }
              >
                {SECTOR_LABELS[sector]}
              </Checkbox>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Consumo de material</p>
            {d.consumption.length === 0 && (
              <p className="text-sm text-ink-3">
                Sem regras: o material regista-se à mão em cada tarefa. Com regras, sai sozinho do stock.
              </p>
            )}
            {d.consumption.map((rule, i) => {
              const unit = materials.find((m) => m.id === rule.materialId)?.unit;
              const patch = (p: Partial<RuleDraft>) =>
                set({ consumption: d.consumption.map((r, j) => (j === i ? { ...r, ...p } : r)) });
              return (
                <div
                  key={i}
                  className="grid gap-2 rounded-sm border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto]"
                >
                  <Select
                    aria-label="Material"
                    options={materials.map((m) => ({ value: m.id, label: m.name }))}
                    value={rule.materialId || undefined}
                    onValueChange={(materialId) => patch({ materialId })}
                  />
                  <Input
                    inputMode="decimal"
                    aria-label="Quantidade"
                    placeholder={unit ? UNIT_LABELS[unit] : "Qtd."}
                    value={rule.qty}
                    onChange={(e) => patch({ qty: e.target.value })}
                  />
                  <Select
                    aria-label="Por"
                    options={Object.entries(PER_LABELS).map(([value, label]) => ({ value, label }))}
                    value={rule.per}
                    onValueChange={(per) => patch({ per: per as RuleDraft["per"] })}
                  />
                  <Input
                    inputMode="numeric"
                    aria-label="Desperdício (%)"
                    placeholder="Desp. %"
                    value={rule.wastePct}
                    onChange={(e) => patch({ wastePct: e.target.value })}
                  />
                  <Select
                    aria-label="Quando"
                    options={whenOptions}
                    value={rule.when || "sempre"}
                    onValueChange={(when) => patch({ when: when === "sempre" ? "" : when })}
                  />
                  <button
                    type="button"
                    className={iconButton}
                    aria-label="Tirar regra"
                    onClick={() => set({ consumption: d.consumption.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              );
            })}
            {canEdit &&
              (materials.length ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    set({
                      consumption: [
                        ...d.consumption,
                        { materialId: "", per: "unit", qty: "", wastePct: "5", when: "" },
                      ],
                    })
                  }
                >
                  <Plus aria-hidden /> Juntar regra de consumo
                </Button>
              ) : (
                <p className="text-sm text-ink-3">Cria primeiro os materiais no Stock para ligar o consumo.</p>
              ))}
            <p className="text-xs text-ink-3">
              Ex.: cartões em SRA3 com 21 por folha → 0,05 folhas por unidade e 5 % de desperdício. Se faltar material,
              a produção avança e o Gestor recebe aviso.
            </p>
          </div>
        </Section>
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" loading={pending} className="shadow-lift">
            Guardar produto
          </Button>
        </div>
      )}
    </form>
  );
}

function serviceDraft(s: ServiceDoc) {
  return {
    name: s.name,
    summary: s.summary,
    active: s.active,
    sortOrder: String(s.sortOrder),
    priceFrom: fromCents(s.priceFrom),
    unit: s.unit,
    leadTime: s.leadTime,
    tags: s.tags.join(", "),
    intro: s.intro,
    body: s.body.join("\n\n"),
    products: s.products.join("\n"),
    specsTitle: s.specs.title,
    specs: s.specs.items.map((i) => ({ name: i.name, detail: i.detail })),
    deadlines: s.deadlines.map((d) => ({ item: d.item, normal: d.normal, urgent: d.urgent ?? "" })),
    gallery: s.gallery,
  };
}

type ServiceDraft = ReturnType<typeof serviceDraft>;

const lines = (text: string, separator: RegExp) =>
  text
    .split(separator)
    .map((t) => t.trim())
    .filter(Boolean);

function toServiceInput(d: ServiceDraft): ServiceInput {
  return {
    name: d.name,
    summary: d.summary,
    active: d.active,
    sortOrder: int(d.sortOrder),
    priceFrom: kz(d.priceFrom),
    unit: d.unit,
    leadTime: d.leadTime,
    tags: lines(d.tags, /,/),
    intro: d.intro,
    body: lines(d.body, /\n\s*\n/),
    products: lines(d.products, /\n/),
    specs: { title: d.specsTitle, items: d.specs.filter((i) => i.name.trim()) },
    deadlines: d.deadlines.filter((r) => r.item.trim()).map((r) => ({ ...r, urgent: r.urgent.trim() || null })),
    gallery: d.gallery,
  };
}

export function ServiceForm({ service, canEdit }: { service: ServiceDoc; canEdit: boolean }) {
  const [d, setD] = useState(() => serviceDraft(service));
  const set = (patch: Partial<ServiceDraft>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateService(service.slug, toServiceInput(d)), "Serviço guardado. O site já mostra a mudança.");
      }}
    >
      <fieldset disabled={!canEdit} className="space-y-6">
        <Section title="Geral">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input value={d.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Etiquetas" hint="Separadas por vírgulas (aparecem na lista de serviços).">
              <Input value={d.tags} onChange={(e) => set({ tags: e.target.value })} />
            </Field>
            <Field label="Resumo" className="sm:col-span-2">
              <Textarea value={d.summary} onChange={(e) => set({ summary: e.target.value })} className="min-h-20" />
            </Field>
            <Field label="Preço a partir de (Kz)">
              <Input inputMode="decimal" value={d.priceFrom} onChange={(e) => set({ priceFrom: e.target.value })} />
            </Field>
            <Field label="Unidade do preço" hint="Ex.: por A4 a cores">
              <Input value={d.unit} onChange={(e) => set({ unit: e.target.value })} />
            </Field>
            <Field label="Prazo" hint="Ex.: 24–48 h">
              <Input value={d.leadTime} onChange={(e) => set({ leadTime: e.target.value })} />
            </Field>
            <Field label="Ordem na lista">
              <Input inputMode="numeric" value={d.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
            </Field>
          </div>
          <Checkbox checked={d.active} onChange={(e) => set({ active: e.target.checked })}>
            Visível no site
          </Checkbox>
        </Section>

        <Section title="Texto da página">
          <Field label="Introdução">
            <Textarea value={d.intro} onChange={(e) => set({ intro: e.target.value })} className="min-h-20" />
          </Field>
          <Field label="Texto" hint="Uma linha em branco separa os parágrafos.">
            <Textarea value={d.body} onChange={(e) => set({ body: e.target.value })} className="min-h-48" />
          </Field>
          <Field label="O que fazemos" hint="Um por linha.">
            <Textarea value={d.products} onChange={(e) => set({ products: e.target.value })} />
          </Field>
        </Section>

        <Section title="Especificações">
          <Field label="Título">
            <Input value={d.specsTitle} onChange={(e) => set({ specsTitle: e.target.value })} />
          </Field>
          <Rows
            rows={d.specs}
            onChange={(specs) => set({ specs })}
            empty={{ name: "", detail: "" }}
            addLabel="Juntar especificação"
            disabled={!canEdit}
            columns={[
              { key: "name", label: "Nome" },
              { key: "detail", label: "Detalhe", className: "flex-[2]" },
            ]}
          />
        </Section>

        <Section title="Prazos">
          <Rows
            rows={d.deadlines}
            onChange={(deadlines) => set({ deadlines })}
            empty={{ item: "", normal: "", urgent: "" }}
            addLabel="Juntar prazo"
            disabled={!canEdit}
            columns={[
              { key: "item", label: "Trabalho", className: "flex-[2]" },
              { key: "normal", label: "Normal" },
              { key: "urgent", label: "Urgente (opcional)" },
            ]}
          />
        </Section>

        <Section title="Galeria">
          <ul className="space-y-5">
            {d.gallery.map((image, i) => (
              <li key={i} className="space-y-2 border-b border-line pb-5 last:border-0">
                <MediaField
                  label={`Imagem ${i + 1}`}
                  value={image}
                  allowEmpty={false}
                  onChange={(m) => m && set({ gallery: d.gallery.map((g, j) => (j === i ? { ...g, ...m } : g)) })}
                />
                <div className="flex items-end gap-2">
                  <Field
                    label="Legenda"
                    hint='Nome do trabalho, ou "Visualização" para imagens geradas.'
                    className="flex-1"
                  >
                    <Input
                      value={image.caption}
                      onChange={(e) =>
                        set({ gallery: d.gallery.map((g, j) => (j === i ? { ...g, caption: e.target.value } : g)) })
                      }
                    />
                  </Field>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label="Tirar imagem da galeria"
                    onClick={() => set({ gallery: d.gallery.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => set({ gallery: [...d.gallery, { src: `asset:${ASSET_KEYS[0]}`, alt: "", caption: "" }] })}
            >
              <Plus aria-hidden /> Juntar imagem
            </Button>
          )}
        </Section>
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" loading={pending} className="shadow-lift">
            Guardar serviço
          </Button>
        </div>
      )}
    </form>
  );
}
