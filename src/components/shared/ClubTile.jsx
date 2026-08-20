import { Building2 } from 'lucide-react';

// c_fill y no c_limit: el azulejo es cuadrado y el original casi nunca lo es.
function cdnUrl(src, width) {
  if (!src?.includes('/upload/')) return src;
  return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill/`);
}

export default function ClubTile({
  photo = null,
  emojis = [],
  name = '',
  size = 42,
  round = false,
  eager = false,
}) {
  const emoji = emojis?.length > 0 ? emojis.join('') : null;
  const radius = round ? '9999px' : `${Math.round(size * 0.24)}px`;

  if (!photo) {
    return (
      <div
        className="shrink-0 flex items-center justify-center bg-surface-alt border border-border-mid leading-none"
        style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.45) }}
        title={name}
      >
        {emoji ?? <Building2 size={Math.round(size * 0.42)} className="text-muted" />}
      </div>
    );
  }

  return (
    <div className="shrink-0 relative" style={{ width: size, height: size }}>
      <img
        src={cdnUrl(photo, size * 2)}
        alt=""
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="w-full h-full object-cover border border-border-strong bg-surface-alt"
        style={{ borderRadius: radius }}
      />
      {emoji && (
        <span
          className="absolute -right-1.5 -bottom-1.5 bg-base border border-border-strong rounded-md px-1 leading-[1.35] whitespace-nowrap"
          style={{ fontSize: Math.round(size * 0.26) }}
        >
          {emoji}
        </span>
      )}
    </div>
  );
}
