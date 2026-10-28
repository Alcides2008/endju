import "server-only";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { COMPANY } from "@/content/company";
import { formatDateTime } from "@/lib/dates";
import { pdfText } from "@/lib/pdf-text";

/** Lista do painel em PDF (A4 deitado), com cabeçalho repetido em cada página. */
export async function tablePdf(title: string, header: string[], rows: string[][], widths: number[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = [841.89, 595.28];
  const left = 36;
  const usable = W - left * 2;
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map((w) => (w / total) * usable);
  const size = 8.5;
  const fit = (text: string, width: number, font = regular) => {
    let t = pdfText(text);
    while (t.length > 1 && font.widthOfTextAtSize(t, size) > width - 6) t = t.slice(0, -2) + "…";
    return t;
  };

  let page = pdf.addPage([W, H]);
  let y = H - 40;
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - 40;
    drawHeader();
  };
  const drawHeader = () => {
    let x = left;
    header.forEach((h, i) => {
      page.drawText(fit(h, cols[i], bold), { x, y, size, font: bold, color: rgb(0.43, 0.42, 0.46) });
      x += cols[i];
    });
    y -= 6;
    page.drawLine({ start: { x: left, y }, end: { x: W - left, y }, thickness: 0.6, color: rgb(0.2, 0.2, 0.2) });
    y -= 13;
  };

  page.drawText(pdfText(title), { x: left, y, size: 14, font: bold });
  page.drawText(pdfText(`${COMPANY.name} · ${formatDateTime(new Date())} · ${rows.length} linha(s)`), {
    x: left,
    y: y - 16,
    size: 8,
    font: regular,
    color: rgb(0.43, 0.42, 0.46),
  });
  y -= 40;
  drawHeader();
  for (const row of rows) {
    if (y < 40) newPage();
    let x = left;
    row.forEach((value, i) => {
      page.drawText(fit(value, cols[i]), { x, y, size, font: regular });
      x += cols[i];
    });
    y -= 14;
  }
  return pdf.save();
}
