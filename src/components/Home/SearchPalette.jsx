import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, Building2, UserRound, Trophy, X } from 'lucide-react';
import ClubTile from '../shared/ClubTile';
import { fmt } from '../../utils/helpers';

const GROUPS = [
  { key: 'users',  label: 'PERFILES',   icon: UserRound },
  { key: 'groups', label: 'CATEGORÍAS', icon: Trophy },
  { key: 'tours',  label: 'TORNEOS',    icon: Trophy },
  { key: 'clubs',  label: 'CLUBES',     icon: Building2 },
];

const META = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

function label(key, item) {
  if (key === 'users')  return { title: item.name, sub: `@${item.username}` };
  if (key === 'groups') return { title: item.name, sub: item.owner_username ? `@${item.owner_username}` : '' };
  if (key === 'clubs')  return { title: item.name, sub: item.location_name ?? '' };
  return {
    title: item.name,
    sub: [item.group_name, item.day ? fmt(item.day) : null].filter(Boolean).join(' · '),
  };
}

const href = (key, item) =>
  key === 'users'  ? `/u/${item.username}`
  : key === 'groups' ? `/cat/${item.id}`
  : key === 'clubs'  ? `/club/${item.id}`
  : `/view/${item.id}`;

// Buscador como paleta: el input permanente se comía el primer pantallazo del
// usuario con sesión, que casi siempre viene a sus categorías y no a buscar.
export default function SearchPalette({ open, onClose, search, onNavigate }) {
  const { q, setQ, live, liveCount, searching, commit } = search;
  const inputRef = useRef(null);
  const listRef  = useRef(null);
  const [selRaw, setSel] = useState(0);

  const flat = useMemo(() => {
    const rows = [];
    GROUPS.forEach(({ key }) => (live[key] ?? []).forEach((item) => rows.push({ key, item })));
    if (rows.length > 0) rows.push({ key: 'all' });
    return rows;
  }, [live]);

  // El índice se acota en el render: los resultados llegan asincrónicos y la
  // lista puede encoger debajo de la selección.
  const sel = Math.min(selRaw, Math.max(flat.length - 1, 0));

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel, open]);

  if (!open) return null;

  function activate(row) {
    if (!row || row.key === 'all') { commit(); onClose(); return; }
    onNavigate(href(row.key, row.item));
    onClose();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey || flat.length === 0) { commit(); onClose(); return; }
      activate(flat[sel]);
    }
  }

  const short = q.trim().length < 2;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 sm:pt-[10vh] backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-label="Buscador"
        className="w-full h-full sm:h-auto sm:max-w-xl bg-surface border border-border-strong sm:rounded-xl overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-mid shrink-0">
          {searching
            ? <Loader2 size={18} className="text-muted animate-spin shrink-0" />
            : <Search size={18} className="text-muted shrink-0" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={onKeyDown}
            placeholder="Buscar jugadores, torneos, categorías o clubes..."
            className="flex-1 bg-transparent border-0 outline-none text-white text-[15px] font-sans placeholder:text-muted"
          />
          <button
            onClick={onClose}
            aria-label="Cerrar buscador"
            className="shrink-0 bg-transparent border-0 text-dim hover:text-soft cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 sm:max-h-[52vh] overflow-y-auto">
          {short && (
            <div className="px-4 py-8 text-center text-sm text-muted font-sans">
              Escribí al menos 2 letras para buscar.
            </div>
          )}
          {!short && searching && liveCount === 0 && (
            <div className="px-4 py-8 text-center text-xs font-mono text-muted">Buscando...</div>
          )}
          {!short && !searching && liveCount === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted font-sans">Sin resultados.</div>
          )}

          {flat.map((row, i) => {
            if (row.key === 'all') {
              return (
                <div
                  key="all"
                  data-idx={i}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => { commit(); onClose(); }}
                  className={`flex items-center gap-3 px-4 py-3 mt-1.5 cursor-pointer border-t border-border-mid border-l-2 ${
                    sel === i ? 'bg-surface-alt border-l-brand' : 'border-l-transparent'
                  }`}
                >
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-surface-alt border border-border-mid flex items-center justify-center text-brand">
                    <Search size={15} />
                  </span>
                  <div className="font-condensed font-bold text-sm text-white">
                    Ver todos los resultados para &ldquo;{q.trim()}&rdquo;
                  </div>
                </div>
              );
            }

            const { key, item } = row;
            const GroupIcon = META[key].icon;
            const { title, sub } = label(key, item);
            const newGroup = i === 0 || flat[i - 1].key !== key;

            return (
              <div key={`${key}-${item.id}`}>
                {newGroup && (
                  <div className="px-4 pt-3 pb-1.5 font-condensed font-bold text-[10px] tracking-widest text-dim">
                    {META[key].label}
                  </div>
                )}
                <div
                  data-idx={i}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => activate(row)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-l-2 ${
                    sel === i ? 'bg-surface-alt border-brand' : 'border-transparent'
                  }`}
                >
                  {key === 'clubs' || key === 'groups' ? (
                    <ClubTile
                      photo={key === 'clubs' ? item.photo_url : item.club_photo_url}
                      emojis={key === 'groups' ? item.emojis : []}
                      size={32}
                      round={key === 'clubs'}
                    />
                  ) : (
                    <span className="shrink-0 w-8 h-8 rounded-lg bg-surface-alt border border-border-mid flex items-center justify-center text-muted">
                      <GroupIcon size={15} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="font-condensed font-bold text-sm text-white truncate">{title}</div>
                    {sub && <div className="font-mono text-[11px] text-muted truncate">{sub}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 border-t border-border-mid bg-surface-alt font-mono text-[10px] text-dim shrink-0">
          <span><kbd className="border border-border-strong rounded px-1 py-0.5 mr-1.5">↑↓</kbd>navegar</span>
          <span><kbd className="border border-border-strong rounded px-1 py-0.5 mr-1.5">↵</kbd>abrir</span>
          <span className="ml-auto"><kbd className="border border-border-strong rounded px-1 py-0.5 mr-1.5">⇧↵</kbd>ver todos</span>
        </div>
      </div>
    </div>
  );
}
