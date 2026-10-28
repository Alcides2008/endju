import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AccountHeading, EmptyState } from "@/features/account/components/account-heading";
import { CouponButton } from "@/features/admin/components/marketing-forms";
import { MARKETING_TABS, SectionTabs } from "@/features/admin/components/section-tabs";
import { requireModule } from "@/features/admin/guard";
import { listCoupons, type CouponRow } from "@/features/admin/marketing";
import { dayKey } from "@/lib/domain/finance";
import { formatKz } from "@/lib/domain/money";
import { can } from "@/lib/domain/permissions";

export const metadata: Metadata = { title: "Cupões" };

const date = (day: string) => day.split("-").reverse().join("/");

function describe(c: CouponRow) {
  const value =
    c.type === "percent"
      ? `${c.value} %${c.maxDiscount ? ` (até ${formatKz(c.maxDiscount)})` : ""}`
      : c.type === "fixed"
        ? formatKz(c.value)
        : "Entrega grátis";
  return [value, c.minSubtotal && `compra mínima ${formatKz(c.minSubtotal)}`, c.firstOrderOnly && "só 1.ª encomenda"]
    .filter(Boolean)
    .join(" · ");
}

export default async function CouponsPage() {
  const user = await requireModule("marketing", "view", "/admin/marketing/cupoes");
  const coupons = await listCoupons();
  const today = dayKey(new Date());
  const canEdit = can(user, "marketing", "create");

  return (
    <>
      <AccountHeading title="Marketing" action={canEdit && <CouponButton />}>
        Códigos de desconto para o checkout. Para medir uma campanha, liga-lhe os cupões em Campanhas.
      </AccountHeading>
      <SectionTabs tabs={MARKETING_TABS} current="/admin/marketing/cupoes" />
      {coupons.length === 0 ? (
        <EmptyState title="Ainda não há cupões." action={canEdit && <CouponButton />} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Código</TH>
              <TH>Desconto</TH>
              <TH>Validade</TH>
              <TH className="text-right">Usado</TH>
              <TH>Estado</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {coupons.map((c) => {
              const expired = c.endsAt && c.endsAt < today;
              const exhausted = c.usageLimit !== null && c.usedCount >= c.usageLimit;
              const live = c.active && !expired && !exhausted && c.startsAt <= today;
              return (
                <TR key={c.code}>
                  <TD className="font-mono font-semibold">{c.code}</TD>
                  <TD className="text-ink-2">{describe(c)}</TD>
                  <TD className="whitespace-nowrap text-ink-2">
                    {date(c.startsAt)}
                    {c.endsAt ? ` → ${date(c.endsAt)}` : " · sem fim"}
                  </TD>
                  <TD className="text-right whitespace-nowrap">
                    {c.usedCount}
                    {c.usageLimit !== null && <span className="text-ink-3"> / {c.usageLimit}</span>}
                  </TD>
                  <TD>
                    <Badge tone={live ? "success" : "neutral"}>
                      {live
                        ? "Em uso"
                        : !c.active
                          ? "Desligado"
                          : expired
                            ? "Terminou"
                            : exhausted
                              ? "Esgotado"
                              : "Ainda não começou"}
                    </Badge>
                  </TD>
                  <TD className="text-right">{canEdit && <CouponButton coupon={c} />}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
