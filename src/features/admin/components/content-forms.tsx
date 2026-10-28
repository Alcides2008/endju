"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import {
  BANNER_PLACEMENTS,
  FAQ_CATEGORIES,
  PLACEMENT_LABELS,
  SECTORS,
  type PostBlock,
  type PostDoc,
  type ProjectDoc,
  type PublishStatus,
} from "@/lib/domain/content";
import { parseDecimal } from "@/lib/domain/money";
import { slugify } from "@/lib/domain/search";
import type { Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import {
  createDraft,
  deleteContent,
  importContent,
  saveContent,
  saveRecord,
  setContentStatus,
  type RecordKind,
} from "../content-actions";
import { MediaField } from "./media-field";
import { useRun } from "./order-admin-panel";

type Kind = "projects" | "posts";
const EMPTY: Media = { src: "", alt: "" };
const orNull = (m: Media | null | undefined) => (m?.src ? m : null);
const iconButton = "grid size-9 shrink-0 place-items-center rounded-sm text-ink-3 hover:bg-paper-2 hover:text-ink";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-sm border border-line bg-card p-5">
      <div className="space-y-1">
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function ImportContentButton() {
  const { pending, run } = useRun();
  return (
    <Button loading={pending} onClick={() => run(importContent, "Conteúdos importados para o Firestore.")}>
      Importar os conteúdos do site
    </Button>
  );
}

export function NewDraftButton({ kind, label }: { kind: Kind; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      loading={pending}
      onClick={async () => {
        setPending(true);
        const result = await createDraft(kind);
        setPending(false);
        if (!result.ok) return void toast.error(result.message);
        router.push(kind === "projects" ? `/admin/portfolio/${result.id}` : `/admin/conteudo/blog/${result.id}`);
      }}
    >
      <Plus aria-hidden /> {label}
    </Button>
  );
}

/** Publicar / voltar a rascunho / apagar, no cabeçalho do editor. */
export function ContentStatusActions({
  kind,
  id,
  status,
  canPublish,
  canDelete,
}: {
  kind: Kind;
  id: string;
  status: PublishStatus;
  canPublish: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useRun();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {canPublish &&
        (status === "rascunho" ? (
          <Button
            size="sm"
            loading={pending}
            onClick={() => run(() => setContentStatus(kind, id, "publicado"), "Publicado no site.")}
          >
            Publicar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            loading={pending}
            onClick={() => run(() => setContentStatus(kind, id, "rascunho"), "Saiu do site; ficou em rascunho.")}
          >
            Voltar a rascunho
          </Button>
        ))}
      {canDelete && (
        <Modal
          open={confirm}
          onOpenChange={setConfirm}
          title="Apagar de vez?"
          description="Não há volta atrás. Para tirar do site e guardar, usa antes Voltar a rascunho."
          trigger={
            <Button size="sm" variant="ghost">
              Apagar
            </Button>
          }
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={pending}
                onClick={() =>
                  run(
                    () => deleteContent(kind, id),
                    "Apagado.",
                    () => router.push(kind === "projects" ? "/admin/portfolio" : "/admin/conteudo/blog"),
                  )
                }
              >
                Apagar
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}

function SlugField({ value, onChange, title }: { value: string; onChange: (v: string) => void; title: string }) {
  return (
    <Field label="Endereço no site" hint="Minúsculas, números e hífenes.">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-12 shrink-0"
          onClick={() => onChange(slugify(title))}
        >
          Do título
        </Button>
      </div>
    </Field>
  );
}

function SaveBar({ pending, published, canPublish }: { pending: boolean; published: boolean; canPublish: boolean }) {
  return (
    <div className="sticky bottom-4 flex items-center justify-end gap-3">
      {published && !canPublish && (
        <p className="rounded-full bg-card px-3 py-1.5 text-xs text-ink-2 shadow-paper">
          Publicado: só o Gestor altera.
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} disabled={published && !canPublish} className="shadow-lift">
        {published ? "Guardar (fica logo no site)" : "Guardar rascunho"}
      </Button>
    </div>
  );
}

// ── Portfólio ──

const VIDEOS = [
  "efai-saude",
  "fachada-atelier",
  "fachada-pecas-auto",
  "nkento-stuff",
  "prado-os-kambas",
  "ultra-cardio-totem",
  "zuka-kissewas",
  "equipamentos-basquetebol",
  "bones-bordados",
  "t-shirts-jiu-jitsu",
  "trofeus-premios",
];

export function ProjectForm({
  project,
  services,
  canEdit,
  canPublish,
}: {
  project: ProjectDoc & { id: string };
  services: { slug: string; name: string }[];
  canEdit: boolean;
  canPublish: boolean;
}) {
  const [d, setD] = useState({ ...project, posterTime: String(project.video?.posterTime ?? 0).replace(".", ",") });
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  const published = project.status === "publicado";
  const videoName = d.video?.src.replace(/^\/portfolio\/|\.mp4$/g, "") ?? "";

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const { id: _id, status: _s, posterTime, ...rest } = d;
        run(
          () =>
            saveContent("projects", project.id, {
              ...rest,
              video: rest.video ? { ...rest.video, posterTime: parseDecimal(posterTime || "0") || 0 } : null,
            }),
          published ? "Guardado. O site já mostra a mudança." : "Rascunho guardado.",
        );
      }}
    >
      <fieldset disabled={!canEdit || (published && !canPublish)} className="space-y-6">
        <Section title="Cartão do projeto">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título" className="sm:col-span-2">
              <Input value={d.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <SlugField value={d.slug} onChange={(slug) => set({ slug })} title={d.title} />
            <Field label="Ordem na lista">
              <Input
                inputMode="numeric"
                value={String(d.sortOrder)}
                onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Resumo no cartão" className="sm:col-span-2">
              <Textarea value={d.summary} onChange={(e) => set({ summary: e.target.value })} className="min-h-20" />
            </Field>
            <Field label="Cliente">
              <Input value={d.clientName} onChange={(e) => set({ clientName: e.target.value })} />
            </Field>
            <Field label="Setor">
              <Select
                options={SECTORS.map((s) => ({ value: s, label: s }))}
                value={d.sector}
                onValueChange={(v) => set({ sector: v as typeof d.sector })}
              />
            </Field>
          </div>
          <Checkbox checked={d.clientVisible} onChange={(e) => set({ clientVisible: e.target.checked })}>
            O cliente autorizou mostrar o nome (sem autorização, o site mostra só o setor)
          </Checkbox>
          <Checkbox checked={d.featured} onChange={(e) => set({ featured: e.target.checked })}>
            Destaque na Home (aparecem os 4 primeiros)
          </Checkbox>
          <div className="space-y-2">
            <p className="text-sm font-medium">Serviços (são os filtros do portfólio)</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {services.map((s) => (
                <Checkbox
                  key={s.slug}
                  checked={d.serviceSlugs.includes(s.slug)}
                  onChange={(e) =>
                    set({
                      serviceSlugs: e.target.checked
                        ? [...d.serviceSlugs, s.slug]
                        : d.serviceSlugs.filter((x) => x !== s.slug),
                    })
                  }
                >
                  {s.name}
                </Checkbox>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Imagens" hint="A capa aparece no cartão; o vídeo, quando há, toca ao passar o rato.">
          <MediaField label="Capa" value={orNull(d.cover)} onChange={(m) => set({ cover: m ?? EMPTY })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vídeo da oficina (opcional)">
              <Select
                options={[{ value: "sem", label: "Sem vídeo" }, ...VIDEOS.map((v) => ({ value: v, label: v }))]}
                value={videoName || "sem"}
                onValueChange={(v) =>
                  set({
                    video: v === "sem" ? null : { src: `/portfolio/${v}.mp4`, posterTime: d.video?.posterTime ?? 0 },
                  })
                }
              />
            </Field>
            {d.video && (
              <Field label="Segundo da imagem de espera" hint="Momento do vídeo que serve de capa antes de tocar.">
                <Input inputMode="decimal" value={d.posterTime} onChange={(e) => set({ posterTime: e.target.value })} />
              </Field>
            )}
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium">Galeria</p>
            {d.gallery.map((m, i) => (
              <div key={i} className="flex items-start gap-2 border-b border-line pb-4">
                <div className="flex-1">
                  <MediaField
                    label={`Imagem ${i + 1}`}
                    value={m}
                    allowEmpty={false}
                    onChange={(next) => next && set({ gallery: d.gallery.map((g, j) => (j === i ? next : g)) })}
                  />
                </div>
                <button
                  type="button"
                  className={iconButton}
                  aria-label="Tirar da galeria"
                  onClick={() => set({ gallery: d.gallery.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                set({ gallery: [...d.gallery, orNull(d.cover) ?? { src: "asset:portfolio/loja-endju-dia", alt: "" }] })
              }
            >
              <Plus aria-hidden /> Juntar imagem
            </Button>
          </div>
          <Checkbox
            checked={Boolean(d.beforeAfter)}
            onChange={(e) =>
              set({
                beforeAfter: e.target.checked
                  ? {
                      before: { ...(orNull(d.cover) ?? EMPTY), label: "Antes" },
                      after: { ...(orNull(d.cover) ?? EMPTY), label: "Depois" },
                    }
                  : null,
              })
            }
          >
            Mostrar antes e depois (deslizar entre as duas imagens)
          </Checkbox>
          {d.beforeAfter && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["before", "after"] as const).map((side) => (
                <div key={side} className="space-y-2">
                  <MediaField
                    label={side === "before" ? "Antes" : "Depois"}
                    allowEmpty={false}
                    value={orNull(d.beforeAfter![side])}
                    onChange={(m) =>
                      m &&
                      set({ beforeAfter: { ...d.beforeAfter!, [side]: { ...m, label: d.beforeAfter![side].label } } })
                    }
                  />
                  <Input
                    aria-label="Etiqueta"
                    value={d.beforeAfter![side].label}
                    onChange={(e) =>
                      set({
                        beforeAfter: { ...d.beforeAfter!, [side]: { ...d.beforeAfter![side], label: e.target.value } },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="História" hint="O que o cliente precisava, o que fizemos e como ficou.">
          <Field label="Desafio">
            <Textarea value={d.challenge} onChange={(e) => set({ challenge: e.target.value })} />
          </Field>
          <Field label="Solução">
            <Textarea value={d.solution} onChange={(e) => set({ solution: e.target.value })} />
          </Field>
          <Field label="Resultado">
            <Textarea value={d.result} onChange={(e) => set({ result: e.target.value })} />
          </Field>
        </Section>
      </fieldset>
      {canEdit && <SaveBar pending={pending} published={published} canPublish={canPublish} />}
    </form>
  );
}

// ── Blog ──

const BLOCK_LABELS: Record<PostBlock["type"], string> = { p: "Parágrafo", h2: "Subtítulo", ul: "Lista", tip: "Dica" };

type BlockDraft = { type: PostBlock["type"]; text: string };
const toDraft = (b: PostBlock): BlockDraft => ({ type: b.type, text: b.type === "ul" ? b.items.join("\n") : b.text });
const fromDraft = (b: BlockDraft): PostBlock =>
  b.type === "ul"
    ? {
        type: "ul",
        items: b.text
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
      }
    : { type: b.type, text: b.text.trim() };

export function PostForm({
  post,
  canEdit,
  canPublish,
}: {
  post: PostDoc & { id: string };
  canEdit: boolean;
  canPublish: boolean;
}) {
  const [d, setD] = useState({ ...post, tagsText: post.tags.join(", "), drafts: post.blocks.map(toDraft) });
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }));
  const { pending, run } = useRun();
  const published = post.status === "publicado";
  const setBlock = (i: number, patch: Partial<BlockDraft>) =>
    set({ drafts: d.drafts.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const move = (i: number, by: number) => {
    const next = [...d.drafts];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set({ drafts: next });
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveContent("posts", post.id, {
              slug: d.slug,
              title: d.title,
              excerpt: d.excerpt,
              cover: d.cover,
              tags: d.tagsText
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              publishedAt: d.publishedAt,
              author: d.author,
              blocks: d.drafts.filter((b) => b.text.trim()).map(fromDraft),
            }),
          published ? "Guardado. O site já mostra a mudança." : "Rascunho guardado.",
        );
      }}
    >
      <fieldset disabled={!canEdit || (published && !canPublish)} className="space-y-6">
        <Section title="Artigo">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título" className="sm:col-span-2">
              <Input value={d.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <SlugField value={d.slug} onChange={(slug) => set({ slug })} title={d.title} />
            <Field label="Data do artigo">
              <Input type="date" value={d.publishedAt} onChange={(e) => set({ publishedAt: e.target.value })} />
            </Field>
            <Field label="Autor">
              <Input value={d.author} onChange={(e) => set({ author: e.target.value })} />
            </Field>
            <Field label="Etiquetas" hint="Separadas por vírgulas; a primeira aparece na lista.">
              <Input value={d.tagsText} onChange={(e) => set({ tagsText: e.target.value })} />
            </Field>
            <Field label="Resumo" className="sm:col-span-2">
              <Textarea value={d.excerpt} onChange={(e) => set({ excerpt: e.target.value })} className="min-h-20" />
            </Field>
          </div>
          <MediaField label="Capa" value={orNull(d.cover)} onChange={(m) => set({ cover: m ?? EMPTY })} />
        </Section>

        <Section title="Texto" hint="Blocos por ordem. Numa lista, cada linha é um ponto.">
          <ol className="space-y-4">
            {d.drafts.map((block, i) => (
              <li key={i} className="space-y-2 rounded-sm border border-line p-3">
                <div className="flex items-center gap-2">
                  <Select
                    className="max-w-44"
                    aria-label="Tipo de bloco"
                    options={Object.entries(BLOCK_LABELS).map(([value, label]) => ({ value, label }))}
                    value={block.type}
                    onValueChange={(type) => setBlock(i, { type: type as BlockDraft["type"] })}
                  />
                  <span className="flex-1" />
                  <button
                    type="button"
                    className={iconButton}
                    aria-label="Subir"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label="Descer"
                    disabled={i === d.drafts.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={cn(iconButton, "hover:text-danger")}
                    aria-label="Tirar bloco"
                    onClick={() => set({ drafts: d.drafts.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
                {block.type === "h2" ? (
                  <Input
                    aria-label="Subtítulo"
                    value={block.text}
                    onChange={(e) => setBlock(i, { text: e.target.value })}
                  />
                ) : (
                  <Textarea
                    aria-label={BLOCK_LABELS[block.type]}
                    value={block.text}
                    onChange={(e) => setBlock(i, { text: e.target.value })}
                  />
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BLOCK_LABELS) as BlockDraft["type"][]).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => set({ drafts: [...d.drafts, { type, text: "" }] })}
              >
                <Plus aria-hidden /> {BLOCK_LABELS[type]}
              </Button>
            ))}
          </div>
        </Section>
      </fieldset>
      {canEdit && <SaveBar pending={pending} published={published} canPublish={canPublish} />}
    </form>
  );
}

// ── Listas simples (FAQ, testemunhos, banners): uma linha editável por registo ──

export type RecordField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date" | "number";
  options?: { value: string; label: string }[];
  hint?: string;
  wide?: boolean;
};

type Row = Record<string, string | boolean | number>;

function RecordCard({
  kind,
  id,
  fields,
  initial,
  toInput,
  canSave,
  canDelete,
  onCreated,
}: {
  kind: RecordKind;
  id: string | null;
  fields: RecordField[];
  initial: Row;
  toInput: (row: Row) => unknown;
  canSave: boolean;
  canDelete: boolean;
  onCreated?: () => void;
}) {
  const [row, setRow] = useState(initial);
  const { pending, run } = useRun();
  const dirty = JSON.stringify(row) !== JSON.stringify(initial);
  return (
    <form
      className={cn("space-y-4 rounded-sm border bg-card p-4", id ? "border-line" : "border-dashed border-ink/30")}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveRecord(kind, id, toInput(row)),
          id ? "Guardado. O site já mostra a mudança." : "Criado.",
          onCreated,
        );
      }}
    >
      <fieldset disabled={!canSave} className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) =>
          f.type === "checkbox" ? (
            <Checkbox
              key={f.key}
              checked={Boolean(row[f.key])}
              onChange={(e) => setRow({ ...row, [f.key]: e.target.checked })}
              className="sm:col-span-2"
            >
              {f.label}
            </Checkbox>
          ) : (
            <Field
              key={f.key}
              label={f.label}
              hint={f.hint}
              className={f.wide || f.type === "textarea" ? "sm:col-span-2" : undefined}
            >
              {f.type === "select" ? (
                <Select
                  options={f.options ?? []}
                  value={String(row[f.key])}
                  onValueChange={(v) => setRow({ ...row, [f.key]: v })}
                />
              ) : f.type === "textarea" ? (
                <Textarea
                  value={String(row[f.key] ?? "")}
                  onChange={(e) => setRow({ ...row, [f.key]: e.target.value })}
                  className="min-h-20"
                />
              ) : (
                <Input
                  type={f.type === "date" ? "date" : "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  value={String(row[f.key] ?? "")}
                  onChange={(e) => setRow({ ...row, [f.key]: e.target.value })}
                />
              )}
            </Field>
          ),
        )}
      </fieldset>
      {canSave && (
        <div className="flex items-center justify-end gap-2">
          {id && canDelete && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={() =>
                window.confirm("Apagar de vez? Não há volta atrás.") && run(() => deleteContent(kind, id), "Apagado.")
              }
            >
              Apagar
            </Button>
          )}
          <Button type="submit" size="sm" loading={pending} disabled={id ? !dirty : false}>
            {id ? "Guardar" : "Criar"}
          </Button>
        </div>
      )}
    </form>
  );
}

const num = (v: Row[string]) => Number(String(v).replace(",", ".")) || 0;

/** Campos, linha vazia e conversão de cada lista (fica aqui: funções não passam do servidor para o browser). */
const RECORD_FORMS: Record<
  RecordKind,
  {
    fields: RecordField[];
    blank: Row;
    toRow: (doc: Record<string, unknown>) => Row;
    toInput: (row: Row) => unknown;
    addLabel: string;
  }
> = {
  faqs: {
    addLabel: "Nova pergunta",
    fields: [
      { key: "question", label: "Pergunta", type: "text", wide: true },
      { key: "answer", label: "Resposta", type: "textarea" },
      {
        key: "category",
        label: "Tema",
        type: "select",
        options: FAQ_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
      },
      { key: "sortOrder", label: "Ordem", type: "number" },
      { key: "active", label: "Visível no site", type: "checkbox" },
    ],
    blank: { question: "", answer: "", category: "encomendas", sortOrder: "999", active: true },
    toRow: (d) => ({
      question: String(d.question),
      answer: String(d.answer),
      category: String(d.category),
      sortOrder: String(d.sortOrder),
      active: Boolean(d.active),
    }),
    toInput: (r) => ({ ...r, sortOrder: num(r.sortOrder) }),
  },
  testimonials: {
    addLabel: "Novo testemunho",
    fields: [
      { key: "quote", label: "Testemunho", type: "textarea" },
      { key: "name", label: "Nome", type: "text" },
      { key: "role", label: "Cargo", type: "text" },
      { key: "company", label: "Empresa", type: "text" },
      { key: "sortOrder", label: "Ordem", type: "number" },
      { key: "active", label: "Visível na Home", type: "checkbox" },
      {
        key: "example",
        label: "É um exemplo do briefing (trocar por um testemunho real antes de publicar o site)",
        type: "checkbox",
      },
    ],
    blank: { quote: "", name: "", role: "", company: "", sortOrder: "999", active: true, example: false },
    toRow: (d) => ({
      quote: String(d.quote),
      name: String(d.name),
      role: String(d.role ?? ""),
      company: String(d.company ?? ""),
      sortOrder: String(d.sortOrder),
      active: Boolean(d.active),
      example: Boolean(d.example),
    }),
    toInput: (r) => ({ ...r, sortOrder: num(r.sortOrder) }),
  },
  banners: {
    addLabel: "Novo banner",
    fields: [
      { key: "title", label: "Título", type: "text", wide: true },
      { key: "body", label: "Texto (opcional)", type: "textarea" },
      {
        key: "placement",
        label: "Onde aparece",
        type: "select",
        options: BANNER_PLACEMENTS.map((p) => ({ value: p, label: PLACEMENT_LABELS[p] })),
      },
      { key: "ctaLabel", label: "Botão (opcional)", type: "text", hint: "Ex.: Pedir orçamento" },
      { key: "ctaHref", label: "Ligação do botão", type: "text", hint: "Ex.: /orcamento ou https://…" },
      { key: "startsAt", label: "A partir de (opcional)", type: "date" },
      { key: "endsAt", label: "Até (opcional)", type: "date" },
      { key: "active", label: "Ativo (aparece nas datas escolhidas)", type: "checkbox" },
    ],
    blank: {
      title: "",
      body: "",
      placement: "site_topbar",
      ctaLabel: "",
      ctaHref: "",
      startsAt: "",
      endsAt: "",
      active: true,
    },
    toRow: (d) => {
      const cta = d.cta as { label: string; href: string } | null;
      return {
        title: String(d.title),
        body: String(d.body ?? ""),
        placement: String(d.placement),
        ctaLabel: cta?.label ?? "",
        ctaHref: cta?.href ?? "",
        startsAt: String(d.startsAt ?? ""),
        endsAt: String(d.endsAt ?? ""),
        active: Boolean(d.active),
      };
    },
    toInput: ({ ctaLabel, ctaHref, ...r }) => ({
      ...r,
      cta: String(ctaLabel).trim() || String(ctaHref).trim() ? { label: ctaLabel, href: ctaHref } : null,
    }),
  },
};

export function RecordsEditor({
  kind,
  docs,
  canCreate,
  canSave,
  canDelete,
}: {
  kind: RecordKind;
  docs: (Record<string, unknown> & { id: string })[];
  canCreate: boolean;
  canSave: boolean;
  canDelete: boolean;
}) {
  const { fields, blank, toRow, toInput, addLabel } = RECORD_FORMS[kind];
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      {canCreate &&
        (adding ? (
          <RecordCard
            kind={kind}
            id={null}
            fields={fields}
            initial={blank}
            toInput={toInput}
            canSave
            canDelete={false}
            onCreated={() => setAdding(false)}
          />
        ) : (
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {addLabel}
          </Button>
        ))}
      {docs.map((doc) => {
        const row = toRow(doc);
        return (
          <RecordCard
            key={doc.id + JSON.stringify(row)}
            kind={kind}
            id={doc.id}
            fields={fields}
            initial={row}
            toInput={toInput}
            canSave={canSave}
            canDelete={canDelete}
          />
        );
      })}
    </div>
  );
}
