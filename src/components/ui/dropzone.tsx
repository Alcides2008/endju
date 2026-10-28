"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { CheckCircle2, FileUp, RotateCcw, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Envia um ficheiro e reporta o progresso (0–1). O envio real para o Storage liga aqui na Etapa 4. */
export type Uploader = (file: File, onProgress: (fraction: number) => void, signal: AbortSignal) => Promise<void>;

export type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "a_enviar" | "concluido" | "erro";
  error?: string;
};

export function useUploads(uploader: Uploader) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const start = useCallback(
    (id: string, file: File) => {
      const controller = new AbortController();
      controllers.current.set(id, controller);
      uploader(file, (progress) => update(id, { progress }), controller.signal)
        .then(() => update(id, { progress: 1, status: "concluido" }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          update(id, { status: "erro", error: error instanceof Error ? error.message : "O envio falhou." });
        })
        .finally(() => controllers.current.delete(id));
    },
    [uploader, update],
  );

  const add = useCallback(
    (files: File[]) => {
      const added = files.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "a_enviar" as const }));
      setItems((list) => [...list, ...added]);
      added.forEach((item) => start(item.id, item.file));
    },
    [start],
  );

  const retry = useCallback(
    (item: UploadItem) => {
      update(item.id, { progress: 0, status: "a_enviar", error: undefined });
      start(item.id, item.file);
    },
    [start, update],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  return { items, add, retry, remove };
}

const sizeFormat = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 1 });
export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${sizeFormat.format(bytes / 1024 ** 2)} MB`;
  return `${sizeFormat.format(bytes / 1024 ** 3)} GB`;
}

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Aceita os ficheiros válidos e devolve as mensagens dos rejeitados. */
export function validateFiles(files: File[], accept: string[], maxSizeMb: number) {
  const accepted: File[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (!accept.includes(extensionOf(file.name))) {
      rejected.push(`${file.name}: formato não aceite (usa ${accept.join(", ").toUpperCase()}).`);
    } else if (file.size > maxSizeMb * 1024 * 1024) {
      rejected.push(`${file.name}: ${formatBytes(file.size)}, acima do limite de ${maxSizeMb} MB.`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

export function Dropzone({
  accept,
  maxSizeMb,
  multiple = true,
  disabled,
  onFiles,
  title = "Larga aqui os teus ficheiros",
  className,
}: {
  /** Extensões sem ponto, em minúsculas: ['pdf', 'ai', 'psd', 'png'] */
  accept: string[];
  maxSizeMb: number;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const handle = (list: FileList | null) => {
    if (!list?.length) return;
    const result = validateFiles([...list].slice(0, multiple ? undefined : 1), accept, maxSizeMb);
    setRejected(result.rejected);
    if (result.accepted.length) onFiles(result.accepted);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) handle(event.dataTransfer.files);
  };

  return (
    <div className={className}>
      <label
        data-cursor="hover"
        data-cursor-label="Escolher"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-[1.5px] border-dashed border-ink/25 bg-card px-6 py-10 text-center transition-[border-color,background-color]",
          "hover:border-ink/50 has-[:focus-visible]:border-brand has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/20",
          dragging && "border-brand bg-brand/[0.04]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="grid size-12 place-items-center rounded-full bg-ink text-paper transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5">
          <FileUp className="size-5" aria-hidden />
        </span>
        <span className="font-display text-lg font-semibold text-ink">{title}</span>
        <span className="text-sm text-ink-2">
          ou{" "}
          <span className="font-medium text-ink underline decoration-brand decoration-2 underline-offset-4">
            escolhe no computador
          </span>
        </span>
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-ink-3 uppercase">
          {accept.join(" · ")} · até {maxSizeMb} MB
        </span>
        <input
          type="file"
          className="sr-only"
          multiple={multiple}
          disabled={disabled}
          accept={accept.map((ext) => `.${ext}`).join(",")}
          onChange={(event) => {
            handle(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {rejected.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 text-sm text-danger">
          {rejected.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UploadList({
  items,
  onRemove,
  onRetry,
}: {
  items: UploadItem[];
  onRemove: (id: string) => void;
  onRetry: (item: UploadItem) => void;
}) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 divide-y divide-line rounded-sm border border-line bg-card">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-4 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xs bg-paper-2 font-mono text-[0.625rem] font-medium text-ink-2 uppercase">
            {extensionOf(item.file.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>
              <p className="shrink-0 font-mono text-xs text-ink-3">
                {item.status === "a_enviar" ? `${Math.round(item.progress * 100)} %` : formatBytes(item.file.size)}
              </p>
            </div>
            {item.status === "erro" ? (
              <p className="mt-1 text-xs text-danger">{item.error}</p>
            ) : (
              <div
                role="progressbar"
                aria-label={`Envio de ${item.file.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.progress * 100)}
                className="mt-2 h-1 overflow-hidden rounded-full bg-ink/[0.08]"
              >
                <div
                  className={cn(
                    "h-full origin-left rounded-full transition-[transform,background-color] duration-300",
                    item.status === "concluido" ? "bg-success" : "bg-brand",
                  )}
                  style={{ transform: `scaleX(${item.progress})` }}
                />
              </div>
            )}
          </div>
          {item.status === "concluido" && (
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Enviado" />
          )}
          {item.status === "erro" && (
            <>
              <TriangleAlert className="size-5 shrink-0 text-danger" aria-hidden />
              <button
                type="button"
                onClick={() => onRetry(item)}
                className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-ink/[0.06]"
                aria-label={`Tentar de novo ${item.file.name}`}
              >
                <RotateCcw className="size-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-ink/[0.06]"
            aria-label={item.status === "a_enviar" ? `Cancelar ${item.file.name}` : `Remover ${item.file.name}`}
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
