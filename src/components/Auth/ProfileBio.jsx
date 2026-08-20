import { useCallback, useRef, useState } from 'react';

// Antes el "ver más" se decidía contando caracteres (>140), así que aparecía
// también cuando el texto entraba entero: prometía algo que no había. Ahora se
// mide el desborde real del elemento.
//
// El setState vive en el callback del ResizeObserver, no en un efecto: el
// observer dispara una vez al observar, así que la medición inicial entra por
// el mismo camino que los cambios de ancho.
export default function ProfileBio({ text, className = '' }) {
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);

  const ref = useCallback((node) => {
    if (!node) return;
    const measure = () => setClipped(node.scrollHeight > node.clientHeight + 1);
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const box = useRef(null);

  if (!text) return null;

  return (
    <div className={className}>
      <p
        ref={(n) => { box.current = n; if (!open) ref(n); }}
        className={`font-sans text-[13.5px] text-content leading-relaxed m-0 break-words ${open ? '' : 'line-clamp-2'}`}
      >
        {text}
      </p>
      {(clipped || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 font-mono text-[11px] text-brand bg-transparent border-0 p-0 cursor-pointer hover:underline"
        >
          {open ? 'ver menos' : 'ver más'}
        </button>
      )}
    </div>
  );
}
