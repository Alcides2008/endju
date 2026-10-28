/** Colete refletor desenhado em SVG, na cor escolhida, com o logótipo do cliente (ou o da Endju) no peito. */
export function VestIllustration({
  color,
  logoUrl,
  className,
}: {
  color: string;
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 320 360" role="img" aria-label="Pré-visualização do colete refletor" className={className}>
      <defs>
        <linearGradient id="refletor" x1="0" x2="1">
          <stop offset="0" stopColor="#c9ccd1" />
          <stop offset="0.5" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#b8bcc3" />
        </linearGradient>
        <clipPath id="colete">
          <path d="M96 20 L132 20 Q160 70 188 20 L224 20 L238 70 Q262 84 270 110 L270 330 Q270 344 256 344 L64 344 Q50 344 50 330 L50 110 Q58 84 82 70 Z" />
        </clipPath>
      </defs>
      <ellipse cx="160" cy="350" rx="120" ry="8" fill="black" opacity="0.12" />
      <g clipPath="url(#colete)">
        <rect width="320" height="360" fill={color} />
        {/* Abertura central com fecho */}
        <path d="M132 20 Q160 70 188 20 L172 344 L148 344 Z" fill="black" opacity="0.08" />
        <line
          x1="160"
          y1="66"
          x2="160"
          y2="344"
          stroke="black"
          strokeOpacity="0.18"
          strokeWidth="2"
          strokeDasharray="3 4"
        />
        {/* Duas faixas refletoras */}
        <rect y="214" width="320" height="26" fill="url(#refletor)" />
        <rect y="272" width="320" height="26" fill="url(#refletor)" />
      </g>
      <path
        d="M96 20 L132 20 Q160 70 188 20 L224 20 L238 70 Q262 84 270 110 L270 330 Q270 344 256 344 L64 344 Q50 344 50 330 L50 110 Q58 84 82 70 Z"
        fill="none"
        stroke="black"
        strokeOpacity="0.15"
        strokeWidth="2"
      />
      <image
        href={logoUrl ?? "/brand/endju-logo.png"}
        x="182"
        y="112"
        width="64"
        height="44"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
