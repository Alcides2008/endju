"use client";

import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, MailCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { whatsappLink } from "@/content/company";
import { requestQuote } from "../actions";
import { BUDGET_RANGES, quoteRequestSchema } from "../schema";

export function QuoteRequestForm() {
  const [number, setNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      company: "",
      description: "",
      quantity: "",
      deadline: "",
      budgetRange: "nao-sei",
      consent: false,
      website: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async () => {
    setError(null);
    const result = await requestQuote(form.getValues());
    if (result.ok) setNumber(result.number);
    else setError(result.message);
  });

  if (number) {
    const whatsapp = whatsappLink(`Olá Endju, envio as referências do orçamento ${number}.`);
    return (
      <div role="status" className="space-y-5 rounded-sm border border-line bg-card p-8">
        <MailCheck className="size-8 text-success" aria-hidden />
        <h2 className="text-display-sm font-bold">Pedido {number} recebido.</h2>
        <p className="text-ink-2">
          Respondemos no mesmo dia útil com uma proposta. Se tiveres fotografias, medidas ou o logótipo, envia-os por
          WhatsApp com o número do pedido.
        </p>
        {whatsapp && (
          <Button asChild>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden /> Enviar referências por WhatsApp
            </a>
          </Button>
        )}
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
      <Field label="O que precisas?" error={errors.description?.message} className="md:col-span-2">
        <Textarea
          rows={6}
          placeholder="Ex.: letreiro luminoso de 4 × 1 m para a fachada da loja no Kilamba, com montagem. Já temos o logótipo em vetor."
          {...form.register("description")}
        />
      </Field>
      <Field label="Quantidade (opcional)" error={errors.quantity?.message}>
        <Input placeholder="Ex.: 200 coletes, 3 lonas" {...form.register("quantity")} />
      </Field>
      <Field label="Para quando? (opcional)" error={errors.deadline?.message}>
        <Input type="date" {...form.register("deadline")} />
      </Field>
      {/* O Field fica dentro do Controller para passar id e aria ao Select */}
      <Controller
        control={form.control}
        name="budgetRange"
        render={({ field }) => (
          <Field label="Orçamento previsto" error={errors.budgetRange?.message} className="md:col-span-2">
            <Select
              options={BUDGET_RANGES.map((b) => ({ value: b.value, label: b.label }))}
              value={field.value}
              onValueChange={field.onChange}
            />
          </Field>
        )}
      />
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
          Autorizo a Endju a usar estes dados para preparar e enviar a proposta, como descrito na{" "}
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
        <Button type="submit" size="lg" loading={isSubmitting}>
          Pedir orçamento
        </Button>
      </div>
    </form>
  );
}
