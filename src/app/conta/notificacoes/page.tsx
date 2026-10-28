import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { NotificationPrefs } from "@/features/account/components/profile-forms";
import { getMyProfile } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const user = await requireCustomer("/conta/notificacoes");
  const profile = await getMyProfile(user.uid);

  return (
    <>
      <AccountHeading title="Notificações">Escolhe como queres receber os avisos dos teus pedidos.</AccountHeading>
      <NotificationPrefs defaults={profile.notificationPrefs} />
    </>
  );
}
