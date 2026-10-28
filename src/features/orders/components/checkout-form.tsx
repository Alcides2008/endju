"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Store, Tag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVINCES, type Province } from "@/content/delivery";
import { cart, useCart } from "@/features/cart/store";
import { formatKz } from "@/lib/domain/money";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { previewCheckout, submitOrder, type CheckoutSummary } from "../actions";
import { checkoutSchema, type CheckoutInput } from "../schema";

type Defaults = { name: string; phone: string; email: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-line pt-6">
      <legend className="mb-1 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Option({
  checked,
  onSelect,
  name,
  icon,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  name: string;
  icon?: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-sm border px-4 py-3 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/20",
        checked ? "border-ink bg-card" : "border-line hover:border-ink/40",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      {icon}
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        {detail && <span className="block text-xs text-ink-3">{detail}</span>}
      </span>
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong ? "text-base font-semibold" : "text-sm text-ink-2")}>
      <dt>{label}</dt>
      <dd className={cn(!strong && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

type CheckoutZone = { id: string; name: string; provinces: readonly string[]; fee: number; extraDays: number };

export function CheckoutForm({
  defaults,
  zones,
  pickup,
}: {
  defaults: Defaults;
  zones: CheckoutZone[];
  pickup: { id: string; address: string };
}) {
  const router = useRouter();
  const items = useCart();
  const hydrated = useHydrated();
  const [customer, setCustomer] = useState({
    type: "particular" as "particular" | "empresa",
    name: defaults.name,
    phone: defaults.phone,
    nif: "",
  });
  const [method, setMethod] = useState<"levantamento" | "entrega">("levantamento");
  const [address, setAddress] = useState({
    recipient: defaults.name,
    phone: defaults.phone,
    province: "Luanda" as Province,
    municipality: "",
    neighborhood: "",
    street: "",
    reference: "",
  });
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  // Resumo recalculado no servidor sempre que mudam os produtos, a entrega ou o cupão
  const province = address.province;
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let current = true;
    void previewCheckout({
      items,
      delivery: method === "entrega" ? { method, province } : { method, pickupPointId: pickup.id },
      couponCode,
    }).then((result) => current && setSummary(result));
    return () => {
      current = false;
    };
  }, [hydrated, items, method, province, couponCode, pickup.id]);

  if (!hydrated) return <Skeleton className="h-[32rem] w-full" />;
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line px-6 py-16 text-center">
        <p className="text-display-sm font-bold">O carrinho está vazio.</p>
        <Button asChild className="mt-6">
          <Link href="/orcamento">Escolher produtos</Link>
        </Button>
      </div>
    );
  }

  const input: CheckoutInput = {
    items,
    customer,
    delivery: method === "entrega" ? { method, address } : { method, pickupPointId: pickup.id },
    couponCode,
    notes,
    acceptTerms,
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
      setErrors(fields);
      setFormError("Revê os campos assinalados.");
      return;
    }
    setErrors({});
    startSubmit(async () => {
      const result = await submitOrder(input);
      if (result.ok) {
        cart.clear();
        router.replace(`/checkout/sucesso?pedido=${encodeURIComponent(result.number)}`);
      } else {
        setErrors(result.fields ?? {});
        setFormError(result.message);
      }
    });
  };

  const zone = zones.find((z) => z.provinces.includes(province));
  const setAddr = (patch: Partial<typeof address>) => setAddress((a) => ({ ...a, ...patch }));

  return (
    <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
      <div className="space-y-10">
        <Section title="Os teus dados">
          <div className="grid gap-2 sm:grid-cols-2">
            <Option
              name="tipo"
              checked={customer.type === "particular"}
              onSelect={() => setCustomer((c) => ({ ...c, type: "particular" }))}
              title="Particular"
            />
            <Option
              name="tipo"
              checked={customer.type === "empresa"}
              onSelect={() => setCustomer((c) => ({ ...c, type: "empresa" }))}
              title="Empresa"
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={customer.type === "empresa" ? "Nome da empresa" : "Nome"} error={errors["customer.name"]}>
              <Input
                autoComplete={customer.type === "empresa" ? "organization" : "name"}
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Telemóvel" error={errors["customer.phone"]}>
              <Input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="923 456 789"
                value={customer.phone}
                onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
              />
            </Field>
            <Field label="NIF (opcional)" hint="Aparece na fatura." error={errors["customer.nif"]}>
              <Input value={customer.nif} onChange={(e) => setCustomer((c) => ({ ...c, nif: e.target.value }))} />
            </Field>
            <Field label="Email" hint="A confirmação vai para este email.">
              <Input value={defaults.email} readOnly disabled />
            </Field>
          </div>
        </Section>

        <Section title="Entrega">
          <div className="grid gap-2 sm:grid-cols-2">
            <Option
              name="entrega"
              checked={method === "levantamento"}
              onSelect={() => setMethod("levantamento")}
              icon={<Store className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />}
              title="Levantar na loja · grátis"
              detail={pickup.address}
            />
            <Option
              name="entrega"
              checked={method === "entrega"}
              onSelect={() => setMethod("entrega")}
              icon={<Truck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />}
              title="Entregar na morada"
              detail={zones.map((z) => `${z.name}: ${formatKz(z.fee)}`).join(" · ")}
            />
          </div>
          {method === "entrega" && (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Quem recebe" error={errors["delivery.address.recipient"]}>
                <Input
                  autoComplete="name"
                  value={address.recipient}
                  onChange={(e) => setAddr({ recipient: e.target.value })}
                />
              </Field>
              <Field label="Telemóvel de quem recebe" error={errors["delivery.address.phone"]}>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={address.phone}
                  onChange={(e) => setAddr({ phone: e.target.value })}
                />
              </Field>
              <Field
                label="Província"
                hint={
                  zone
                    ? `${zone.name} · ${formatKz(zone.fee)}${zone.extraDays ? ` · +${zone.extraDays} dia(s)` : ""}`
                    : undefined
                }
                error={errors["delivery.address.province"]}
              >
                <Select
                  options={PROVINCES.map((p) => ({ value: p, label: p }))}
                  value={address.province}
                  onValueChange={(value) => setAddr({ province: value as Province })}
                />
              </Field>
              <Field label="Município" error={errors["delivery.address.municipality"]}>
                <Input
                  placeholder="Ex.: Talatona"
                  value={address.municipality}
                  onChange={(e) => setAddr({ municipality: e.target.value })}
                />
              </Field>
              <Field label="Bairro" error={errors["delivery.address.neighborhood"]}>
                <Input value={address.neighborhood} onChange={(e) => setAddr({ neighborhood: e.target.value })} />
              </Field>
              <Field label="Rua e número" error={errors["delivery.address.street"]}>
                <Input
                  autoComplete="street-address"
                  value={address.street}
                  onChange={(e) => setAddr({ street: e.target.value })}
                />
              </Field>
              <Field label="Ponto de referência (opcional)" className="md:col-span-2">
                <Input
                  placeholder="Ex.: junto ao Belas Shopping"
                  value={address.reference}
                  onChange={(e) => setAddr({ reference: e.target.value })}
                />
              </Field>
            </div>
          )}
        </Section>

        <Section title="Cupão de desconto">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Código" className="w-56">
              <Input value={couponInput} autoCapitalize="characters" onChange={(e) => setCouponInput(e.target.value)} />
            </Field>
            <Button type="button" variant="outline" onClick={() => setCouponCode(couponInput.trim().toUpperCase())}>
              <Tag aria-hidden /> Aplicar
            </Button>
            {couponCode && (
              <button
                type="button"
                onClick={() => {
                  setCouponCode("");
                  setCouponInput("");
                }}
                className="pb-3 text-sm text-ink-3 hover:text-ink"
              >
                Remover cupão
              </button>
            )}
          </div>
          {summary?.ok && summary.couponMessage && (
            <p role="alert" className="text-sm text-danger">
              {summary.couponMessage}
            </p>
          )}
          {summary?.ok && summary.couponApplied && (
            <p role="status" className="text-sm text-success">
              Cupão {summary.couponApplied} aplicado.
            </p>
          )}
        </Section>

        <Section title="Notas para a Endju">
          <Textarea
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: preciso dos cartões até sexta; ligar antes de entregar."
            aria-label="Notas para a Endju"
          />
        </Section>
      </div>

      <aside className="h-fit space-y-5 rounded-md border border-line bg-card p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Resumo</h2>
        {!summary ? (
          <Skeleton className="h-40 w-full" />
        ) : !summary.ok ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {summary.message}
          </p>
        ) : (
          <>
            <ul className="space-y-3 text-sm">
              {summary.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-4">
                  <span>
                    {line.name} × {line.quantity}
                    <span className="block text-xs text-ink-3">{line.details.join(" · ")}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs">{formatKz(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line pt-4">
              <Row label="Produtos" value={formatKz(summary.totals.items)} />
              {summary.totals.discount > 0 && <Row label="Desconto" value={`−${formatKz(summary.totals.discount)}`} />}
              <Row
                label={method === "entrega" ? `Entrega · ${summary.zoneName ?? ""}` : "Levantamento na loja"}
                value={summary.totals.delivery ? formatKz(summary.totals.delivery) : "grátis"}
              />
              <Row label="Base tributável" value={formatKz(summary.totals.subtotal)} />
              <Row label="IVA 14 %" value={formatKz(summary.totals.tax)} />
              <div className="border-t border-line pt-2">
                <Row label="Total" value={formatKz(summary.totals.total)} strong />
              </div>
              <Row label="Sinal para começar a produção" value={formatKz(summary.totals.depositRequired)} />
            </dl>
            <p className="text-xs text-ink-3">
              Pronto previsto a{" "}
              {new Intl.DateTimeFormat("pt-AO", { day: "numeric", month: "long" }).format(new Date(summary.dueAt))},
              contando da aprovação da prova e do sinal. Depois de confirmares, enviamos-te as instruções para pagar o
              sinal.
            </p>
          </>
        )}
        <div className="space-y-2 border-t border-line pt-4">
          <Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="text-ink underline underline-offset-4">
              Termos e condições
            </Link>
            .
          </Checkbox>
          {errors.acceptTerms && (
            <p role="alert" className="text-xs font-medium text-danger">
              {errors.acceptTerms}
            </p>
          )}
        </div>
        {formError && (
          <p role="alert" className="flex items-start gap-2 rounded-sm bg-danger/10 px-4 py-3 text-sm text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting || !summary?.ok}>
          Confirmar encomenda
        </Button>
      </aside>
    </form>
  );
}
