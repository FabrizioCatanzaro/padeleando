// Cancha vista desde arriba: piso con su color, borde según las paredes
export default function CourtGlyph({ color, wall = 'var(--color-court-glass)', className = '' }) {
  return (
    <svg viewBox="0 0 40 70" className={className} aria-hidden="true">
      <rect x="1" y="1" width="38" height="68" rx="2" fill={color} stroke={wall} strokeWidth="2" />
      <line x1="1" y1="35" x2="39" y2="35" stroke="var(--color-photo-ink)" strokeWidth="1.5" />
      <line x1="1" y1="15" x2="39" y2="15" stroke="var(--color-photo-ink)" strokeOpacity="0.6" />
      <line x1="1" y1="55" x2="39" y2="55" stroke="var(--color-photo-ink)" strokeOpacity="0.6" />
      <line x1="20" y1="15" x2="20" y2="55" stroke="var(--color-photo-ink)" strokeOpacity="0.6" />
    </svg>
  )
}
