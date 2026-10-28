/**
 * Exportação de listas do painel sem dependências: CSV, Excel (SpreadsheetML 2003, abre no Excel e no
 * LibreOffice) e o texto das linhas para o PDF. O PDF em si é feito com pdf-lib no servidor.
 */
export type Column<T> = { label: string; value: (row: T) => string | number };

// Marca de ordem de bytes: diz ao Excel que o ficheiro está em UTF-8
const BOM = String.fromCharCode(0xfeff);

const cell = (value: string | number) => {
  // Vírgula decimal: no Excel em português o ponto separa milhares ("6877.2" seria 68 772)
  const text = typeof value === "number" ? String(value).replace(".", ",") : String(value ?? "");
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV com ";" e BOM: o Excel em português abre com acentos e colunas certas. */
export function toCsv<T>(rows: T[], columns: Column<T>[]) {
  const lines = [
    columns.map((c) => cell(c.label)).join(";"),
    ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(";")),
  ];
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

const xml = (text: string) =>
  text.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** Folha Excel (XML 2003): números ficam como números, para somar e filtrar. */
export function toXls<T>(rows: T[], columns: Column<T>[], sheet = "Folha1") {
  const row = (values: (string | number)[], bold = false) =>
    `<Row>${values
      .map(
        (v) =>
          `<Cell${bold ? ' ss:StyleID="h"' : ""}><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${xml(String(v ?? ""))}</Data></Cell>`,
      )
      .join("")}</Row>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="${xml(sheet)}"><Table>
${row(
  columns.map((c) => c.label),
  true,
)}
${rows.map((r) => row(columns.map((c) => c.value(r)))).join("\n")}
</Table></Worksheet></Workbook>`;
}
