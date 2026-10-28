"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { formatKz } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { attachTransferProof, signTransferProof, simulatePayment, startPayment } from "../actions";

export type OpenPayment = {
  id: string;
  method: "multicaixa_express" | "referencia" | "transferencia";
  amount: number;
  status: "pendente" | "aguarda_validacao";
  entity?: string;
  reference?: string;
  expiresAt?: string;
  phone?: string;
};

type Method = OpenPayment["method"];
const METHODS: { value: Method; label: string; hint: string }[] = [
  { value: "multicaixa_express", label: "Multicaixa Express", hint: "Aprovas no telemóvel, na app" },
  { value: "referencia", label: "Pagamento por referência", hint: "No Multicaixa ou no homebanking" },
  { value: "transferencia", label: "Transferência bancária", hint: "Envias o comprovativo aqui" },
];

/** Envia o comprovativo direto para o Cloudinary (privado) e liga-o ao pagamento. */
async function uploadProof(paymentId: string, file: File, reference: string) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Ficheiro maior que 10 MB.");
  const signed = await signTransferProof(paymentId);
  if (!signed) throw new Error("Não foi possível preparar o envio. Manda o comprovativo por WhatsApp.");
  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(signed.fields)) body.append(key, String(value));
  const response = await fetch(signed.url, { method: "POST", body });
  const data = (await response.json()) as { public_id?: string; format?: string; error?: { message: string } };
  if (!response.ok || !data.public_id) throw new Error(data.error?.message ?? "O envio falhou.");
  const result = await attachTransferProof(paymentId, {
    publicId: data.public_id,
    format: (data.format ?? "jpg") as "jpg",
    reference,
  });
  if (!result.ok) throw new Error(result.message);
}

export function PayBox({
  orderNumber,
  amountLabel,
  open,
  banks,
  testMode,
  online,
}: {
  orderNumber: string;
  amountLabel: string;
  open: OpenPayment[];
  banks: { bank: string; iban: string; holder: string }[];
  testMode: boolean;
  /** Multicaixa Express e referência ligados; sem eles, só transferência */
  online: boolean;
}) {
  const router = useRouter();
  const methods = online ? METHODS : METHODS.filter((m) => m.value === "transferencia");
  const [method, setMethod] = useState<Method>(methods[0].value);
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [pending, start] = useTransition();
  const current = open.find((p) => p.method === method);

  const act = (fn: () => Promise<{ ok: boolean; message?: string }>, done: string) =>
    start(async () => {
      try {
        const result = await fn();
        if (!result.ok) return void toast.error(result.message ?? "Não foi possível.");
        toast.success(done);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível.");
      }
    });

  return (
    <section aria-labelledby="pagar" className="space-y-4 rounded-sm border border-line bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pagar" className="text-lg font-semibold">
          Pagar {amountLabel}
        </h2>
        {testMode && (
          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs text-warning">
            Modo de teste: nada é cobrado
          </span>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label="Meio de pagamento"
        className={cn("grid gap-2", methods.length > 1 && "sm:grid-cols-3")}
      >
        {methods.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={method === m.value}
            onClick={() => setMethod(m.value)}
            className={cn(
              "rounded-sm border px-4 py-3 text-left text-sm transition-colors",
              method === m.value ? "border-ink bg-paper-2" : "border-line hover:border-ink/40",
            )}
          >
            <span className="block font-medium">{m.label}</span>
            <span className="block text-xs text-ink-3">{m.hint}</span>
          </button>
        ))}
      </div>

      {method === "multicaixa_express" &&
        (current ? (
          <div className="space-y-3 text-sm">
            <p className="text-ink-2">
              Enviámos o pedido de {formatKz(current.amount)} para o Multicaixa Express do número {current.phone}.
              Aprova na app; a confirmação chega aqui sozinha.
            </p>
            {testMode && (
              <Button
                size="sm"
                variant="outline"
                loading={pending}
                onClick={() => act(() => simulatePayment(current.id), "Pagamento confirmado (teste).")}
              >
                Simular a aprovação (teste)
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Número do Multicaixa Express" className="w-64">
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9XX XXX XXX"
              />
            </Field>
            <Button
              loading={pending}
              onClick={() => act(() => startPayment(orderNumber, { method, phone }), "Pedido de pagamento enviado.")}
            >
              Pagar com Multicaixa Express
            </Button>
          </div>
        ))}

      {method === "referencia" &&
        (current ? (
          <div className="space-y-3 text-sm">
            <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-sm bg-paper-2 p-4 font-mono">
              <dt className="font-sans text-ink-3">Entidade</dt>
              <dd>{current.entity}</dd>
              <dt className="font-sans text-ink-3">Referência</dt>
              <dd>{current.reference}</dd>
              <dt className="font-sans text-ink-3">Valor</dt>
              <dd>{formatKz(current.amount)}</dd>
            </dl>
            <p className="text-ink-2">
              Paga no Multicaixa ou no homebanking até {current.expiresAt}. A confirmação chega aqui sozinha.
            </p>
            {testMode && (
              <Button
                size="sm"
                variant="outline"
                loading={pending}
                onClick={() => act(() => simulatePayment(current.id), "Pagamento confirmado (teste).")}
              >
                Simular o pagamento (teste)
              </Button>
            )}
          </div>
        ) : (
          <Button
            loading={pending}
            onClick={() => act(() => startPayment(orderNumber, { method }), "Referência criada.")}
          >
            Gerar referência
          </Button>
        ))}

      {method === "transferencia" && (
        <div className="space-y-3 text-sm">
          {banks.length ? (
            <ul className="space-y-1 rounded-sm bg-paper-2 p-4">
              {banks.map((b) => (
                <li key={b.iban}>
                  <span className="font-medium">{b.bank}</span> · <span className="font-mono">{b.iban}</span> ·{" "}
                  {b.holder}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2">Pede-nos o IBAN pelo WhatsApp: ainda não está publicado aqui.</p>
          )}
          {current?.status === "aguarda_validacao" ? (
            <p className="text-ink-2">
              Recebemos o teu comprovativo. Confirmamos assim que o dinheiro entrar na conta.
            </p>
          ) : current ? (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Comprovativo (PDF ou imagem)" className="min-w-60 flex-1">
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  className="py-2.5"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label="Nº da transferência (opcional)" className="w-56">
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </Field>
              <Button
                loading={pending}
                disabled={!file}
                onClick={() =>
                  file &&
                  act(
                    async () => (await uploadProof(current.id, file, reference), { ok: true }),
                    "Comprovativo enviado.",
                  )
                }
              >
                Enviar comprovativo
              </Button>
            </div>
          ) : (
            <Button
              loading={pending}
              onClick={() =>
                act(() => startPayment(orderNumber, { method }), "Faz a transferência e envia o comprovativo.")
              }
            >
              Vou pagar por transferência
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
