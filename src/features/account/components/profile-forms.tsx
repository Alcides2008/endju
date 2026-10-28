"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { PROVINCES } from "@/content/delivery";
import { formatPhone } from "@/lib/domain/phone";
import { cn } from "@/lib/utils";
import { deleteAddress, saveAddress, savePreferences, updateProfile, type AddressInput } from "../actions";
import type { Address } from "../server";

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (
    action: () => Promise<{ ok: true } | { ok: false; message: string }>,
    done: string,
    after?: () => void,
  ) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.message);
      toast.success(done);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    phone: string;
    email: string;
    type: "particular" | "empresa";
    company: string;
    nif: string;
  };
}) {
  const [values, setValues] = useState(defaults);
  const { pending, run } = useSave();
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(() => updateProfile(values), "Perfil guardado.");
      }}
      className="grid max-w-2xl gap-5 md:grid-cols-2"
    >
      <Field label="Nome">
        <Input autoComplete="name" value={values.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Telemóvel" hint="Também serve para entrares com a senha.">
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
      </Field>
      <Field label="Email" hint="Para mudar o email, fala connosco.">
        <Input value={values.email} readOnly disabled />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Faturar como</legend>
        <div className="flex gap-2">
          {(["particular", "empresa"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex-1 cursor-pointer rounded-sm border px-4 py-3 text-center text-sm has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/20",
                values.type === type ? "border-ink bg-card font-medium" : "border-line text-ink-2",
              )}
            >
              <input
                type="radio"
                name="tipo"
                className="sr-only"
                checked={values.type === type}
                onChange={() => set({ type })}
              />
              {type === "particular" ? "Particular" : "Empresa"}
            </label>
          ))}
        </div>
      </fieldset>
      {values.type === "empresa" && (
        <Field label="Nome da empresa">
          <Input
            autoComplete="organization"
            value={values.company}
            onChange={(e) => set({ company: e.target.value })}
          />
        </Field>
      )}
      <Field label="NIF (opcional)" hint="Aparece nas faturas.">
        <Input value={values.nif} onChange={(e) => set({ nif: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <Button type="submit" loading={pending}>
          Guardar
        </Button>
        <Link href="/recuperar-senha" className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          Mudar a senha
        </Link>
      </div>
    </form>
  );
}

const EMPTY_ADDRESS: AddressInput = {
  label: "",
  recipient: "",
  phone: "",
  province: "Luanda",
  municipality: "",
  neighborhood: "",
  street: "",
  reference: "",
  isDefault: false,
};

export function AddressBook({
  addresses,
  defaults,
}: {
  addresses: Address[];
  defaults: { name: string; phone: string };
}) {
  const [editing, setEditing] = useState<AddressInput | null>(null);
  const { pending, run } = useSave();
  const set = (patch: Partial<AddressInput>) => setEditing((v) => (v ? { ...v, ...patch } : v));

  return (
    <div className="space-y-6">
      {addresses.length === 0 ? (
        <p className="text-ink-2">
          Ainda não guardaste moradas. Guarda as mais usadas para encomendares mais depressa.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="space-y-2 rounded-sm border border-line bg-card p-5">
              <p className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 text-brand" aria-hidden /> {address.label}
                {address.isDefault && <span className="text-xs font-normal text-ink-3">· principal</span>}
              </p>
              <p className="text-sm text-ink-2">
                {address.recipient} · {formatPhone(address.phone)}
                <br />
                {address.street}, {address.neighborhood}, {address.municipality}, {address.province}
                {address.reference && (
                  <>
                    <br />
                    {address.reference}
                  </>
                )}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      ...address,
                      phone: formatPhone(address.phone),
                      reference: address.reference ?? "",
                    } as AddressInput)
                  }
                >
                  <Pencil aria-hidden /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => deleteAddress(address.id), "Morada apagada.")}
                >
                  <Trash2 aria-hidden /> Apagar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        onClick={() => setEditing({ ...EMPTY_ADDRESS, recipient: defaults.name, phone: defaults.phone })}
      >
        Adicionar morada
      </Button>

      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing?.id ? "Editar morada" : "Nova morada"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                editing &&
                run(
                  () => saveAddress(editing),
                  "Morada guardada.",
                  () => setEditing(null),
                )
              }
            >
              Guardar morada
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da morada" className="sm:col-span-2">
              <Input
                placeholder="Ex.: Escritório Talatona"
                value={editing.label}
                onChange={(e) => set({ label: e.target.value })}
              />
            </Field>
            <Field label="Quem recebe">
              <Input value={editing.recipient} onChange={(e) => set({ recipient: e.target.value })} />
            </Field>
            <Field label="Telemóvel">
              <Input
                type="tel"
                inputMode="tel"
                value={editing.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
            <Field label="Província">
              <Select
                options={PROVINCES.map((p) => ({ value: p, label: p }))}
                value={editing.province}
                onValueChange={(v) => set({ province: v as AddressInput["province"] })}
              />
            </Field>
            <Field label="Município">
              <Input value={editing.municipality} onChange={(e) => set({ municipality: e.target.value })} />
            </Field>
            <Field label="Bairro">
              <Input value={editing.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} />
            </Field>
            <Field label="Rua e número">
              <Input value={editing.street} onChange={(e) => set({ street: e.target.value })} />
            </Field>
            <Field label="Ponto de referência (opcional)" className="sm:col-span-2">
              <Input value={editing.reference} onChange={(e) => set({ reference: e.target.value })} />
            </Field>
            <Checkbox
              className="sm:col-span-2"
              checked={editing.isDefault}
              onChange={(e) => set({ isDefault: e.target.checked })}
            >
              Usar como morada principal
            </Checkbox>
          </div>
        )}
      </Modal>
    </div>
  );
}

const PREFS = [
  { key: "email", title: "Email", text: "Confirmação do pedido, provas para aprovar, pagamentos e avisos de pronto." },
  { key: "whatsapp", title: "WhatsApp", text: "Os mesmos avisos, no telemóvel da conta." },
  {
    key: "marketing",
    title: "Novidades e promoções",
    text: "Campanhas e novidades da Endju. Podes desligar quando quiseres.",
  },
] as const;

export function NotificationPrefs({
  defaults,
}: {
  defaults: { email: boolean; whatsapp: boolean; marketing: boolean };
}) {
  const [prefs, setPrefs] = useState(defaults);
  const { pending, run } = useSave();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run(() => savePreferences(prefs), "Preferências guardadas.");
      }}
      className="max-w-2xl space-y-4"
    >
      <ul className="divide-y divide-line rounded-sm border border-line bg-card">
        {PREFS.map((pref) => (
          <li key={pref.key} className="p-5">
            <Checkbox
              checked={prefs[pref.key]}
              onChange={(e) => setPrefs((p) => ({ ...p, [pref.key]: e.target.checked }))}
            >
              <span className="block font-medium text-ink">{pref.title}</span>
              <span className="block text-sm">{pref.text}</span>
            </Checkbox>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-3">Os avisos dentro da área do cliente estão sempre ligados.</p>
      <Button type="submit" loading={pending}>
        Guardar preferências
      </Button>
    </form>
  );
}
