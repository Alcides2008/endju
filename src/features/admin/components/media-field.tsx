"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toaster";
import { ASSETS } from "@/content/assets";
import { ASSET_KEYS, type Media } from "@/lib/media";
import { cn } from "@/lib/utils";
import { listUploadedMedia, saveUploadedMedia, signSiteUpload } from "../media-actions";

// Limite do plano gratuito do Cloudinary para imagens
const MAX_MB = 10;

function Thumb({ media }: { media: Media }) {
  const asset = media.src.startsWith("asset:") ? ASSETS[media.src.slice(6)] : null;
  return asset ? (
    <Image src={asset} alt="" fill sizes="160px" className="object-cover" />
  ) : (
    <Image src={media.src} alt="" fill sizes="160px" className="object-cover" />
  );
}

/** Envia a imagem direto para o Cloudinary com a assinatura do servidor e regista-a na biblioteca. */
async function upload(file: File, alt: string): Promise<Media> {
  if (!file.type.startsWith("image/")) throw new Error("Escolhe uma imagem (JPG, PNG ou WebP).");
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Imagem maior que ${MAX_MB} MB. Exporta-a mais leve.`);
  const sign = await signSiteUpload();
  if (!sign.ok) throw new Error(sign.message);
  const { signed } = sign;
  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(signed.fields)) body.append(key, String(value));
  const response = await fetch(signed.url, { method: "POST", body });
  const data = (await response.json()) as {
    public_id?: string;
    format?: string;
    width?: number;
    height?: number;
    error?: { message: string };
  };
  if (!response.ok || !data.public_id) throw new Error(data.error?.message ?? "O Cloudinary recusou a imagem.");
  const saved = await saveUploadedMedia({
    publicId: data.public_id,
    format: (data.format ?? "jpg") as "jpg",
    width: data.width ?? 1,
    height: data.height ?? 1,
    alt,
  });
  if (!saved.ok) throw new Error(saved.message);
  return saved.media;
}

/** Imagem de um conteúdo: escolhida na biblioteca (fotografias do site e as já carregadas) ou carregada agora. */
export function MediaField({
  value,
  onChange,
  label = "Imagem",
  allowEmpty = true,
}: {
  value: Media | null;
  onChange: (media: Media | null) => void;
  label?: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<{ cloudinary: boolean; items: Media[] } | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !library) void listUploadedMedia().then(setLibrary);
  }, [open, library]);

  const choose = (media: Media) => {
    onChange({ ...media, alt: value?.alt || media.alt });
    setOpen(false);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      try {
        const media = await upload(file, value?.alt ?? "");
        setLibrary((lib) => (lib ? { ...lib, items: [media, ...lib.items] } : lib));
        choose(media);
        toast.success("Imagem carregada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível carregar a imagem.");
      }
    });
  };

  const tile = (media: Media, key: string) => (
    <li key={key}>
      <button
        type="button"
        onClick={() => choose(media)}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-xs border-2",
          value?.src === media.src ? "border-brand" : "border-transparent hover:border-ink/40",
        )}
        aria-label={media.alt || key}
      >
        <Thumb media={media} />
      </button>
    </li>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative grid aspect-[4/3] w-36 shrink-0 place-items-center overflow-hidden rounded-sm border border-line bg-paper-2 hover:border-ink/40"
          aria-label="Escolher imagem"
        >
          {value ? <Thumb media={value} /> : <ImageIcon className="size-6 text-ink-3" aria-hidden />}
        </button>
        <div className="flex-1 space-y-2">
          <Input
            value={value?.alt ?? ""}
            disabled={!value}
            onChange={(e) => value && onChange({ ...value, alt: e.target.value })}
            placeholder="Descrição da imagem (para quem não a vê)"
            aria-label="Descrição da imagem"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              Escolher
            </Button>
            {value && allowEmpty && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
                Tirar imagem
              </Button>
            )}
          </div>
        </div>
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Biblioteca de imagens"
        description="Fotografias reais da oficina e dos trabalhos, e as imagens já carregadas no painel."
        className="sm:w-[min(56rem,calc(100vw-2rem))]"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              loading={pending}
              disabled={library ? !library.cloudinary : true}
              onClick={() => fileInput.current?.click()}
            >
              <Upload aria-hidden /> Carregar imagem
            </Button>
            <p className="text-xs text-ink-3">
              {library && !library.cloudinary
                ? "Para carregar imagens novas, junta o CLOUDINARY_URL ao .env.local."
                : `JPG, PNG ou WebP até ${MAX_MB} MB. Fica guardada para voltar a usar.`}
            </p>
          </div>
          {library && library.items.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Carregadas</h3>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">{library.items.map((m) => tile(m, m.src))}</ul>
            </section>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Fotografias do site</h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {ASSET_KEYS.map((key) => tile({ src: `asset:${key}`, alt: "" }, key))}
            </ul>
          </section>
        </div>
      </Modal>
    </div>
  );
}
