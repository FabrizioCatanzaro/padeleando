import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// La preferencia se recuerda entre jornadas: el organizador que pliega jugadores
// suele querer la pantalla corta también en la siguiente.
const read = (key) => {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* modo privado */ }
};

export default function CollapsibleSection({ storageKey, title, count, badge, actions, children, className = '' }) {
  const [collapsed, setCollapsed] = useState(() => read(storageKey));

  function toggle() {
    setCollapsed((c) => { write(storageKey, !c); return !c; });
  }

  // Las acciones del encabezado (agregar) necesitan desplegar la sección: el
  // formulario que abren vive dentro del cuerpo plegado.
  function expand() {
    setCollapsed(false);
    write(storageKey, false);
  }

  return (
    <div className={`bg-surface border border-border-mid rounded-lg p-4 ${className}`}>
      <div className={`flex justify-between items-center gap-2 ${collapsed ? '' : 'mb-3'}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer font-condensed font-bold text-[13px] tracking-[3px] text-muted hover:text-white transition-colors"
        >
          <ChevronDown size={15} className={`shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          {title}
          {count != null && <span className="text-brand">{count}</span>}
          {collapsed && badge}
        </button>
        {typeof actions === 'function' ? actions(expand) : actions}
      </div>
      {!collapsed && children}
    </div>
  );
}
