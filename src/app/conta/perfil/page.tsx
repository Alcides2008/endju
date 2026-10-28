import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { ProfileForm } from "@/features/account/components/profile-forms";
import { getMyCustomer, getMyProfile } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatPhone } from "@/lib/domain/phone";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireCustomer("/conta/perfil");
  const [profile, customer] = await Promise.all([getMyProfile(user.uid), getMyCustomer(user.uid)]);
  const name = profile.displayName || user.name || "";

  return (
    <>
      <AccountHeading title="Perfil">Os teus dados de contacto e os dados que aparecem nas faturas.</AccountHeading>
      <ProfileForm
        defaults={{
          name,
          // O telemóvel do cookie de sessão só muda no próximo login: a ficha do utilizador é a fonte atual
          phone: formatPhone(profile.phone || user.phone || ""),
          email: user.email ?? "",
          type: customer?.type ?? "particular",
          company: customer?.type === "empresa" ? customer.name : "",
          nif: customer?.nif ?? "",
        }}
      />
    </>
  );
}
