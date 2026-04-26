'use client';

interface LogoProps {
  size?: number;
  className?: string;
}

// Veronica AI logo: minimalist bus icon
export function Logo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <defs>
        <linearGradient id='logoGrad' x1='0' y1='0' x2='48' y2='48' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='var(--brand-from)' />
          <stop offset='100%' stopColor='var(--brand-to)' />
        </linearGradient>
      </defs>

      {/* Rounded background square */}
      <rect x='2' y='2' width='44' height='44' rx='12' fill='var(--bg-alt)' stroke='url(#logoGrad)' strokeWidth='1.5' />

      {/* Bus body */}
      <rect x='9' y='14' width='30' height='20' rx='3.5' fill='url(#logoGrad)' />

      {/* Top stripe (roof line) */}
      <rect x='9' y='14' width='30' height='2.5' rx='1.2' fill='var(--bg-alt)' opacity='0.25' />

      {/* Front windshield */}
      <rect x='32' y='17' width='5' height='7' rx='1' fill='var(--bg-alt)' opacity='0.85' />

      {/* Side windows (3 windows) */}
      <rect x='11.5' y='17.5' width='5' height='6' rx='0.8' fill='var(--bg-alt)' opacity='0.85' />
      <rect x='18' y='17.5' width='5' height='6' rx='0.8' fill='var(--bg-alt)' opacity='0.85' />
      <rect x='24.5' y='17.5' width='5' height='6' rx='0.8' fill='var(--bg-alt)' opacity='0.85' />

      {/* Door */}
      <rect x='29' y='25' width='3' height='7' rx='0.6' fill='var(--bg-alt)' opacity='0.4' />

      {/* Headlight */}
      <circle cx='37' cy='29' r='1.3' fill='#fef9c3' />

      {/* Wheels */}
      <circle cx='15' cy='35' r='3' fill='var(--bg)' stroke='url(#logoGrad)' strokeWidth='1.2' />
      <circle cx='15' cy='35' r='1.2' fill='url(#logoGrad)' />
      <circle cx='33' cy='35' r='3' fill='var(--bg)' stroke='url(#logoGrad)' strokeWidth='1.2' />
      <circle cx='33' cy='35' r='1.2' fill='url(#logoGrad)' />
    </svg>
  );
}
