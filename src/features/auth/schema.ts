import { z } from "zod";
import { toE164 } from "@/lib/domain/phone";

const email = z.email("Indica um email válido.");

/** Telemóvel normalizado para E.164 (+244…). */
const phone = z.string().transform((value, ctx) => {
  const e164 = toE164(value);
  if (!e164) ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 923 456 789" });
  return e164 ?? "";
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Indica o email ou o telemóvel.")
    .refine(
      (value) => (value.includes("@") ? email.safeParse(value).success : toE164(value) !== null),
      "Indica um email ou um telemóvel válido.",
    ),
  password: z.string().min(1, "Indica a senha."),
});

/** Usado no formulário e validado outra vez no servidor (/api/auth/register). */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Indica o teu nome."),
  email,
  phone,
  password: z.string().min(8, "Pelo menos 8 caracteres."),
  terms: z.boolean().refine(Boolean, "Tens de aceitar os Termos e a Política de privacidade."),
});

export const phoneLoginSchema = z.object({ phone, password: z.string().min(1) });

export const recoverSchema = z.object({ email });
