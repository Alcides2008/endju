/**
 * Transição de entrada em cada navegação (o template remonta a cada rota).
 * Animação CSS em vez de JS: corre logo na primeira pintura e não atrasa o LCP à espera da hidratação.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
