import { getAdminQuote } from "@/features/admin/quotes";
import { getCompany } from "@/features/settings/server";
import { getSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { commercialPdf, loadLogo } from "@/lib/document-pdf";
import { formatKz } from "@/lib/domain/money";
import { can, isStaff } from "@/lib/domain/permissions";

/** Proposta em PDF (versão atual): o cliente descarrega as suas; a equipa com acesso a Orçamentos, qualquer uma. */
export async function GET(request: Request, { params }: RouteContext<"/api/pdf/proposta/[id]">) {
  const user = await getSession();
  if (!user) return new Response("Sessão terminada.", { status: 401 });
  const quote = await getAdminQuote((await params).id);
  const staff = isStaff(user.role) && can(user, "quotes", "view");
  if (!quote || (!staff && quote.userId !== user.uid))
    return new Response("Orçamento não encontrado.", { status: 404 });
  const version = quote.versions.find((v) => v.version === quote.currentVersion);
  if (!version) return new Response("Esta proposta ainda não foi enviada.", { status: 404 });

  const bytes = await commercialPdf(
    {
      title: "PROPOSTA",
      number: `${quote.number} · v${version.version}`,
      meta: [`Data: ${formatDate(version.createdAt)}`, `Válida até ${formatDate(version.validUntil)}`],
      customer: quote.contact,
      lines: version.lines.map((line) => ({
        name: line.description,
        quantity: line.quantity,
        lineTotal: line.quantity * line.unitPrice,
      })),
      totals: [
        ...(version.totals.discount > 0
          ? [["Desconto", `-${formatKz(version.totals.discount)}`] as [string, string]]
          : []),
        ["Base tributável", formatKz(version.totals.subtotal)],
        ["IVA 14 %", formatKz(version.totals.tax)],
        ["Total", formatKz(version.totals.total), true],
      ],
      notes: [
        version.terms,
        ...(version.notes ? [version.notes] : []),
        "Documento sem valor fiscal. A fatura é emitida em software certificado pela AGT.",
      ],
    },
    await loadLogo(request.url),
    await getCompany(),
  );
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposta-${quote.number}-v${version.version}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
