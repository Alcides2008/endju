"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, Download, Info, Plus, Trash2 } from "lucide-react";
import { RegistrationMark } from "@/components/layout/logo";
import { Badge, OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropzone, UploadList, useUploads, type Uploader } from "@/components/ui/dropzone";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { formatKz } from "@/lib/domain/money";
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from "@/lib/domain/order-status";

// Pedidos de exemplo (clientes fictícios) para mostrar os componentes com conteúdo realista
const ORDERS: {
  number: string;
  customer: string;
  item: string;
  total: number;
  status: OrderStatus;
  payment: PaymentStatus;
}[] = [
  {
    number: "EDJ-2026-00412",
    customer: "Kianda Eventos",
    item: "Roll-up 85 × 200 cm · 4 un",
    total: 18696000,
    status: "em_producao",
    payment: "parcial",
  },
  {
    number: "EDJ-2026-00411",
    customer: "Farmácia Mutamba",
    item: "Flyers A5 · 2 000 un",
    total: 9804000,
    status: "em_aprovacao",
    payment: "pendente",
  },
  {
    number: "EDJ-2026-00409",
    customer: "Colégio Ngola Kiluanje",
    item: "Polos serigrafados · 120 un",
    total: 114000000,
    status: "em_design",
    payment: "parcial",
  },
  {
    number: "EDJ-2026-00406",
    customer: "Restaurante Ilha Azul",
    item: "Menus A4 laminados · 60 un",
    total: 7182000,
    status: "pronto",
    payment: "pago",
  },
  {
    number: "EDJ-2026-00398",
    customer: "Talatona Imobiliária",
    item: "Lona frontlit 6 × 3 m",
    total: 24510000,
    status: "entregue",
    payment: "pago",
  },
];

const FORMATS = [
  { value: "cartao", label: "Cartão de visita", hint: "85 × 55 mm" },
  { value: "a5", label: "Flyer A5", hint: "148 × 210 mm" },
  { value: "a4", label: "Folha A4", hint: "210 × 297 mm" },
  { value: "rollup", label: "Roll-up", hint: "85 × 200 cm" },
  { value: "lona", label: "Lona por medida", hint: "Largura × altura em cm" },
];

const SWATCHES: { group: string; items: { token: string; label: string; className: string; use: string }[] }[] = [
  {
    group: "Superfícies",
    items: [
      { token: "--paper", label: "Papel", className: "bg-paper", use: "Fundo da página" },
      { token: "--paper-2", label: "Papel 2", className: "bg-paper-2", use: "Zonas rebaixadas, cabeçalhos de tabela" },
      { token: "--card", label: "Cartão", className: "bg-card", use: "Cartões, campos, janelas" },
    ],
  },
  {
    group: "Tinta",
    items: [
      { token: "--ink", label: "Tinta", className: "bg-ink", use: "Texto principal, botão escuro" },
      { token: "--ink-2", label: "Tinta 2", className: "bg-ink-2", use: "Texto secundário" },
      { token: "--ink-3", label: "Tinta 3", className: "bg-ink-3", use: "Legendas, placeholders" },
    ],
  },
  {
    group: "Marca (provisória)",
    items: [
      { token: "--brand", label: "Magenta Endju", className: "bg-brand", use: "Ação principal, destaques" },
      { token: "--brand-strong", label: "Magenta forte", className: "bg-brand-strong", use: "Hover, texto de marca" },
    ],
  },
  {
    group: "Processo CMYK",
    items: [
      { token: "--process-cyan", label: "Cyan", className: "bg-process-cyan", use: "Detalhes gráficos" },
      { token: "--process-magenta", label: "Magenta", className: "bg-process-magenta", use: "Detalhes gráficos" },
      { token: "--process-yellow", label: "Amarelo", className: "bg-process-yellow", use: "Detalhes gráficos" },
    ],
  },
  {
    group: "Estados",
    items: [
      { token: "--success", label: "Sucesso", className: "bg-success", use: "Pago, pronto, aprovado" },
      { token: "--warning", label: "Atenção", className: "bg-warning", use: "Por aprovar, por pagar" },
      { token: "--danger", label: "Erro", className: "bg-danger", use: "Cancelado, recusado" },
      { token: "--info", label: "Informação", className: "bg-info", use: "Recebido, em análise" },
    ],
  },
];

// Classes completas: o Tailwind não deteta nomes montados em runtime
const TYPE_SCALE = [
  { className: "text-display-2xl", sample: "Lonas que param o trânsito." },
  { className: "text-display-xl", sample: "Branding com assinatura." },
  { className: "text-display-lg", sample: "Do ficheiro à entrega." },
  { className: "text-display-md", sample: "Cartões de visita com relevo" },
  { className: "text-display-sm", sample: "Prova v2 pronta para aprovação" },
];

