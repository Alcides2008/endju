"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import {
  addCustomerNote,
  createCustomer,
  importCustomersCsv,
  updateCustomer,
  type CustomerInput,
} from "../customer-actions";

const EMPTY: CustomerInput = {
  name: "",
  tradeName: "",
  type: "particular",
  segment: "particular",
  phone: "",
  email: "",
  nif: "",
  tags: [],
  paymentTerms: "sinal_50",
};

function CustomerFields({ values, set }: { values: CustomerInput; set: (patch: Partial<CustomerInput>) => void }) {
  const [tags, setTags] = useState(values.tags.join(", "));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome ou razão social" className="sm:col-span-2">
        <Input value={values.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Tipo">
        <Select
          options={[
            { value: "particular", label: "Particular" },
            { value: "empresa", label: "Empresa" },
          ]}
          value={values.type}
          onValueChange={(v) =>
            set({
              type: v as CustomerInput["type"],
              segment: values.segment === "vip" ? "vip" : (v as CustomerInput["segment"]),
            })
          }
        />
      </Field>
      <Field label="Segmento">
        <Select
          options={[
            { value: "particular", label: "Particular" },
            { value: "empresa", label: "Empresa" },
            { value: "vip", label: "VIP" },
          ]}
          value={values.segment}
          onValueChange={(v) => set({ segment: v as CustomerInput["segment"] })}
        />
      </Field>
      {values.type === "empresa" && (
        <Field label="Nome comercial (opcional)" className="sm:col-span-2">
          <Input value={values.tradeName} onChange={(e) => set({ tradeName: e.target.value })} />
        </Field>
      )}
      <Field label="Telefone">
        <Input type="tel" inputMode="tel" value={values.phone} onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field label="Email (opcional)">
        <Input type="email" value={values.email} onChange={(e) => set({ email: e.target.value })} />
      </Field>
      <Field label="NIF (opcional)">
        <Input value={values.nif} onChange={(e) => set({ nif: e.target.value })} />
      </Field>
      <Field label="Condições de pagamento">
        <Select
          options={[
            { value: "sinal_50", label: "Sinal de 50 %" },
            { value: "pronto", label: "Pronto pagamento" },
            { value: "a_30_dias", label: "A 30 dias (sem sinal)" },
          ]}
          value={values.paymentTerms}
          onValueChange={(v) => set({ paymentTerms: v as CustomerInput["paymentTerms"] })}
        />
      </Field>
      <Field label="Etiquetas" hint="Separadas por vírgulas. Ex.: igreja, evento-dezembro" className="sm:col-span-2">
        <Input
          value={tags}
          onChange={(e) => {
            setTags(e.target.value);
            set({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            });
          }}
        />
      </Field>
    </div>
  );
}

export function NewCustomerButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [pending, start] = useTransition();
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo cliente</Button>}
      title="Novo cliente"
      description="Para clientes de balcão, sem conta no site."
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await createCustomer(values);
                if (!result.ok) return void toast.error(result.message);
                setOpen(false);
                setValues(EMPTY);
                router.push(`/admin/clientes/${result.id}`);
              })
            }
          >
            Criar ficha
          </Button>
        </>
      }
    >
      <CustomerFields values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} />
    </Modal>
  );
}

export function EditCustomerForm({ id, defaults }: { id: string; defaults: CustomerInput }) {
  const router = useRouter();
  const [values, setValues] = useState(defaults);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await updateCustomer(id, values);
          if (!result.ok) return void toast.error(result.message);
          toast.success("Ficha atualizada.");
          router.refresh();
        });
      }}
      className="space-y-4"
    >
      <CustomerFields values={values} set={(patch) => setValues((v) => ({ ...v, ...patch }))} />
      <Button type="submit" loading={pending}>
        Guardar ficha
      </Button>
    </form>
  );
}

export function CustomerNoteForm({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: prefere ser contactado por WhatsApp de manhã."
        aria-label="Nova nota"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Checkbox checked={pinned} onChange={(e) => setPinned(e.target.checked)}>
          Fixar no topo
        </Checkbox>
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          disabled={text.trim().length < 2}
          onClick={() =>
            start(async () => {
              const result = await addCustomerNote(id, text, pinned);
              if (!result.ok) return void toast.error(result.message);
              setText("");
              setPinned(false);
              router.refresh();
            })
          }
        >
          Guardar nota
        </Button>
      </div>
    </div>
  );
}

export function ImportCustomersButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [report, setReport] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setReport(null);
      }}
      trigger={<Button variant="outline">Importar CSV</Button>}
      title="Importar clientes"
      description="Primeira linha: nome;telefone;email;nif;tipo;etiquetas. Quem já existe (mesmo telefone) é ignorado."
      footer={
        <Button
          loading={pending}
          disabled={!csv.trim()}
          onClick={() =>
            start(async () => {
              const result = await importCustomersCsv(csv);
              if ("message" in result) return void toast.error(result.message);
              toast.success(`${result.ok} cliente(s) importado(s).`);
              setReport(result.skipped);
              router.refresh();
            })
          }
        >
          Importar
        </Button>
      }
    >
      <div className="space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => void e.target.files?.[0]?.text().then(setCsv)}
          className="text-sm"
          aria-label="Ficheiro CSV"
        />
        <Textarea
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"nome;telefone;email;nif;tipo;etiquetas\nAna Kiala;923456789;;;particular;igreja"}
          aria-label="Conteúdo CSV"
        />
        {report && report.length > 0 && (
          <ul className="max-h-40 overflow-y-auto text-xs text-ink-2">
            {report.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
