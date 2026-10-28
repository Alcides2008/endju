import { z } from "zod";
import { toE164 } from "@/lib/domain/phone";

export const BUDGET_RANGES = [
  { value: "ate-50", label: "Até 50 000 Kz" },
  { value: "50-200", label: "50 000 a 200 000 Kz" },
  { value: "200-500", label: "200 000 a 500 000 Kz" },
  { value: "500-mais", label: "Mais de 500 000 Kz" },
  { value: "nao-sei", label: "Ainda não sei" },
] as const;

/** Pedido de orçamento fora do catálogo (docs/02 · quotes). Validado no formulário e na Server Action. */
export const quoteRequestSchema = z.object({
  name: z.string().trim().min(2, "Indica o teu nome.").max(80),
  phone: z.string().transform((value, ctx) => {
    const e164 = toE164(value);
    if (!e164) ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 923 456 789" });
    return e164 ?? "";
  }),
  email: z.union([z.literal(""), z.email("Indica um email válido.")]),
  company: z.string().trim().max(80),
  description: z
    .string()
    .trim()
    .min(20, "Descreve o trabalho com um pouco mais de detalhe (mínimo 20 caracteres).")
    .max(3000),
  quantity: z.string().trim().max(80),
  deadline: z.union([z.literal(""), z.iso.date("Data inválida.")]),
  budgetRange: z.enum(BUDGET_RANGES.map((b) => b.value)),
  consent: z.boolean().refine(Boolean, "Precisamos da tua autorização para responder."),
  website: z.string().max(0).optional(),
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
