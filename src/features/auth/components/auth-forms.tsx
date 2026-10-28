"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { CircleAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { toE164 } from "@/lib/domain/phone";
import { authErrorMessage, registerAccount, signInWithPhone, startSession } from "../client";
import { loginSchema, recoverSchema, registerSchema } from "../schema";

type OnUser = (user: User) => Promise<void>;

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-sm bg-danger/10 px-4 py-3 text-sm text-danger">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function ConfigNotice() {
  return (
    <div className="rounded-sm border border-dashed border-warning/60 bg-warning/10 p-5 text-sm text-ink">
      <p className="font-medium">A autenticação ainda não está ligada.</p>
      <p className="mt-1 text-ink-2">
        Preenche as variáveis <code className="font-mono text-xs">NEXT_PUBLIC_FIREBASE_*</code> em{" "}
        <code className="font-mono text-xs">.env.local</code> (ver{" "}
        <code className="font-mono text-xs">.env.example</code>).
      </p>
    </div>
  );
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-ink-3">
      <span className="h-px flex-1 bg-line" />
      <span className="eyebrow">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

/** Depois de qualquer método: cria a sessão no servidor e segue para o destino. */
function useFinish(): OnUser {
  const router = useRouter();
  const voltar = useSearchParams().get("voltar");
  return async (user) => {
    const to = await startSession(user, voltar);
    router.replace(to);
    router.refresh();
  };
}

function GoogleButton({ onUser }: { onUser: OnUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      await onUser(user);
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="lg" className="w-full" loading={loading} onClick={signIn}>
        <GoogleIcon />
        Continuar com Google
      </Button>
      <FormError message={error} />
    </div>
  );
}

/** Um só campo para email ou telemóvel; o telemóvel entra pelo servidor (sem SMS). */
function PasswordLogin({ onUser }: { onUser: OnUser }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ identifier, password }) => {
    setError(null);
    try {
      const user = identifier.includes("@")
        ? (await signInWithEmailAndPassword(getFirebaseAuth(), identifier, password)).user
        : await signInWithPhone(toE164(identifier)!, password);
      await onUser(user);
      // O Next mantém a página anterior escondida em memória: a senha não fica lá depois de entrar
      form.resetField("password");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field
        label="Email ou telemóvel"
        hint="Números angolanos não precisam do +244."
        error={errors.identifier?.message}
      >
        <Input autoComplete="username" autoCapitalize="none" spellCheck={false} {...form.register("identifier")} />
      </Field>
      <div className="space-y-2">
        <Field label="Senha" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <Link
          href="/recuperar-senha"
          className="inline-block text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          Esqueci-me da senha
        </Link>
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}

export function LoginForm() {
  const finish = useFinish();
  const params = useSearchParams();
  const query = params.toString() ? `?${params.toString()}` : "";
  if (!isFirebaseConfigured) return <ConfigNotice />;

  return (
    <div className="space-y-6">
      <GoogleButton onUser={finish} />
      <Divider>ou</Divider>
      <PasswordLogin onUser={finish} />
      <p className="text-sm text-ink-2">
        Ainda não tens conta?{" "}
        <Link
          href={`/registar${query}`}
          className="font-medium text-ink underline decoration-brand decoration-2 underline-offset-4"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const finish = useFinish();
  const query = useSearchParams().toString();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", terms: false },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await registerAccount(values); // no servidor: email e telemóvel únicos
      const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), values.email, values.password);
      sendEmailVerification(user).catch(() => {}); // não bloqueia o registo
      await finish(user);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  });

  if (!isFirebaseConfigured) return <ConfigNotice />;

  return (
    <div className="space-y-6">
      <GoogleButton onUser={finish} />
      <Divider>ou com email</Divider>
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Nome" error={errors.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </Field>
        <Field label="Telemóvel" hint="Também podes entrar com o telemóvel e a senha." error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="923 456 789" {...form.register("phone")} />
        </Field>
        <Field label="Senha" hint="Pelo menos 8 caracteres." error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </Field>
        <div className="space-y-2">
          <Checkbox {...form.register("terms")}>
            Li e aceito os{" "}
            <Link href="/termos" className="text-ink underline underline-offset-4">
              Termos
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="text-ink underline underline-offset-4">
              Política de privacidade
            </Link>
            .
          </Checkbox>
          {errors.terms && <p className="text-xs font-medium text-danger">{errors.terms.message}</p>}
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>
      <p className="text-sm text-ink-2">
        Já tens conta?{" "}
        <Link
          href={`/entrar${query ? `?${query}` : ""}`}
          className="font-medium text-ink underline decoration-brand decoration-2 underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}

export function RecoverForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(recoverSchema), defaultValues: { email: "" } });

  const submit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setSentTo(email);
    } catch (err) {
      // Não revelar se o email tem conta
      if ((err as { code?: string }).code === "auth/user-not-found") setSentTo(email);
      else setError(authErrorMessage(err));
    }
  });

  if (!isFirebaseConfigured) return <ConfigNotice />;

  if (sentTo) {
    return (
      <div className="space-y-4 rounded-sm border border-line bg-card p-6">
        <MailCheck className="size-6 text-success" aria-hidden />
        <p className="text-ink">
          Se existir uma conta com <strong className="font-medium">{sentTo}</strong>, enviámos um link para definires
          uma nova senha. Vê também a pasta de spam.
        </p>
        <Link
          href="/entrar"
          className="inline-block text-sm font-medium text-ink underline decoration-brand decoration-2 underline-offset-4"
        >
          Voltar a entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Email da conta" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      <FormError message={error} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Enviar link
      </Button>
      <Link href="/entrar" className="block text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
        Lembrei-me, voltar a entrar
      </Link>
    </form>
  );
}
