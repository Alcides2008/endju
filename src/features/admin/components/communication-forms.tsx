"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { TEMPLATE_KEYS, TEMPLATE_LABELS, type Template, type TemplateKey } from "@/lib/domain/messages";
import { saveTemplate, whatsappForOrder } from "../communication-actions";
import { useRun } from "./order-admin-panel";

export function TemplateForm({ template, canEdit }: { template: Template; canEdit: boolean }) {
  const [d, setD] = useState(template);
  const set = (patch: Partial<Template>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  const dirty = JSON.stringify(d) !== JSON.stringify(template);
  return (
    <form
      className="space-y-4 rounded-sm border border-line bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveTemplate(template.key, d), "Modelo guardado.");
      }}
    >
      <h2 className="font-semibold">{TEMPLATE_LABELS[template.key]}</h2>
      <fieldset disabled={!canEdit} className="space-y-4">
        <Field label="WhatsApp">
          <Textarea value={d.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className="min-h-24" />
        </Field>
        <Field label="Assunto do email">
          <Input value={d.emailSubject} onChange={(e) => set({ emailSubject: e.target.value })} />
        </Field>
        <Field label="Texto do email">
          <Textarea value={d.email} onChange={(e) => set({ email: e.target.value })} className="min-h-20" />
        </Field>
        <Checkbox checked={d.active} onChange={(e) => set({ active: e.target.checked })}>
          Ativo
        </Checkbox>
      </fieldset>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={pending} disabled={!dirty}>
            Guardar
          </Button>
        </div>
      )}
    </form>
  );
}

/** No pedido: escolhe o modelo e abre o WhatsApp com a mensagem pronta (fica no histórico). */
export function WhatsAppSend({ orderId, suggested }: { orderId: string; suggested: TemplateKey }) {
  const [key, setKey] = useState<TemplateKey>(suggested);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Select
        aria-label="Mensagem"
        options={TEMPLATE_KEYS.map((k) => ({ value: k, label: TEMPLATE_LABELS[k] }))}
        value={key}
        onValueChange={(v) => setKey(v as TemplateKey)}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        loading={pending}
        onClick={() =>
          start(async () => {
            const result = await whatsappForOrder(orderId, key);
            if (!result.ok) return void toast.error(result.message);
            window.open(result.url, "_blank", "noopener");
          })
        }
      >
        <MessageCircle aria-hidden /> Abrir no WhatsApp
      </Button>
    </div>
  );
}
