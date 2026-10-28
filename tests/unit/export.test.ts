import { describe, expect, it } from "vitest";
import { toCsv, toXls } from "@/lib/export";

const columns = [
  { label: "Pedido", value: (r: { n: string; total: number }) => r.n },
  { label: "Total", value: (r: { n: string; total: number }) => r.total },
];

describe("toCsv", () => {
  it("usa ponto e vírgula, BOM e aspas quando é preciso", () => {
    const csv = toCsv([{ n: 'Lona "3×2"; frente', total: 51000 }], columns);
    expect(csv.startsWith(`${String.fromCharCode(0xfeff)}Pedido;Total\r\n`)).toBe(true);
    expect(csv).toContain('"Lona ""3×2""; frente";51000');
  });

  it("escreve decimais com vírgula", () => {
    expect(toCsv([{ n: "A", total: 6877.2 }], columns)).toContain("A;6877,2");
  });
});

describe("toXls", () => {
  it("escreve números como números e escapa o texto", () => {
    const xls = toXls([{ n: "A&B <1>", total: 5 }], columns);
    expect(xls).toContain('<Data ss:Type="Number">5</Data>');
    expect(xls).toContain("A&amp;B &lt;1&gt;");
  });
});
