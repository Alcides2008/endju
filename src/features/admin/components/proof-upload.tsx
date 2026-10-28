"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { createProof, proofsBackend, signProofUpload, type ProofInput } from "../proof-actions";

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/** Envio da prova: direto para o Cloudinary (PDF ou imagem) ou, sem ele, imagem pequena guardada no documento. */
export function ProofUploadForm({ orderId, itemId }: { orderId: string; itemId: string }) {
  const router = useRouter();
  const [backend, setBackend] = useState<{ cloudinary: boolean; maxInlineKb: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    void proofsBackend().then(setBackend);
  }, []);

  const send = () =>
    start(async () => {
      if (!file || !backend) return;
      let upload: ProofInput["upload"];
      try {
        if (backend.cloudinary) {
          const signed = await signProofUpload(orderId);
          if (!signed) throw new Error("Sem permissão para enviar provas.");
          setProgress("A enviar para o Cloudinary…");
          const body = new FormData();
          body.append("file", file);
          for (const [key, value] of Object.entries(signed.fields)) body.append(key, String(value));
          const response = await fetch(signed.url, { method: "POST", body });
          const data = (await response.json()) as {
            public_id?: string;
            format?: string;
            width?: number;
            height?: number;
            pages?: number;
            error?: { message: string };
          };
          if (!response.ok || !data.public_id)
            throw new Error(data.error?.message ?? "O Cloudinary recusou o ficheiro.");
          upload = {
            kind: "cloudinary",
            publicId: data.public_id,
            format: data.format ?? "jpg",
            width: data.width ?? 1,
            height: data.height ?? 1,
            pages: data.pages,
          };
        } else {
          if (!file.type.startsWith("image/"))
            throw new Error("Sem Cloudinary, a prova tem de ser uma imagem (PNG, JPG ou WebP).");
          if (file.size > backend.maxInlineKb * 1024)
            throw new Error(
              `Imagem maior que ${backend.maxInlineKb} KB. Exporta-a mais leve ou configura o Cloudinary.`,
            );
          const bitmap = await createImageBitmap(file);
          upload = { kind: "inline", dataUrl: await readDataUrl(file), width: bitmap.width, height: bitmap.height };
          bitmap.close();
        }
      } catch (error) {
        setProgress(null);
        return void toast.error(error instanceof Error ? error.message : "Falhou o envio.");
      }
      setProgress("A registar a prova…");
      const result = await createProof({ orderId, itemId, message, upload });
      setProgress(null);
      if (!result.ok) return void toast.error(result.message);
      toast.success("Prova enviada. O cliente foi avisado.");
      router.push(`/admin/provas/${result.id}`);
    });

  return (
    <div className="max-w-xl space-y-4 rounded-sm border border-line bg-card p-5">
      {backend && !backend.cloudinary && (
        <p className="rounded-sm bg-warning/10 p-3 text-sm text-warning">
          O Cloudinary ainda não está configurado: aceito só imagens até {backend.maxInlineKb} KB. Com as chaves
          CLOUDINARY_* no .env.local, passam a ser aceites PDFs e imagens grandes.
        </p>
      )}
      <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-line p-4 text-sm font-medium hover:border-ink/40 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/20">
        <Upload className="size-5 text-brand" aria-hidden />
        {file ? `${file.name} · ${Math.round(file.size / 1024)} KB` : "Escolher a prova (PDF, PNG, JPG)"}
        <input
          type="file"
          className="sr-only"
          accept={backend?.cloudinary ? ".pdf,image/*" : "image/png,image/jpeg,image/webp"}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <Textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Nota para o cliente (opcional). Ex.: ajustámos o logótipo ao formato do cartão."
        aria-label="Nota para o cliente"
      />
      {progress && <p className="text-sm text-ink-3">{progress}</p>}
      <Button loading={pending} disabled={!file || !backend} onClick={send}>
        Enviar prova ao cliente
      </Button>
    </div>
  );
}
