import { useState } from 'react';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  '#e8f04a', // brand
  '#4af07a', // green
  '#4ab8f0', // cyan
  '#f07a4a', // orange
  '#a84af0', // purple
  '#f04a7a', // pink
  '#4af0d0', // teal
  '#f0d04a', // yellow-warm
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PlayerAvatar({ name, src, size = 32, premium = false, className = '', style = {} }) {
  const [erroredSrc, setErroredSrc] = useState(null);

  const showImage = !!src && erroredSrc !== src;
  const initials  = getInitials(name);
  const color     = getAvatarColor(name || '');
  const inner = showImage ? (
    <img
      src={src}
      alt={name || ''}
      onError={() => setErroredSrc(src)}
      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
    />
  ) : (
    <div style={{
      width: '100%', height: '100%', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // Sin foto y sin premium el fondo era translúcido, así que el avatar se
      // transparentaba sobre cualquier cosa que tuviera detrás (la portada del
      // perfil, un mapa, una foto). El color-mix da el mismo tono exacto que el
      // alfa anterior sobre un fondo liso, pero opaco. El caso premium sigue
      // translúcido a propósito: apoya sobre el degradado dorado del anillo, que
      // ya es opaco, y es lo que hace legible el texto negro de las iniciales.
      backgroundColor: premium ? `${color}33` : `color-mix(in srgb, ${color} 10%, var(--color-base))`,
      color: premium ? '#000' : color,
      fontSize: Math.round(size * 0.38),
      fontFamily: "'Unbounded', sans-serif",
      fontWeight: 700,
      letterSpacing: 0.5,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );

  if (premium) {
    const pad = Math.max(2, Math.round(size * 0.07));
    return (
      <div
        className={`shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          padding: pad,
          // Tokenizado: en tema claro el dorado se oscurece o el aro desaparece
          // sobre el fondo blanco. El glow se apaga en avatares chicos, donde
          // el resplandor terminaba siendo más grande que el avatar.
          background: 'linear-gradient(135deg, var(--color-premium), var(--color-premium-hi), var(--color-premium))',
          boxShadow: size >= 40
            ? `0 0 ${Math.round(size * 0.3)}px color-mix(in srgb, var(--color-premium) 40%, transparent)`
            : 'none',
          flexShrink: 0,
          ...style,
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.5px solid ${color}55`,
        flexShrink: 0,
        ...style,
      }}
    >
      {inner}
    </div>
  );
}

export function PairAvatar({ name1, name2, src1, src2, size = 32 }) {
  const overlap = Math.round(size * 0.05);
  return (
    <div className="flex items-center shrink-0" style={{ width: size * 2 - overlap }}>
      <PlayerAvatar name={name1} src={src1} size={size} style={{ zIndex: 1 }} />
      <PlayerAvatar name={name2} src={src2} size={size} style={{ marginLeft: -overlap, zIndex: 0 }} />
    </div>
  );
}
