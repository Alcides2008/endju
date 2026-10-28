import { formatDate } from "@/lib/dates";
import { formatKz } from "@/lib/domain/money";

const compact = new Intl.NumberFormat("pt-AO", { notation: "compact", maximumFractionDigits: 1 });
const axisKz = (cents: number) => compact.format(cents / 100);

/** Tooltip das pontas encosta à margem do gráfico em vez de centrar, para não sair do cartão. */
const tipPosition = (i: number, last: number) =>
  i === last ? "right-0" : i === 0 ? "left-0" : "left-1/2 -translate-x-1/2";

/** Topo do eixo "redondo" (1, 2, 2,5 ou 5 × 10ⁿ) acima do valor máximo. */
function niceMax(value: number) {
  const power = 10 ** Math.floor(Math.log10(value));
  return ([1, 2, 2.5, 5, 10].find((step) => step * power >= value) ?? 10) * power;
}

/**
 * Receita confirmada por semana: uma série, barras finas ancoradas na base, rótulo direto só na semana atual,
 * valor de cada semana ao passar o rato ou focar, e a tabela com os mesmos números.
 */
export function WeeklyRevenueChart({ weeks }: { weeks: { from: Date; total: number }[] }) {
  const max = niceMax(Math.max(...weeks.map((w) => w.total)));
  const last = weeks.length - 1;
  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-semibold">
        Receita confirmada por semana <span className="font-normal text-ink-3">(Kz)</span>
      </figcaption>
      <div className="relative h-52 pl-12">
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute right-0 left-12 border-t border-line" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 -left-12 w-10 text-right font-mono text-[0.6875rem] whitespace-nowrap text-ink-3">
              {axisKz(max * f)}
            </span>
          </div>
        ))}
        <ol className="relative flex h-full items-end gap-0.5">
          {weeks.map((week, i) => (
            <li
              key={week.from.toISOString()}
              tabIndex={0}
              aria-label={`Semana de ${formatDate(week.from)}: ${formatKz(week.total)}`}
              className="group relative flex h-full flex-1 items-end justify-center outline-none"
            >
              <span
                className="w-3/5 max-w-10 rounded-t-[4px] bg-chart transition-opacity group-hover:opacity-80"
                style={{ height: `${(week.total / max) * 100}%`, minHeight: week.total > 0 ? 2 : 0 }}
              />
              <span
                className={`pointer-events-none absolute ${tipPosition(i, last)} z-10 rounded-sm border border-line bg-card px-2 py-1 text-xs whitespace-nowrap shadow-sm transition-opacity ${
                  i === last ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
                style={{ bottom: `calc(${(week.total / max) * 100}% + 6px)` }}
              >
                {i === last && <span className="text-ink-3">Esta semana · </span>}
                <span className="font-medium text-ink">{formatKz(week.total)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <ol aria-hidden className="flex gap-0.5 pl-12 font-mono text-[0.6875rem] text-ink-3">
        {weeks.map((week, i) => (
          // No telemóvel só cabe uma data sim, outra não (a da semana atual fica sempre)
          <li
            key={week.from.toISOString()}
            className={`flex-1 text-center ${(last - i) % 2 ? "max-sm:invisible" : ""}`}
          >
            {week.from.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", timeZone: "Africa/Luanda" })}
          </li>
        ))}
      </ol>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-2">Ver em tabela</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead className="text-xs text-ink-3">
            <tr>
              <th scope="col" className="py-1 font-medium">
                Semana de
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Receita
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.from.toISOString()} className="border-t border-line">
                <td className="py-1">{formatDate(week.from)}</td>
                <td className="py-1 text-right font-mono text-xs">{formatKz(week.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
