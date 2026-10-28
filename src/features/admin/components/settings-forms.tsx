"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import type { CompanyInfo } from "@/content/company";
import { fromCents, toCents } from "@/lib/domain/money";
import { formatPhone } from "@/lib/domain/phone";
import { saveCommerce, saveCompany } from "../settings-actions";
import { useRun } from "./order-admin-panel";

const iconButton = "grid size-10 shrink-0 place-items-center rounded-sm text-ink-3 hover:bg-paper-2 hover:text-danger";

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-sm border border-line bg-card p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function CompanyForm({ company, canEdit }: { company: CompanyInfo; canEdit: boolean }) {
  const [d, setD] = useState({
    address: company.address ?? "",
    phone: company.phone ? formatPhone(company.phone) : "",
    email: company.email ?? "",
    nif: company.nif ?? "",
    hours: company.hours,
    banks: company.banks,
  });
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <Card
      title="Empresa"
      hint="Aparece no rodapé, no Contacto, na privacidade e nos termos, e na pro-forma e na proposta."
    >
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Morada" className="sm:col-span-2">
            <Input
              value={d.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="Rua, bairro, município, Luanda"
            />
          </Field>
          <Field label="Telefone e WhatsApp" hint="O mesmo número serve os dois.">
            <Input type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="NIF">
            <Input value={d.nif} onChange={(e) => set({ nif: e.target.value })} />
          </Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Horário</p>
          {d.hours.map((h, i) => (
            <div key={i} className="flex gap-2">
              <Input
                aria-label="Dias"
                value={h.days}
                onChange={(e) => set({ hours: d.hours.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)) })}
              />
              <Input
                aria-label="Horas"
                value={h.time}
                onChange={(e) => set({ hours: d.hours.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })}
              />
              <button
                type="button"
                className={iconButton}
                aria-label="Tirar linha"
                onClick={() => set({ hours: d.hours.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => set({ hours: [...d.hours, { days: "", time: "" }] })}
          >
            <Plus aria-hidden /> Juntar horário
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Contas para transferência</p>
          <p className="text-xs text-ink-3">Saem impressas na pro-forma e na proposta, para o cliente pagar o sinal.</p>
          {d.banks.map((b, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_1.5fr_auto]">
              <Input
                aria-label="Banco"
                placeholder="Banco"
                value={b.bank}
                onChange={(e) => set({ banks: d.banks.map((x, j) => (j === i ? { ...x, bank: e.target.value } : x)) })}
              />
              <Input
                aria-label="IBAN"
                placeholder="AO06 …"
                value={b.iban}
                onChange={(e) => set({ banks: d.banks.map((x, j) => (j === i ? { ...x, iban: e.target.value } : x)) })}
              />
              <Input
                aria-label="Titular"
                placeholder="Titular"
                value={b.holder}
                onChange={(e) =>
                  set({ banks: d.banks.map((x, j) => (j === i ? { ...x, holder: e.target.value } : x)) })
                }
              />
              <button
                type="button"
                className={iconButton}
                aria-label="Tirar conta"
                onClick={() => set({ banks: d.banks.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => set({ banks: [...d.banks, { bank: "", iban: "AO06 ", holder: "ENDJU BUSINESS" }] })}
          >
            <Plus aria-hidden /> Juntar conta
          </Button>
        </div>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            loading={pending}
            onClick={() =>
              run(
                () =>
                  saveCompany({
                    ...d,
                    phone: d.phone ? `+244${d.phone.replace(/\D/g, "").replace(/^244/, "")}` : "",
                    hours: d.hours.filter((h) => h.days.trim()),
                  }),
                "Dados da empresa guardados. O site e os PDFs já os usam.",
              )
            }
          >
            Guardar empresa
          </Button>
        </div>
      )}
    </Card>
  );
}

type ZoneRow = { id: string; name: string; fee: number; extraDays: number; active: boolean };

export function CommerceForm({
  depositPct,
  zones,
  pickup,
  canEdit,
}: {
  depositPct: number;
  zones: ZoneRow[];
  pickup: { address: string; hours: string };
  canEdit: boolean;
}) {
  const [deposit, setDeposit] = useState(String(depositPct));
  const [rows, setRows] = useState(
    zones.map((z) => ({ ...z, feeText: fromCents(z.fee), daysText: String(z.extraDays) })),
  );
  const [place, setPlace] = useState(pickup);
  const { pending, run } = useRun();
  return (
    <Card
      title="Pagamentos e entregas"
      hint="Valem para os pedidos e orçamentos novos; os que já existem ficam como foram feitos."
    >
      <fieldset disabled={!canEdit} className="space-y-4">
        <Field
          label="Sinal para começar a produção (%)"
          hint="Clientes com pagamento a 30 dias não pagam sinal."
          className="max-w-xs"
        >
          <Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium">Zonas de entrega</p>
          {rows.map((z, i) => (
            <div
              key={z.id}
              className="grid items-end gap-2 rounded-sm border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <p className="text-sm font-medium sm:pb-3">{z.name}</p>
              <Field label="Taxa (Kz)">
                <Input
                  inputMode="decimal"
                  value={z.feeText}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, feeText: e.target.value } : r)))}
                />
              </Field>
              <Field label="Dias a mais">
                <Input
                  inputMode="numeric"
                  value={z.daysText}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, daysText: e.target.value } : r)))}
                />
              </Field>
              <Checkbox
                className="sm:pb-3"
                checked={z.active}
                onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, active: e.target.checked } : r)))}
              >
                Ativa
              </Checkbox>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Levantamento · morada">
            <Input value={place.address} onChange={(e) => setPlace({ ...place, address: e.target.value })} />
          </Field>
          <Field label="Levantamento · horário">
            <Input value={place.hours} onChange={(e) => setPlace({ ...place, hours: e.target.value })} />
          </Field>
        </div>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            loading={pending}
            onClick={() =>
              run(
                () =>
                  saveCommerce({
                    depositPct: Math.round(Number(deposit) || 0),
                    zones: Object.fromEntries(
                      rows.map((r) => [
                        r.id,
                        {
                          fee: toCents(r.feeText) || 0,
                          extraDays: Math.round(Number(r.daysText) || 0),
                          active: r.active,
                        },
                      ]),
                    ),
                    pickup: place,
                  }),
                "Pagamentos e entregas guardados.",
              )
            }
          >
            Guardar pagamentos e entregas
          </Button>
        </div>
      )}
    </Card>
  );
}