/** Lê o ficheiro no próprio browser para mostrar o progresso real; o envio para o Storage chega na Etapa 4. */
const readLocally: Uploader = (file, onProgress, signal) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    reader.onload = () => resolve();
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    signal.addEventListener("abort", () => reader.abort());
    reader.readAsArrayBuffer(file);
  });

function Section({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-8 border-t border-line py-14 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
      <header className="space-y-3 lg:sticky lg:top-28 lg:self-start">
        <p className="eyebrow text-ink-3">{index}</p>
        <h2 className="text-display-sm font-bold">{title}</h2>
        {description && <p className="text-sm text-ink-2">{description}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Showcase() {
  const [format, setFormat] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const uploads = useUploads(readLocally);

  return (
    <div className="container-page pt-32 pb-section">
      <header className="max-w-4xl space-y-6 pb-14">
        <p className="flex items-center gap-3 eyebrow text-ink-2">
          <RegistrationMark className="text-brand" /> Design system · Fundação v0.1
        </p>
        <h1 className="text-display-xl font-extrabold [font-stretch:82%]">Tinta, papel e precisão.</h1>
        <p className="max-w-2xl text-lg text-ink-2">
          A base visual da ENDJU: fundo de papel não revestido, tinta quase preta e o magenta de processo como cor de
          ação. A cor de marca é provisória e muda num só sítio quando chegar o logótipo oficial.
        </p>
      </header>

      <Section index="01" title="Cores" description="Tokens em src/app/globals.css. Todos mudam no tema escuro.">
        <div className="space-y-10">
          {SWATCHES.map((group) => (
            <div key={group.group}>
              <p className="mb-4 eyebrow text-ink-3">{group.group}</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {group.items.map((swatch) => (
                  <li key={swatch.token} className="overflow-hidden rounded-sm border border-line bg-card">
                    <div className={`h-20 border-b border-line ${swatch.className}`} />
                    <div className="space-y-1 p-3">
                      <p className="text-sm font-medium">{swatch.label}</p>
                      <p className="font-mono text-[0.6875rem] text-ink-3">{swatch.token}</p>
                      <p className="text-xs text-ink-2">{swatch.use}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section
        index="02"
        title="Tipografia"
        description="Bricolage Grotesque (títulos, com largura e tamanho ótico variáveis), Instrument Sans (texto) e IBM Plex Mono (dados técnicos)."
      >
        <div className="space-y-8">
          {TYPE_SCALE.map((step) => (
            <div
              key={step.className}
              className="grid gap-2 border-b border-line pb-8 md:grid-cols-[9rem_minmax(0,1fr)] md:items-baseline"
            >
              <span className="font-mono text-xs text-ink-3">{step.className}</span>
              <p className={`font-display font-bold ${step.className}`}>{step.sample}</p>
            </div>
          ))}
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <span className="font-mono text-xs text-ink-3">Texto · 17 px</span>
              <p className="text-lg text-ink-2">
                Impressão em couché mate de 350 g, laminação suave ao toque e cantos arredondados. Pronto em 48 horas
                úteis depois de aprovares a prova.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-xs text-ink-3">Texto pequeno · 14 px</span>
              <p className="text-sm text-ink-2">
                Os ficheiros devem ter 3 mm de sangria, 300 dpi no tamanho final e cores em CMYK.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-xs text-ink-3">Eyebrow / mono</span>
              <p className="eyebrow text-ink">Sangria 3 mm · 300 dpi · CMYK</p>
              <p className="font-mono text-sm">EDJ-2026-00412</p>
            </div>
          </div>
        </div>
      </Section>

      <Section index="03" title="Botões" description="Pill para ações; o cursor reage a todos.">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Pedir orçamento <ArrowUpRight aria-hidden />
            </Button>
            <Button variant="ink">Ver trabalhos</Button>
            <Button variant="outline">
              <Download aria-hidden /> Descarregar fatura
            </Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">
              <Trash2 aria-hidden /> Eliminar
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
            <Button size="icon" variant="outline" aria-label="Adicionar item">
              <Plus aria-hidden />
            </Button>
            <Button loading>A enviar</Button>
            <Button disabled variant="outline">
              Indisponível
            </Button>
          </div>
        </div>
      </Section>

      <Section
        index="04"
        title="Formulários"
        description="Rótulo, ajuda e erro ligados por aria. Funcionam com React Hook Form."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Nome da empresa" hint="Aparece na fatura.">
            <Input placeholder="Kianda Eventos, Lda." />
          </Field>
          <Field label="NIF" error="O NIF de empresa tem 10 dígitos.">
            <Input defaultValue="54170" inputMode="numeric" />
          </Field>
          <Field label="Formato">
            <Select options={FORMATS} value={format} onValueChange={setFormat} placeholder="Escolhe o formato" />
          </Field>
          <Field label="Quantidade" hint="Mínimo 100 unidades.">
            <Input type="number" defaultValue={500} min={100} step={100} />
          </Field>
          <Field label="Notas para o designer" className="md:col-span-2">
            <Textarea placeholder="Ex.: usar o azul do logótipo e deixar o verso só com o QR code do Instagram." />
          </Field>
          <Checkbox className="md:col-span-2">Preciso que a Endju crie o design</Checkbox>
        </div>
      </Section>

      <Section
        index="05"
        title="Estados"
        description="Cada estado do pedido e do pagamento tem uma cor e um rótulo fixos."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((status) => (
              <OrderStatusBadge key={status} status={status} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUSES.map((status) => (
              <PaymentStatusBadge key={status} status={status} />
            ))}
            <Badge tone="brand">Urgente</Badge>
            <Badge>VIP</Badge>
          </div>
        </div>
      </Section>

      <Section index="06" title="Separadores e dicas">
        <Tabs defaultValue="ativos">
          <TabsList>
            <TabsTrigger value="ativos">Ativos (3)</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos (2)</TabsTrigger>
            <TabsTrigger value="cancelados">Cancelados (0)</TabsTrigger>
          </TabsList>
          <TabsContent value="ativos">
            <p className="flex items-center gap-2 text-ink-2">
              3 pedidos em curso, total {formatKz(142500000)}
              <Tooltip content="Valores com IVA de 14 % incluído.">
                <button type="button" aria-label="Sobre os valores" className="text-ink-3 hover:text-ink">
                  <Info className="size-4" />
                </button>
              </Tooltip>
            </p>
          </TabsContent>
          <TabsContent value="concluidos">
            <p className="text-ink-2">2 pedidos entregues nos últimos 30 dias.</p>
          </TabsContent>
          <TabsContent value="cancelados">
            <p className="text-ink-2">Nenhum pedido cancelado.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section index="07" title="Janelas e avisos" description="Modal e painel lateral (Radix), toasts (Sonner).">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Cancelar pedido
          </Button>
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Cancelar o pedido EDJ-2026-00411?"
            description="O pedido ainda não entrou em produção. O cliente recebe um aviso por email e WhatsApp."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Manter pedido
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setModalOpen(false);
                    toast.success("Pedido EDJ-2026-00411 cancelado", {
                      description: "Farmácia Mutamba foi notificada.",
                    });
                  }}
                >
                  Cancelar pedido
                </Button>
              </>
            }
          >
            <Field label="Motivo">
              <Textarea defaultValue="Cliente vai reutilizar os flyers da campanha anterior." />
            </Field>
          </Modal>
          <Drawer
            trigger={<Button variant="outline">Ver detalhe</Button>}
            title="EDJ-2026-00412"
            description="Kianda Eventos · entrega em Talatona"
            footer={<Button className="flex-1">Marcar como pronto</Button>}
          >
            <dl className="space-y-4 text-sm">
              {[
                ["Item", "Roll-up 85 × 200 cm · 4 un"],
                ["Prazo", "Quinta-feira, 30 de outubro"],
                ["Total", formatKz(18696000)],
                ["Pago", `${formatKz(9348000)} (sinal 50 %)`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-line pb-3">
                  <dt className="text-ink-3">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Drawer>
          <Button
            variant="ghost"
            onClick={() => toast.success("Prova v2 aprovada", { description: "EDJ-2026-00412 segue para produção." })}
          >
            Toast de sucesso
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast.error("Pagamento recusado", { description: "O cliente cancelou no Multicaixa Express." })
            }
          >
            Toast de erro
          </Button>
        </div>
      </Section>

      <Section
        index="08"
        title="Tabela"
        description="Base da tabela do painel; filtros e ordenação chegam com TanStack na Etapa 6."
      >
        <Table>
          <THead>
            <tr>
              <TH>Pedido</TH>
              <TH>Cliente</TH>
              <TH>Item</TH>
              <TH className="text-right">Total</TH>
              <TH>Estado</TH>
              <TH>Pagamento</TH>
            </tr>
          </THead>
          <TBody>
            {ORDERS.map((order) => (
              <TR key={order.number}>
                <TD className="font-mono text-xs">{order.number}</TD>
                <TD className="font-medium">{order.customer}</TD>
                <TD className="text-ink-2">{order.item}</TD>
                <TD className="text-right font-mono text-xs">{formatKz(order.total)}</TD>
                <TD>
                  <OrderStatusBadge status={order.status} />
                </TD>
                <TD>
                  <PaymentStatusBadge status={order.payment} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>

      <Section index="09" title="Carregamento">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="space-y-3 rounded-sm border border-line bg-card p-4">
              <Skeleton className="aspect-[4/3]" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </Section>

      <Section
        index="10"
        title="Upload de ficheiros"
        description="Arrastar e largar, validação de formato e tamanho, progresso por ficheiro."
      >
        <Dropzone accept={["pdf", "ai", "psd", "png", "jpg"]} maxSizeMb={500} onFiles={uploads.add} />
        <UploadList items={uploads.items} onRemove={uploads.remove} onRetry={uploads.retry} />
      </Section>
    </div>
  );
}
