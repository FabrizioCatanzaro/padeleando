// El sello dorado. El degradado va inline porque Tailwind no genera utilidades
// de gradiente a partir de variables de tema.
export default function PremiumChip({ children = 'PREMIUM', className = '' }) {
  return (
    <span
      className={`shrink-0 inline-block font-condensed font-bold text-[9px] tracking-[0.12em] px-2 py-[3px] rounded-[5px] ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--color-premium), var(--color-premium-hi))',
        color: 'var(--color-premium-ink)',
      }}
    >
      {children}
    </span>
  );
}
