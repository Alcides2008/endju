"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, FileSearch, Move3d, ShoppingBag, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { detectTier, type Tier } from "@/components/three/capability";
import { BOX_DEPTH_CM, defaultConfig, printSize, VEST_COLORS, type ProductBase } from "@/lib/domain/catalog";
import { cart, type ArtworkCheck } from "@/features/cart/store";
import { formatKz, formatKzWhole } from "@/lib/domain/money";
import { addWorkingDays, priceItem, PricingError, tierUnitPrice, type ItemConfig } from "@/lib/domain/pricing";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { checkArtwork, fileFormat, RASTER_FORMATS } from "../artwork";
import { VestIllustration } from "./vest-illustration";

const ProductPreview = dynamic(() => import("@/components/three/product-preview"), { ssr: false });

let cachedTier: Tier | undefined;
const getTier = () => (cachedTier ??= detectTier());
const noop = () => () => {};

type ArtMode = "ficheiro" | "depois" | "endju";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-line pt-6">
      <legend className="flex items-baseline gap-3 text-lg font-semibold">
        <span className="font-mono text-xs font-normal text-brand">{String(n).padStart(2, "0")}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Choice({
  checked,
  onSelect,
  title,
  detail,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail?: string;
  name: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-sm border px-4 py-3 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/20",
        checked ? "border-ink bg-card" : "border-line hover:border-ink/40",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="text-sm font-medium text-ink">{title}</span>
      {detail && <span className={cn("shrink-0 text-xs", checked ? "text-ink-2" : "text-ink-3")}>{detail}</span>}
    </label>
  );
}

const signed = (cents: number) =>
  cents === 0 ? "incluído" : `${cents > 0 ? "+" : "−"}${formatKzWhole(Math.abs(cents))}`;

