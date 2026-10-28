"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { sendContactMessage } from "../actions";
import { CONTACT_SUBJECTS, contactSchema } from "../schema";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      company: "",
      subject: "orcamento",
      message: "",
      consent: false,
      website: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async () => {
    setError(null);
    // Envia os valores tal como escritos: o servidor volta a validar e a normalizar
    const result = await sendContactMessage(form.getValues());
    if (result.ok) setSent(true);
    else setError(result.message);
  });

  if (sent) {
    return (
      <div role="status" className="space-y-4 rounded-sm border border-line bg-card p-8">
        <MailCheck className="size-8 text-success" aria-hidden />
        <h2 className="text-display-sm font-bold">Mensagem recebida.</h2>
        <p className="text-ink-2">
          Respondemos no mesmo dia útil, pelo telemóvel que indicaste. Se for urgente, liga-nos ou fala connosco no
          WhatsApp.
        </p>
        <button
          type="button"
          onClick={() => {
            form.reset();
            setSent(false);
          }}
          className="text-sm font-medium underline decoration-brand decoration-2 underline-offset-4"
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 md:grid-cols-2">
      <Field label="Nome" error={errors.name?.message}>
        <Input autoComplete="name" {...form.register("name")} />
      </Field>
      <Field label="Telemóvel" hint="Respondemos por chamada ou WhatsApp." error={errors.phone?.message}>
        <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="923 456 789" {...form.register("phone")} />
      </Field>
      <Field label="Email (opcional)" error={errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      <Field label="Empresa (opcional)" error={errors.company?.message}>
        <Input autoComplete="organization" {...form.register("company")} />
      </Field>
      {/* O Field fica dentro do Controller para passar id e aria ao Select (o Controller não os reencaminha) */}
      <Controller
        control={form.control}
        name="subject"
        render={({ field }) => (
          <Field label="Assunto" error={errors.subject?.message} className="md:col-span-2">
            <Select
              options={CONTACT_SUBJECTS.map((s) => ({ value: s.value, label: s.label }))}
              value={field.value}
              onValueChange={field.onChange}
            />
          </Field>
        )}
      />
      <Field label="Mensagem" error={errors.message?.message} className="md:col-span-2">
        <Textarea
          rows={6}
          placeholder="Ex.: preciso de uma lona de 3 × 2 m para a fachada da loja, com montagem no Kilamba."
          {...form.register("message")}
        />
      </Field>
      {/* Armadilha para robôs: escondida de pessoas e de leitores de ecrã */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        {...form.register("website")}
      />
      <div className="space-y-2 md:col-span-2">
        <Checkbox {...form.register("consent")}>
          Autorizo a Endju a usar estes dados para responder ao meu contacto, como descrito na{" "}
          <Link href="/privacidade" className="text-ink underline underline-offset-4">
            Política de privacidade
          </Link>
          .
        </Checkbox>
        {errors.consent && (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.consent.message}
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-sm bg-danger/10 px-4 py-3 text-sm text-danger md:col-span-2"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="md:col-span-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "A enviar…" : "Enviar mensagem"}
        </Button>
      </div>
    </form>
  );
}
