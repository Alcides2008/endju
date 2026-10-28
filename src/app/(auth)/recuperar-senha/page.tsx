import type { Metadata } from "next";
import { RecoverForm } from "@/features/auth/components/auth-forms";
import { AuthHeading } from "@/features/auth/components/auth-heading";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function RecoverPage() {
  return (
    <>
      <AuthHeading eyebrow="Recuperar acesso" title="Esqueceste a senha?">
        Indica o email da conta e enviamos um link para criares uma nova.
      </AuthHeading>
      <RecoverForm />
    </>
  );
}
