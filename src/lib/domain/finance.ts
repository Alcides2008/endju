import type { Cents } from "./money";

/**
 * Financeiro (docs/02 · Finanças): regras puras para despesas, IVA, extratos e conciliação.
 * O sistema não emite faturas fiscais (em Angola saem de software certificado pela AGT): regista-as.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  numerario: "Numerário",
  tpa: "TPA",
  transferencia: "Transferência",
  multicaixa_express: "Multicaixa Express",
  referencia: "Referência",
};

export const EXPENSE_CATEGORIES = [
  "materia_prima",
  "renda",
  "energia_gerador",
  "combustivel",
  "salarios",
  "manutencao",
  "internet_telecom",
  "marketing",
  "transporte",
  "impostos",
  "outros",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  materia_prima: "Matéria-prima",
  renda: "Renda",
  energia_gerador: "Energia e gerador",
  combustivel: "Combustível",
  salarios: "Salários",
  manutencao: "Manutenção",
  internet_telecom: "Internet e telecomunicações",
  marketing: "Marketing",
  transporte: "Transporte",
  impostos: "Impostos e taxas",
  outros: "Outros",
};

export const INVOICE_TYPES = ["fatura", "fatura_recibo", "recibo", "nota_credito"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];
export const INVOICE_LABELS: Record<InvoiceType, string> = {
  fatura: "Fatura",
  fatura_recibo: "Fatura-recibo",
  recibo: "Recibo",
  nota_credito: "Nota de crédito",
};

const LUANDA = "Africa/Luanda";

/** "2026-10-28" no dia de Luanda (a hora do servidor pode estar noutro fuso). */
export const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LUANDA }).format(date);
/** "2026-10" */
export const monthKey = (date: Date) => dayKey(date).slice(0, 7);

/** O mesmo dia no mês seguinte, sem passar do fim do mês (31 jan → 28/29 fev): para despesas mensais. */
export function nextMonth(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10);
}

/**
 * IVA de um mês, estimado a partir do que está no painel: liquidado pelas faturas registadas (notas de crédito
 * a abater) e dedutível pelas despesas e compras com IVA. O apuramento oficial sai do software certificado.
 */
export function vatForMonth(
  month: string,
  input: {
    invoices: { day: string; type: InvoiceType; tax: Cents; total: Cents; status: "emitida" | "anulada" }[];
    expenses: { day: string; tax: Cents }[];
    purchases: { day: string; tax: Cents }[];
  },
) {
  const inMonth = <T extends { day: string }>(rows: T[]) => rows.filter((r) => r.day.startsWith(month));
  let output = 0;
  let sales = 0;
  for (const inv of inMonth(input.invoices)) {
    if (inv.status !== "emitida" || inv.type === "recibo") continue; // o recibo não volta a liquidar IVA
    const sign = inv.type === "nota_credito" ? -1 : 1;
    output += sign * inv.tax;
    sales += sign * inv.total;
  }
  const fromExpenses = inMonth(input.expenses).reduce((s, e) => s + e.tax, 0);
  const fromPurchases = inMonth(input.purchases).reduce((s, p) => s + p.tax, 0);
  const input_ = fromExpenses + fromPurchases;
  return { sales, output, fromExpenses, fromPurchases, deductible: input_, balance: output - input_ };
}

export type StatementLine = { day: string; description: string; amount: Cents; reference: string };

/** "1.234,56" / "1 234,56" / "1234.56" / "-50,00" → cêntimos. */
export function parseAmount(text: string): number | null {
  let t = text.replace(/[\s ]|kz|aoa/gi, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  const value = Number(t);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** "28/10/2026", "28-10-2026" ou "2026-10-28" → "2026-10-28". */
export function parseDay(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

function splitRow(row: string, sep: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '"' && quoted && row[i + 1] === '"') {
      cell += '"'; // aspas dentro de um campo entre aspas
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === sep && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += c;
    }
  }
  return [...cells, cell].map((x) => x.trim());
}

/**
 * Extrato CSV do banco ou do Multicaixa: procura as colunas pelo nome do cabeçalho (data, descrição, valor ou
 * crédito/débito, referência). Só ficam as entradas de dinheiro, que são o que se concilia com os pagamentos.
 */
export function parseStatementCsv(text: string): { lines: StatementLine[]; error?: string } {
  const rows = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((r) => r.trim());
  if (rows.length < 2) return { lines: [], error: "O ficheiro não tem linhas." };
  const sep = [";", ",", "\t"].sort((a, b) => rows[0].split(b).length - rows[0].split(a).length)[0];
  const header = splitRow(rows[0], sep).map(norm);
  const find = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const col = {
    day: find("data", "date"),
    description: find("descri", "movimento", "historico", "detalhe", "description"),
    amount: find("valor", "montante", "amount", "importancia"),
    credit: find("credito", "credit", "entrada"),
    debit: find("debito", "debit", "saida"),
    reference: find("refer", "ref."),
  };
  if (col.day < 0 || (col.amount < 0 && col.credit < 0))
    return { lines: [], error: "Não encontrei as colunas de data e valor no cabeçalho do extrato." };
  const lines: StatementLine[] = [];
  for (const row of rows.slice(1)) {
    const cells = splitRow(row, sep);
    const day = parseDay(cells[col.day] ?? "");
    const credit = col.credit >= 0 ? parseAmount(cells[col.credit] ?? "") : null;
    const amount = credit ?? (col.amount >= 0 ? parseAmount(cells[col.amount] ?? "") : null);
    if (!day || !amount || amount <= 0) continue;
    lines.push({
      day,
      description: (col.description >= 0 ? cells[col.description] : "") || "",
      amount,
      reference: (col.reference >= 0 ? cells[col.reference] : "") || "",
    });
  }
  return lines.length ? { lines } : { lines: [], error: "Não encontrei entradas de dinheiro no extrato." };
}

export type MatchCandidate = { id: string; day: string; amount: Cents; orderNumber: string; reference: string };

const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/**
 * Pagamento que corresponde a uma linha do extrato: o mesmo valor, até 5 dias de diferença, e quando há
 * vários, o que tem o número do pedido ou a referência no descritivo, depois o mais próximo na data.
 */
export function matchPayment(line: StatementLine, candidates: MatchCandidate[]): MatchCandidate | null {
  const text = norm(`${line.description} ${line.reference}`);
  const options = candidates.filter((c) => c.amount === line.amount && daysBetween(c.day, line.day) <= 5);
  const named = options.filter(
    (c) => text.includes(norm(c.orderNumber)) || (c.reference && text.includes(norm(c.reference))),
  );
  const pool = named.length ? named : options.length === 1 ? options : [];
  return pool.sort((a, b) => daysBetween(a.day, line.day) - daysBetween(b.day, line.day))[0] ?? null;
}
