"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { subscribeNewsletter } from "../actions";

/** Inscrição na newsletter no rodapé: só o email, com consentimento explícito no botão. */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="max-w-xs space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const website = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value;
        start(async () => {
          const result = await subscribeNewsletter({ email, name: "", website });
          setMessage({ ok: result.ok, text: result.message });
          if (result.ok) setEmail("");
        });
      }}
    >
      <label htmlFor="newsletter-email" className="text-sm font-medium text-ink">
        Novidades e campanhas, uma vez por mês
      </label>
      <div className="flex rounded-full border border-line bg-card focus-within:border-ink focus-within:ring-4 focus-within:ring-brand/20">
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="o.teu@email.com"
          className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Inscrever na newsletter"
          className="m-1 grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper transition hover:bg-ink/85 disabled:opacity-50"
        >
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      {/* Campo escondido contra robôs */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <p
        className={message ? (message.ok ? "text-xs text-success" : "text-xs text-danger") : "text-xs text-ink-3"}
        role="status"
      >
        {message?.text ?? "Podes cancelar quando quiseres, no link de cada email."}
      </p>
    </form>
  );
}
