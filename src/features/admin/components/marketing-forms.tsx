"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import {
  CAMPAIGN_CHANNELS,
  CHANNEL_LABELS,
  COUPON_TYPES,
  COUPON_TYPE_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_META,
  LEAD_STAGES,
  POPUP_TRIGGER_LABELS,
  POPUP_TRIGGERS,
  type CampaignChannel,
  type CouponType,
  type LeadSource,
  type LeadStage,
  type PopupTrigger,
} from "@/lib/domain/marketing";
import { fromCents, toCents } from "@/lib/domain/money";
import type { CampaignRow, CouponRow, LeadRow, PopupDoc } from "../marketing";
import { cancelSubscriber, createLead, saveCampaign, saveCoupon, savePopup, updateLead } from "../marketing-actions";
import { useRun } from "./order-admin-panel";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Luanda" }).format(new Date());
const kz = (text: string) => (text.trim() ? toCents(text) || 0 : 0);
const int = (text: string) => Math.max(0, Math.round(Number(text.replace(",", ".")) || 0));
const kzText = (cents: number) => (cents ? fromCents(cents) : "");

function FormModal({
  title,
  description,
  trigger,
  onSave,
  pending,
  open,
  setOpen,
  children,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  onSave: () => void;
  pending: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={description}
      trigger={trigger}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button loading={pending} onClick={onSave}>
            Guardar
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

const addButton = (label: string) => (
  <Button>
    <Plus aria-hidden /> {label}
  </Button>
);
const editButton = (
  <Button size="sm" variant="ghost">
    Editar
  </Button>
);

// ── Cupões ──

export function CouponButton({ coupon }: { coupon?: CouponRow }) {
  const [open, setOpen] = useState(false);
  const init = () => ({
    code: coupon?.code ?? "",
    type: coupon?.type ?? ("percent" as CouponType),
    value: coupon ? (coupon.type === "fixed" ? kzText(coupon.value) : String(coupon.value || "")) : "10",
    minSubtotal: kzText(coupon?.minSubtotal ?? 0),
    maxDiscount: kzText(coupon?.maxDiscount ?? 0),
    startsAt: coupon?.startsAt || today(),
    endsAt: coupon?.endsAt ?? "",
    usageLimit: coupon?.usageLimit ? String(coupon.usageLimit) : "",
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    active: coupon?.active ?? true,
  });
  const [d, setD] = useState(init);
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <FormModal
      title={coupon ? `Cupão ${coupon.code}` : "Novo cupão"}
      description="O cliente escreve o código no checkout; o servidor confirma as condições antes de aceitar."
      trigger={coupon ? editButton : addButton("Novo cupão")}
      open={open}
      setOpen={(v) => {
        setOpen(v);
        if (v) setD(init());
      }}
      pending={pending}
      onSave={() =>
        run(
          () =>
            saveCoupon(
              {
                code: d.code,
                type: d.type,
                value: d.type === "fixed" ? kz(d.value) : int(d.value),
                minSubtotal: kz(d.minSubtotal),
                maxDiscount: kz(d.maxDiscount),
                startsAt: d.startsAt,
                endsAt: d.endsAt,
                usageLimit: int(d.usageLimit),
                firstOrderOnly: d.firstOrderOnly,
                active: d.active,
              },
              !coupon,
            ),
          "Cupão guardado.",
          () => setOpen(false),
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" hint="Maiúsculas e números, ex.: NATAL26.">
          <Input
            value={d.code}
            disabled={Boolean(coupon)}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Tipo">
          <Select
            options={COUPON_TYPES.map((t) => ({ value: t, label: COUPON_TYPE_LABELS[t] }))}
            value={d.type}
            onValueChange={(v) => set({ type: v as CouponType })}
          />
        </Field>
        {d.type !== "free_delivery" && (
          <Field label={d.type === "percent" ? "Desconto (%)" : "Desconto (Kz)"}>
            <Input inputMode="decimal" value={d.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
        )}
        {d.type === "percent" && (
          <Field label="Desconto máximo (Kz, opcional)">
            <Input inputMode="decimal" value={d.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
          </Field>
        )}
        <Field label="Compra mínima (Kz, opcional)">
          <Input inputMode="decimal" value={d.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} />
        </Field>
        <Field label="Limite de utilizações (opcional)">
          <Input inputMode="numeric" value={d.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
        </Field>
        <Field label="Válido a partir de">
          <Input type="date" value={d.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field label="Até (opcional)">
          <Input type="date" value={d.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
      </div>
      <Checkbox checked={d.firstOrderOnly} onChange={(e) => set({ firstOrderOnly: e.target.checked })}>
        Só na primeira encomenda do cliente
      </Checkbox>
      <Checkbox checked={d.active} onChange={(e) => set({ active: e.target.checked })}>
        Ativo
      </Checkbox>
    </FormModal>
  );
}

// ── Campanhas ──

export function CampaignButton({ campaign, coupons }: { campaign?: CampaignRow; coupons: string[] }) {
  const [open, setOpen] = useState(false);
  const init = () => ({
    name: campaign?.name ?? "",
    channel: campaign?.channel ?? ("whatsapp" as CampaignChannel),
    startsAt: campaign?.startsAt || today(),
    endsAt: campaign?.endsAt ?? "",
    couponCodes: campaign?.couponCodes ?? [],
    utmCampaign: campaign?.utmCampaign ?? "",
    budget: kzText(campaign?.budget ?? 0),
    draft: campaign?.draft ?? false,
    notes: campaign?.notes ?? "",
  });
  const [d, setD] = useState(init);
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <FormModal
      title={campaign ? campaign.name : "Nova campanha"}
      description="Os resultados contam os pedidos feitos com os cupões da campanha, dentro das datas."
      trigger={campaign ? editButton : addButton("Nova campanha")}
      open={open}
      setOpen={(v) => {
        setOpen(v);
        if (v) setD(init());
      }}
      pending={pending}
      onSave={() =>
        run(
          () => saveCampaign(campaign?.id ?? null, { ...d, budget: kz(d.budget) }),
          "Campanha guardada.",
          () => setOpen(false),
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2">
          <Input
            value={d.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Ex.: Natal 2026 · cartões"
          />
        </Field>
        <Field label="Canal">
          <Select
            options={CAMPAIGN_CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABELS[c] }))}
            value={d.channel}
            onValueChange={(v) => set({ channel: v as CampaignChannel })}
          />
        </Field>
        <Field label="Orçamento (Kz, opcional)">
          <Input inputMode="decimal" value={d.budget} onChange={(e) => set({ budget: e.target.value })} />
        </Field>
        <Field label="Início">
          <Input type="date" value={d.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field label="Fim (opcional)">
          <Input type="date" value={d.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
        </Field>
        <Field label="Notas" className="sm:col-span-2">
          <Textarea value={d.notes} onChange={(e) => set({ notes: e.target.value })} className="min-h-20" />
        </Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Cupões da campanha</p>
        {coupons.length === 0 ? (
          <p className="text-sm text-ink-3">Cria primeiro um cupão para medir os resultados.</p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {coupons.map((code) => (
              <Checkbox
                key={code}
                checked={d.couponCodes.includes(code)}
                onChange={(e) =>
                  set({
                    couponCodes: e.target.checked ? [...d.couponCodes, code] : d.couponCodes.filter((c) => c !== code),
                  })
                }
              >
                <span className="font-mono">{code}</span>
              </Checkbox>
            ))}
          </div>
        )}
      </div>
      <Checkbox checked={d.draft} onChange={(e) => set({ draft: e.target.checked })}>
        Ainda é um rascunho (não conta como ativa)
      </Checkbox>
    </FormModal>
  );
}

// ── Leads ──

export function LeadEditor({ lead, staff }: { lead: LeadRow; staff: { id: string; name: string }[] }) {
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [assigneeId, setAssignee] = useState(lead.assigneeId);
  const [lostReason, setLostReason] = useState(lead.lostReason);
  const [note, setNote] = useState("");
  const { pending, run } = useRun();
  const dirty = stage !== lead.stage || assigneeId !== lead.assigneeId || lostReason !== lead.lostReason || note.trim();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fase">
          <Select
            options={LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_META[s].label }))}
            value={stage}
            onValueChange={(v) => setStage(v as LeadStage)}
          />
        </Field>
        <Field label="Responsável">
          <Select
            options={[{ value: "ninguem", label: "Ninguém" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]}
            value={assigneeId || "ninguem"}
            onValueChange={(v) => setAssignee(v === "ninguem" ? "" : v)}
          />
        </Field>
      </div>
      {stage === "perdido" && (
        <Field label="Porque se perdeu">
          <Input
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Ex.: preço, prazo, escolheu outra gráfica"
          />
        </Field>
      )}
      <Field label="Nota (opcional)">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-16"
          placeholder="O que se falou, próximo passo…"
        />
      </Field>
      <div className="flex justify-end">
        <Button
          size="sm"
          loading={pending}
          disabled={!dirty}
          onClick={() =>
            run(
              () => updateLead(lead.id, { stage, assigneeId, lostReason, note }),
              "Lead atualizado.",
              () => setNote(""),
            )
          }
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

const MANUAL_SOURCES: LeadSource[] = ["whatsapp", "telefone", "balcao"];

export function NewLeadButton() {
  const [open, setOpen] = useState(false);
  const blank = {
    name: "",
    phone: "",
    email: "",
    company: "",
    source: "whatsapp" as LeadSource,
    interest: "",
    message: "",
  };
  const [d, setD] = useState(blank);
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <FormModal
      title="Novo lead"
      description="Para contactos que chegaram por WhatsApp, telefone ou na loja. Os do site entram sozinhos."
      trigger={addButton("Novo lead")}
      open={open}
      setOpen={setOpen}
      pending={pending}
      onSave={() =>
        run(
          () => createLead(d),
          "Lead criado.",
          () => {
            setOpen(false);
            setD(blank);
          },
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Empresa (opcional)">
          <Input value={d.company} onChange={(e) => set({ company: e.target.value })} />
        </Field>
        <Field label="Telefone">
          <Input type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Email (opcional)">
          <Input type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Como chegou">
          <Select
            options={MANUAL_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] }))}
            value={d.source}
            onValueChange={(v) => set({ source: v as LeadSource })}
          />
        </Field>
        <Field label="Interesse">
          <Input
            value={d.interest}
            onChange={(e) => set({ interest: e.target.value })}
            placeholder="Ex.: fardamento para 40 pessoas"
          />
        </Field>
        <Field label="Mensagem (opcional)" className="sm:col-span-2">
          <Textarea value={d.message} onChange={(e) => set({ message: e.target.value })} className="min-h-20" />
        </Field>
      </div>
    </FormModal>
  );
}

export function CancelSubscriberButton({ id }: { id: string }) {
  const { pending, run } = useRun();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        window.confirm("Tirar este contacto da newsletter?") && run(() => cancelSubscriber(id), "Inscrição cancelada.")
      }
    >
      Cancelar
    </Button>
  );
}

// ── Pop-ups ──

export function PopupButton({ popup }: { popup?: PopupDoc }) {
  const [open, setOpen] = useState(false);
  const init = () => ({
    name: popup?.name ?? "",
    trigger: popup?.trigger ?? ("tempo" as PopupTrigger),
    delaySec: String(popup?.delaySec ?? 8),
    scrollPct: String(popup?.scrollPct ?? 50),
    paths: (popup?.paths ?? []).join(", "),
    title: popup?.title ?? "",
    body: popup?.body ?? "",
    ctaLabel: popup?.ctaLabel ?? "",
    ctaHref: popup?.ctaHref ?? "",
    couponCode: popup?.couponCode ?? "",
    frequencyDays: String(popup?.frequencyDays ?? 7),
    active: popup?.active ?? false,
  });
  const [d, setD] = useState(init);
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  return (
    <FormModal
      title={popup ? popup.name : "Novo pop-up"}
      description="Aparece no máximo um por visita, e a mesma pessoa só o volta a ver passados os dias escolhidos."
      trigger={popup ? editButton : addButton("Novo pop-up")}
      open={open}
      setOpen={(v) => {
        setOpen(v);
        if (v) setD(init());
      }}
      pending={pending}
      onSave={() =>
        run(
          () =>
            savePopup(popup?.id ?? null, {
              ...d,
              delaySec: int(d.delaySec),
              scrollPct: int(d.scrollPct),
              frequencyDays: int(d.frequencyDays),
              paths: d.paths
                .split(/[,\s]+/)
                .map((p) => p.trim())
                .filter(Boolean),
            }),
          "Pop-up guardado.",
          () => setOpen(false),
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome (só no painel)" className="sm:col-span-2">
          <Input value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Título" className="sm:col-span-2">
          <Input
            value={d.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ex.: 10 % nos primeiros cartões"
          />
        </Field>
        <Field label="Texto (opcional)" className="sm:col-span-2">
          <Textarea value={d.body} onChange={(e) => set({ body: e.target.value })} className="min-h-20" />
        </Field>
        <Field label="Cupão a mostrar (opcional)">
          <Input value={d.couponCode} onChange={(e) => set({ couponCode: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Voltar a mostrar passados (dias)">
          <Input inputMode="numeric" value={d.frequencyDays} onChange={(e) => set({ frequencyDays: e.target.value })} />
        </Field>
        <Field label="Botão (opcional)">
          <Input
            value={d.ctaLabel}
            onChange={(e) => set({ ctaLabel: e.target.value })}
            placeholder="Ex.: Ver cartões"
          />
        </Field>
        <Field label="Ligação do botão">
          <Input
            value={d.ctaHref}
            onChange={(e) => set({ ctaHref: e.target.value })}
            placeholder="/orcamento/cartoes-de-visita"
          />
        </Field>
        <Field label="Quando aparece">
          <Select
            options={POPUP_TRIGGERS.map((t) => ({ value: t, label: POPUP_TRIGGER_LABELS[t] }))}
            value={d.trigger}
            onValueChange={(v) => set({ trigger: v as PopupTrigger })}
          />
        </Field>
        {d.trigger === "tempo" && (
          <Field label="Segundos">
            <Input inputMode="numeric" value={d.delaySec} onChange={(e) => set({ delaySec: e.target.value })} />
          </Field>
        )}
        {d.trigger === "scroll" && (
          <Field label="Percentagem da página">
            <Input inputMode="numeric" value={d.scrollPct} onChange={(e) => set({ scrollPct: e.target.value })} />
          </Field>
        )}
        <Field label="Páginas (opcional)" hint="Ex.: /, /orcamento. Vazio = todas." className="sm:col-span-2">
          <Input value={d.paths} onChange={(e) => set({ paths: e.target.value })} />
        </Field>
      </div>
      <Checkbox checked={d.active} onChange={(e) => set({ active: e.target.checked })}>
        Ativo no site
      </Checkbox>
    </FormModal>
  );
}