export function Configurator({ product }: { product: ProductBase }) {
  const router = useRouter();
  const tier = useSyncExternalStore(noop, getTier, () => null);
  const hydrated = useHydrated();
  const [config, setConfig] = useState<ItemConfig>(() => defaultConfig(product));
  const [quantityText, setQuantityText] = useState(String(product.minQty));
  const [artMode, setArtMode] = useState<ArtMode>("ficheiro");
  const [artwork, setArtwork] = useState<ArtworkCheck | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const onPreviewReady = useCallback(() => setPreviewReady(true), []);

  // Liberta a imagem local quando é trocada ou a página fecha
  useEffect(() => () => void (artworkUrl && URL.revokeObjectURL(artworkUrl)), [artworkUrl]);

  const design = artMode === "endju" ? "endju_cria" : "cliente_envia";
  const current = { ...config, design } as ItemConfig;
  const price = (() => {
    try {
      return { ok: true as const, value: priceItem(product, current) };
    } catch (error) {
      return { ok: false as const, message: error instanceof PricingError ? error.message : "Configuração inválida." };
    }
  })();

  /** Diferença de preço se o cliente escolher outra opção (mostrada ao lado de cada escolha). */
  const deltaFor = (group: string, choice: string) => {
    if (!price.ok) return null;
    try {
      const other = priceItem(product, { ...current, options: { ...current.options, [group]: choice } });
      return other.lineTotal - price.value.lineTotal;
    } catch {
      return null;
    }
  };

  const setOption = (group: string, choice: string) =>
    setConfig((c) => ({ ...c, options: { ...c.options, [group]: choice } }));

  const setQuantity = (value: string) => {
    setQuantityText(value);
    const n = Number(value);
    if (Number.isInteger(n) && n > 0) setConfig((c) => ({ ...c, quantity: n }));
  };

  const print = printSize(product, config);
  const days = config.urgent ? product.leadTime.urgentDays : product.leadTime.normalDays;
  // A data depende da hora atual: só no browser (no pré-render o Next exigiria Suspense à volta)
  const readyBy = hydrated
    ? new Intl.DateTimeFormat("pt-AO", { weekday: "long", day: "numeric", month: "long" }).format(
        addWorkingDays(new Date(), days),
      )
    : null;

  async function onFile(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    let widthPx: number | undefined;
    let heightPx: number | undefined;
    let url: string | null = null;
    if (RASTER_FORMATS.includes(fileFormat(file.name))) {
      try {
        const bitmap = await createImageBitmap(file);
        widthPx = bitmap.width;
        heightPx = bitmap.height;
        bitmap.close();
        url = URL.createObjectURL(file);
      } catch {
        setFileError("Não conseguimos ler esta imagem. Experimenta exportá-la de novo.");
        return;
      }
    }
    const result = checkArtwork(
      { name: file.name, sizeBytes: file.size, widthPx, heightPx },
      product.fileRequirements,
      print,
    );
    if ("error" in result) {
      setFileError(result.error);
      if (url) URL.revokeObjectURL(url);
      return;
    }
    setArtwork(result);
    setArtworkUrl(url);
  }

  function addToCart() {
    if (!price.ok) return;
    cart.add({
      productSlug: product.slug,
      options: config.options,
      size: config.size,
      quantity: config.quantity,
      urgent: config.urgent,
      design,
      artwork: artMode === "ficheiro" ? artwork : null,
      notes: notes.trim(),
    });
    toast.success(`${product.name} no carrinho`, {
      description: `${config.quantity} ${product.unit} · ${formatKz(price.value.lineTotal)}`,
      action: { label: "Ver carrinho", onClick: () => router.push("/carrinho") },
    });
  }

  const canvasKinds = ["card", "flat", "rollup", "banner", "box"] as const;
  const tier3d = tier && tier !== "none" ? tier : null;
  const show3d = (canvasKinds as readonly string[]).includes(product.preview) && tier3d !== null && print !== null;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
      {/* Pré-visualização */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-[radial-gradient(circle_at_50%_35%,var(--card),var(--paper-2))]">
          {show3d && tier3d && print ? (
            <>
              <ProductPreview
                kind={product.preview as (typeof canvasKinds)[number]}
                tier={tier3d}
                sizeCm={print}
                depthCm={BOX_DEPTH_CM[config.options.tamanho]}
                artworkUrl={artworkUrl}
                onReady={onPreviewReady}
              />
              <p
                className={cn(
                  "pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-paper/85 px-3 py-1.5 eyebrow text-ink-3 backdrop-blur transition-opacity duration-700",
                  previewReady ? "opacity-100" : "opacity-0",
                )}
              >
                <Move3d className="size-3.5" aria-hidden /> Arrasta para rodar
              </p>
            </>
          ) : product.preview === "vest" ? (
            <VestIllustration
              color={VEST_COLORS[config.options.cor] ?? VEST_COLORS.amarelo}
              logoUrl={artworkUrl}
              className="absolute inset-0 m-auto h-[82%] w-auto"
            />
          ) : product.image ? (
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              preload
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : null}
        </div>
        {artworkUrl && (show3d || product.preview === "vest") && (
          <p className="mt-3 text-xs text-ink-3">
            A pré-visualização usa a tua imagem. A prova final é feita pela nossa equipa antes de imprimir.
          </p>
        )}
      </div>

      {/* Configuração */}
      <div className="space-y-8">
        {product.optionGroups.map((group, i) =>
          group.type === "select" ? (
            <Step key={group.key} n={i + 1} title={group.label}>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.choices!.map((choice) => {
                  const delta = config.options[group.key] === choice.key ? null : deltaFor(group.key, choice.key);
                  return (
                    <Choice
                      key={choice.key}
                      name={group.key}
                      checked={config.options[group.key] === choice.key}
                      onSelect={() => setOption(group.key, choice.key)}
                      title={choice.label}
                      detail={delta === null ? undefined : signed(delta)}
                    />
                  );
                })}
              </div>
            </Step>
          ) : (
            <Step key={group.key} n={i + 1} title={`${group.label} (cm)`}>
              <div className="flex flex-wrap items-end gap-3">
                {(["widthCm", "heightCm"] as const).map((dim) => (
                  <label key={dim} className="flex flex-col gap-2 text-sm font-medium">
                    {dim === "widthCm" ? "Largura" : "Altura"}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={group.size!.minCm}
                      max={group.size!.maxCm}
                      step={group.size!.stepCm}
                      value={config.size?.[dim] ?? ""}
                      onChange={(event) =>
                        setConfig((c) => ({
                          ...c,
                          size: { ...(c.size ?? { widthCm: 0, heightCm: 0 }), [dim]: Number(event.target.value) },
                        }))
                      }
                      className="h-12 w-32 rounded-sm border border-line bg-card px-4 text-ink outline-none focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20"
                    />
                  </label>
                ))}
                {config.size && (
                  <p className="pb-3 text-sm text-ink-3">
                    {((config.size.widthCm * config.size.heightCm) / 10_000).toLocaleString("pt-AO", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    m² por peça
                  </p>
                )}
              </div>
              {config.size && Math.min(config.size.widthCm, config.size.heightCm) > 320 && (
                <p className="text-sm text-warning">Acima de 3,2 m nas duas medidas a lona leva uma emenda soldada.</p>
              )}
            </Step>
          ),
        )}

        <Step n={product.optionGroups.length + 1} title="Quantidade">
          <div className="flex flex-wrap items-center gap-2">
            {product.quantityPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={config.quantity === preset}
                onClick={() => setQuantity(String(preset))}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  config.quantity === preset
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink-2 hover:border-ink/40",
                )}
              >
                {preset.toLocaleString("pt-AO")}
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm text-ink-3">
              <span className="sr-only">Outra quantidade</span>
              <input
                type="number"
                inputMode="numeric"
                min={product.minQty}
                value={quantityText}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-10 w-28 rounded-full border border-line bg-card px-4 text-ink outline-none focus-visible:border-ink focus-visible:ring-4 focus-visible:ring-brand/20"
              />
              {product.unit}
            </label>
          </div>
          {product.pricing.model === "tiered_unit" && product.pricing.tiers && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
              {product.pricing.tiers.map((tierRow) => {
                const active = tierUnitPrice(product.pricing.tiers!, config.quantity) === tierRow.unitPrice;
                return (
                  <li key={tierRow.minQty} className={cn(active && "font-medium text-ink")}>
                    {tierRow.minQty.toLocaleString("pt-AO")}+ · {formatKzWhole(tierRow.unitPrice)}/un.
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        <Step n={product.optionGroups.length + 2} title="Prazo">
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice
              name="prazo"
              checked={!config.urgent}
              onSelect={() => setConfig((c) => ({ ...c, urgent: false }))}
              title={`Normal · ${product.leadTime.normalDays} ${product.leadTime.normalDays === 1 ? "dia útil" : "dias úteis"}`}
            />
            <Choice
              name="prazo"
              checked={config.urgent}
              onSelect={() => setConfig((c) => ({ ...c, urgent: true }))}
              title={
                product.leadTime.urgentDays === 0
                  ? "Urgente · no próprio dia"
                  : `Urgente · ${product.leadTime.urgentDays} ${product.leadTime.urgentDays === 1 ? "dia útil" : "dias úteis"}`
              }
              detail={`+${product.pricing.urgentSurchargePct} %`}
            />
          </div>
          <p className="text-sm text-ink-3">
            {readyBy ? (
              <>
                Pronto a partir de <span className="text-ink">{readyBy}</span>, contando da aprovação da prova e do
                sinal.
              </>
            ) : (
              "O prazo conta a partir da aprovação da prova e do sinal."
            )}
          </p>
        </Step>

        <Step n={product.optionGroups.length + 3} title="Arte">
          <div className="grid gap-2">
            <Choice
              name="arte"
              checked={artMode === "ficheiro"}
              onSelect={() => setArtMode("ficheiro")}
              title="Tenho o ficheiro"
            />
            <Choice
              name="arte"
              checked={artMode === "depois"}
              onSelect={() => setArtMode("depois")}
              title="Envio o ficheiro depois"
            />
            {product.allowDesignService && (
              <Choice
                name="arte"
                checked={artMode === "endju"}
                onSelect={() => setArtMode("endju")}
                title="Preciso que a Endju crie o design"
                detail={product.pricing.designFee ? `+${formatKzWhole(product.pricing.designFee)}` : undefined}
              />
            )}
          </div>

          {artMode === "ficheiro" && (
            <div className="space-y-3 rounded-sm border border-dashed border-line p-5">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium has-[:focus-visible]:underline">
                <Upload className="size-5 text-brand" aria-hidden />
                {artwork ? "Escolher outro ficheiro" : "Escolher ficheiro para verificar"}
                <input
                  type="file"
                  className="sr-only"
                  accept={product.fileRequirements.formats.map((f) => `.${f}`).join(",") + ",.jpeg,.tif"}
                  onChange={(event) => void onFile(event.target.files?.[0])}
                />
              </label>
              <p className="text-xs text-ink-3">
                {product.fileRequirements.formats.map((f) => f.toUpperCase()).join(", ")} até{" "}
                {product.fileRequirements.maxSizeMb} MB · {product.fileRequirements.minDpi} dpi
                {product.fileRequirements.bleedMm > 0 && ` · ${product.fileRequirements.bleedMm} mm de sangria`}. O
                ficheiro não sai do teu computador: depois do pedido, envia-o por WhatsApp com o número do pedido.
              </p>
              {fileError && (
                <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {fileError}
                </p>
              )}
              {artwork && (
                <div role="status" className="space-y-2 border-t border-line pt-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    {artwork.status === "ok" ? (
                      <CircleCheck className="size-4 text-success" aria-hidden />
                    ) : artwork.status === "avisos" ? (
                      <CircleAlert className="size-4 text-warning" aria-hidden />
                    ) : (
                      <FileSearch className="size-4 text-info" aria-hidden />
                    )}
                    {artwork.name}
                    {artwork.dpi && <span className="font-normal text-ink-3">· {artwork.dpi} dpi</span>}
                  </p>
                  <ul className="space-y-1 text-ink-2">
                    {artwork.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <label className="block space-y-2 text-sm font-medium">
            Notas para a produção (opcional)
            <Textarea
              rows={3}
              value={notes}
              maxLength={600}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                artMode === "endju"
                  ? "Ex.: nome, cargo, telefone e email para o cartão; cores da marca."
                  : "Ex.: usar o azul do logótipo; entregar até dia 15."
              }
            />
          </label>
        </Step>

        {/* Resumo e preço */}
        <section
          aria-label="Resumo do preço"
          className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-5 backdrop-blur sm:mx-0 sm:rounded-sm sm:border sm:bg-card sm:p-6 lg:static"
        >
          {price.ok ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-ink-3">Total estimado, IVA incluído</p>
                  <p aria-live="polite" className="text-display-sm font-bold">
                    {formatKz(price.value.lineTotal)}
                  </p>
                </div>
                <p className="text-right text-sm text-ink-3">
                  {formatKz(price.value.unitPrice)}
                  <br />
                  por unidade
                </p>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-ink-2 hover:text-ink">Como chegámos a este valor</summary>
                <dl className="mt-3 space-y-1.5">
                  {price.value.breakdown.map((part) => (
                    <div key={part.label} className="flex justify-between gap-4">
                      <dt className="text-ink-2">{part.label}</dt>
                      <dd className="font-mono text-xs">{formatKz(part.amount)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 border-t border-line pt-1.5 text-ink-3">
                    <dt>IVA 14 % incluído</dt>
                    <dd className="font-mono text-xs">{formatKz(price.value.lineTax)}</dd>
                  </div>
                </dl>
              </details>
              <Button size="lg" className="w-full" onClick={addToCart}>
                <ShoppingBag aria-hidden /> Adicionar ao carrinho
              </Button>
            </div>
          ) : (
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {price.message}
            </p>
          )}
        </section>
        <p className="text-sm text-ink-3">
          O preço final é confirmado no checkout, depois de verificarmos o ficheiro. Precisas de algo diferente?{" "}
          <Link
            href="/orcamento/personalizado"
            className="text-ink underline decoration-brand decoration-2 underline-offset-4"
          >
            Pede um orçamento personalizado
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
