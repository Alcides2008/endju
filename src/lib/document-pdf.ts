import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { COMPANY as DEFAULT_COMPANY, type CompanyInfo } from "@/content/company";
import { formatKz, type Cents } from "@/lib/domain/money";
import { formatPhone } from "@/lib/domain/phone";
import { pdfText } from "@/lib/pdf-text";

const INK = rgb(0.07, 0.067, 0.086);
const MUTED = rgb(0.43, 0.42, 0.46);
const LINE = rgb(0.88, 0.87, 0.84);
const BRAND = rgb(0.84, 0.17, 0.09);
const A4: [number, number] = [595.28, 841.89];

export type CommercialDoc = {
  /** "PRO-FORMA", "PROPOSTA" */
  title: string;
  number: string;
  meta: string[];
  customer: { name: string; nif?: string; phone?: string; email?: string; company?: string };
  lines: { name: string; details?: string; quantity: number; lineTotal: Cents }[];
  /** [rótulo, valor, destaque] */
  totals: [string, string, boolean?][];
  notes: string[];
};

/** Parte o texto em linhas que cabem na largura dada. */
function wrap(value: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const paragraph of pdfText(value).split(/\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/**
 * Documento comercial A4 (pro-forma, proposta): emitente e cliente, linhas, totais e condições.
 * Sem valor fiscal: as faturas saem do software certificado pela AGT.
 */
export async function commercialPdf(
  doc: CommercialDoc,
  logoPng: Uint8Array | null,
  company: CompanyInfo = DEFAULT_COMPANY,
) {
  const COMPANY = company;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} ${doc.number}`);
  pdf.setAuthor(COMPANY.name);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const left = 48;
  const right = A4[0] - 48;
  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - 56;

  const text = (value: string, x: number, at: number, size = 10, font: PDFFont = regular, color = INK) =>
    page.drawText(pdfText(value), { x, y: at, size, font, color });
  const textRight = (value: string, x: number, at: number, size = 10, font: PDFFont = regular, color = INK) => {
    const v = pdfText(value);
    page.drawText(v, { x: x - font.widthOfTextAtSize(v, size), y: at, size, font, color });
  };
  const rule = (at: number) =>
    page.drawLine({ start: { x: left, y: at }, end: { x: right, y: at }, thickness: 0.6, color: LINE });
  const footer = () => text(`${COMPANY.name} · ${COMPANY.tagline} · ${COMPANY.city}`, left, 36, 8, regular, MUTED);
  /** Nova página quando o que vem a seguir não cabe acima do rodapé. */
  const room = (needed: number) => {
    if (y - needed > 64) return;
    footer();
    page = pdf.addPage(A4);
    y = A4[1] - 56;
  };

  if (logoPng) {
    const logo = await pdf.embedPng(logoPng);
    const w = 110;
    const h = (w * logo.height) / logo.width;
    page.drawImage(logo, { x: left, y: y - h + 14, width: w, height: h });
  } else {
    text(COMPANY.name, left, y, 16, bold);
  }
  textRight(doc.title, right, y, 18, bold, BRAND);
  textRight(doc.number, right, y - 20, 11, bold);
  doc.meta.forEach((line, i) => textRight(line, right, y - 36 - i * 12, 9, regular, MUTED));
  y -= 74 + doc.meta.length * 12;

  // Emitente e cliente
  text("Emitente", left, y, 8, bold, MUTED);
  text("Cliente", 320, y, 8, bold, MUTED);
  y -= 14;
  const issuer = [
    COMPANY.name,
    COMPANY.address ?? COMPANY.city,
    COMPANY.phone ? formatPhone(COMPANY.phone) : "",
    COMPANY.nif ? `NIF ${COMPANY.nif}` : "",
  ].filter(Boolean);
  const client = [
    doc.customer.name,
    doc.customer.company ?? "",
    doc.customer.nif ? `NIF ${doc.customer.nif}` : "",
    doc.customer.phone ? formatPhone(doc.customer.phone) : "",
    doc.customer.email ?? "",
  ].filter(Boolean);
  for (let i = 0; i < Math.max(issuer.length, client.length); i++) {
    if (issuer[i]) text(issuer[i], left, y, 10, i === 0 ? bold : regular);
    if (client[i]) text(client[i], 320, y, 10, i === 0 ? bold : regular);
    y -= 14;
  }
  y -= 16;

  // Linhas
  const head = () => {
    text("Descrição", left, y, 8, bold, MUTED);
    textRight("Qtd.", 380, y, 8, bold, MUTED);
    textRight("Preço unit.", 465, y, 8, bold, MUTED);
    textRight("Total c/ IVA", right, y, 8, bold, MUTED);
    y -= 8;
    rule(y);
    y -= 16;
  };
  head();
  for (const line of doc.lines) {
    const name = wrap(line.name, bold, 10, 330 - left - 10);
    const details = line.details ? wrap(line.details, regular, 8, 330 - left - 10) : [];
    const before = page;
    room(name.length * 13 + details.length * 12 + 8);
    if (page !== before) head();
    textRight(String(line.quantity), 380, y, 10);
    textRight(formatKz(Math.round(line.lineTotal / line.quantity)), 465, y, 10);
    textRight(formatKz(line.lineTotal), right, y, 10);
    for (const part of name) {
      text(part, left, y, 10, bold);
      y -= 13;
    }
    for (const part of details) {
      text(part, left, y, 8, regular, MUTED);
      y -= 12;
    }
    y -= 6;
    rule(y + 6);
  }
  y -= 10;

  // Totais
  room(doc.totals.length * 17);
  for (const [label, value, strong] of doc.totals) {
    text(label, 330, y, strong ? 12 : 10, strong ? bold : regular, strong ? INK : MUTED);
    textRight(value, right, y, strong ? 12 : 10, strong ? bold : regular);
    y -= strong ? 20 : 15;
  }

  // Condições, com as contas para transferência das Definições
  y -= 20;
  const banks = COMPANY.banks.map((b) => `Transferência: ${b.bank} · IBAN ${b.iban} · ${b.holder}`);
  for (const note of [...banks, ...doc.notes]) {
    for (const part of wrap(note, regular, 8.5, right - left)) {
      room(12);
      text(part, left, y, 8.5, regular, MUTED);
      y -= 12;
    }
  }

  footer();
  return pdf.save();
}

/** O logótipo vem do próprio site (os ficheiros de /public não vão dentro da função do servidor). */
export function loadLogo(requestUrl: string) {
  return fetch(new URL("/brand/endju-logo.png", requestUrl))
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((b) => (b ? new Uint8Array(b) : null))
    .catch(() => null);
}
