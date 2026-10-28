import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/auth-forms";
import { AuthFormSkeleton, AuthHeading } from "@/features/auth/components/auth-heading";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function LoginPage() {
  return (
    <>
      <AuthHeading eyebrow="Área do cliente" title="Bem-vindo de volta">
        Entra para acompanhar pedidos, aprovar provas e ver faturas.
      </AuthHeading>
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
