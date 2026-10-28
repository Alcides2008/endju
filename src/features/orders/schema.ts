import { z } from "zod";
import { PROVINCES } from "@/content/delivery";
import { toE164 } from "@/lib/domain/phone";

const phone = z.string().transform((value, ctx) => {
  const e164 = toE164(value);
  if (!e164) ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 923 456 789" });
  return e164 ?? "";
});

/** Linha do carrinho tal como chega do browser: o servidor só confia na forma, nunca no preço. */
export const cartItemSchema = z.object({
  id: z.string().max(64),
  productSlug: z.string().max(80),
  options: z.record(z.string().max(40), z.string().max(40)),
  size: z.object({ widthCm: z.number().positive(), heightCm: z.number().positive() }).optional(),
  quantity: z.number().int().positive(),
  urgent: z.boolean(),
  design: z.enum(["cliente_envia", "endju_cria"]),
  artwork: z
    .object({
      name: z.string().max(200),
      sizeBytes: z.number().nonnegative(),
      format: z.string().max(10),
      widthPx: z.number().optional(),
      heightPx: z.number().optional(),
      dpi: z.number().optional(),
      status: z.enum(["ok", "avisos", "por_verificar"]),
      messages: z.array(z.string().max(300)).max(5),
    })
    .nullable(),
  notes: z.string().max(600),
});

export const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, "O carrinho está vazio.").max(30),
    customer: z.object({
      type: z.enum(["particular", "empresa"]),
      name: z.string().trim().min(2, "Indica o nome ou a empresa.").max(120),
      phone,
      nif: z
        .string()
        .trim()
        .max(20)
        .refine((value) => value === "" || /^[0-9A-Z]{9,14}$/i.test(value), "NIF inválido."),
    }),
    delivery: z.discriminatedUnion("method", [
      z.object({ method: z.literal("levantamento"), pickupPointId: z.string() }),
      z.object({
        method: z.literal("entrega"),
        address: z.object({
          recipient: z.string().trim().min(2, "Indica quem recebe.").max(120),
          phone,
          province: z.enum(PROVINCES, "Escolhe a província."),
          municipality: z.string().trim().min(2, "Indica o município.").max(80),
          neighborhood: z.string().trim().min(2, "Indica o bairro.").max(80),
          street: z.string().trim().min(2, "Indica a rua e o número.").max(160),
          reference: z.string().trim().max(160),
        }),
      }),
    ]),
    couponCode: z.string().trim().toUpperCase().max(30),
    notes: z.string().trim().max(1000),
    acceptTerms: z.boolean().refine(Boolean, "Tens de aceitar os Termos e condições."),
  })
  .strict();

/** O que o resumo precisa para calcular entrega, cupão e IVA enquanto o cliente ainda preenche o resto. */
export const previewSchema = z.object({
  items: z.array(cartItemSchema).min(1, "O carrinho está vazio.").max(30),
  delivery: z.discriminatedUnion("method", [
    z.object({ method: z.literal("levantamento"), pickupPointId: z.string() }),
    z.object({ method: z.literal("entrega"), province: z.enum(PROVINCES) }),
  ]),
  couponCode: z.string().trim().toUpperCase().max(30),
});

export type PreviewInput = z.input<typeof previewSchema>;
export type PreviewData = z.output<typeof previewSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
