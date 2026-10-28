import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/auth-forms";
import { AuthFormSkeleton, AuthHeading } from "@/features/auth/components/auth-heading";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default function RegisterPage() {
  return (
    <>
      <AuthHeading eyebrow="Nova conta" title="Cria a tua conta">
        Leva menos de um minuto. Guardamos os teus pedidos, moradas e ficheiros para a próxima encomenda.
      </AuthHeading>
      <Suspense fallback={<AuthFormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
