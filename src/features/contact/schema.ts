import { z } from "zod";
import { toE164 } from "@/lib/domain/phone";

export const CONTACT_SUBJECTS = [
  { value: "orcamento", label: "Pedir um orçamento" },
  { value: "encomenda", label: "Uma encomenda em curso" },
  { value: "parceria", label: "Parceria ou revenda" },
  { value: "outro", label: "Outro assunto" },
] as const;

/** Validado no formulário e outra vez na Server Action. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Indica o teu nome.").max(80, "Nome demasiado longo."),
  phone: z.string().transform((value, ctx) => {
    const e164 = toE164(value);
    if (!e164) ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 923 456 789" });
    return e164 ?? "";
  }),
  email: z.union([z.literal(""), z.email("Indica um email válido.")]),
  company: z.string().trim().max(80),
  subject: z.enum(
    CONTACT_SUBJECTS.map((s) => s.value),
    "Escolhe o assunto.",
  ),
  message: z
    .string()
    .trim()
    .min(10, "Conta-nos um pouco mais (mínimo 10 caracteres).")
    .max(2000, "Máximo de 2000 caracteres."),
  consent: z.boolean().refine(Boolean, "Precisamos da tua autorização para responder."),
  /** Armadilha para robôs: campo escondido que uma pessoa nunca preenche */
  website: z.string().max(0).optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
