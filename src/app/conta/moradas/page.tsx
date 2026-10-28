import type { Metadata } from "next";
import { AccountHeading } from "@/features/account/components/account-heading";
import { AddressBook } from "@/features/account/components/profile-forms";
import { getMyCustomer, getMyProfile } from "@/features/account/server";
import { requireCustomer } from "@/lib/auth/session";
import { formatPhone } from "@/lib/domain/phone";

export const metadata: Metadata = { title: "Moradas" };

export default async function AddressesPage() {
  const user = await requireCustomer("/conta/moradas");
  const [customer, profile] = await Promise.all([getMyCustomer(user.uid), getMyProfile(user.uid)]);

  return (
    <>
      <AccountHeading title="Moradas">Moradas de entrega guardadas para os próximos pedidos.</AccountHeading>
      <AddressBook
        addresses={customer?.addresses ?? []}
        defaults={{
          name: profile.displayName || user.name || "",
          phone: formatPhone(profile.phone || user.phone || ""),
        }}
      />
    </>
  );
}
