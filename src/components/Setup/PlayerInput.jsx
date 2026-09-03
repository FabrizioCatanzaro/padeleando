import { useState, useRef, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { normalize } from '../../utils/helpers';
import { api } from '../../utils/api';

// groupId: filtra solo jugadores de ese grupo específico.
// searchMine: filtra jugadores de todos los grupos del usuario autenticado (para Setup).
export default function PlayerInput({ value, onChange, placeholder, className, groupId, searchMine }) {
  const [suggestions, setSuggestions] = useState([]);
  const [contacts, setContacts]       = useState([]);
  const [open, setOpen]               = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const ref             = useRef();
  const listRef         = useRef();
  const contactsFetched = useRef(false);

  const isAt   = value.startsWith('@');
  const isEmpty = !value.trim();

  // Fetch followers+following once when searchMine is true
  useEffect(() => {
    if (!searchMine || contactsFetched.current) return;
    contactsFetched.current = true;
    api.follows.contacts().then(setContacts).catch(() => {});
  }, [searchMine]);

  useEffect(() => {
    if (!value.trim()) {
      const t = setTimeout(() => setSuggestions([]), 0);
      return () => clearTimeout(t);
    }

    const t = setTimeout(async () => {
      try {
        if (isAt) {
          const q = value.slice(1);
          if (!q) { setSuggestions([]); return; }
          const users = await api.auth.search(q);
          setSuggestions(users);
        } else {
          const players = await api.players.search(value, groupId, searchMine);
          setSuggestions(players);
        }
      } catch { setSuggestions([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [value, groupId, searchMine, isAt]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Filter contacts by typed text (name or username)
  const filteredContacts = useMemo(() => contacts.filter((c) => {
    if (isEmpty) return true;
    if (isAt) return false;
    const q = normalize(value);
    return normalize(c.name).includes(q) || c.username.toLowerCase().includes(value.toLowerCase());
  }), [contacts, isEmpty, isAt, value]);

  // Flat list of selectable items for keyboard navigation
  // Each item: { key, label, sub, section, onSelect }
  const items = useMemo(() => {
    if (isAt) {
      return suggestions.map((u) => ({
        key: u.id,
        label: u.name,
        sub: '@' + u.username,
        section: null,
        onSelect: () => onChange('@' + u.username),
      }));
    }

    const contactSlice = filteredContacts.slice(0, isEmpty ? 8 : 4);
    const contactItems = contactSlice.map((c) => ({
      key: c.id,
      label: c.name,
      sub: '@' + c.username,
      section: isEmpty ? 'TUS CONTACTOS' : 'CONTACTOS',
      onSelect: () => onChange('@' + c.username),
    }));

    const playerItems = (!isEmpty ? suggestions : []).map((p) => ({
      key: p.id,
      label: p.name,
      sub: null,
      section: contactItems.length > 0 ? 'ANTERIORES' : null,
      onSelect: () => onChange(p.name),
    }));

    return [...contactItems, ...playerItems];
  }, [isAt, suggestions, filteredContacts, isEmpty, onChange]);

  const showDropdown = open && items.length > 0;
  // Clamp activeIdx so stale values never point outside the current item list
  const safeIdx = activeIdx >= items.length ? -1 : activeIdx;

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current || safeIdx < 0) return;
    const el = listRef.current.querySelectorAll('[data-item]')[safeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeIdx]);

  function handleKeyDown(e) {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && safeIdx >= 0) {
      e.preventDefault();
      items[safeIdx].onSelect();
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const matchedUser = isAt ? suggestions.find((u) => ('@' + u.username) === value.toLowerCase()) : null;
  const isExisting  = !isAt && suggestions.some((p) => normalize(p.name) === normalize(value));

  // `check` es una bandera aparte del texto: antes la tilde vivía dentro del
  // string y no había forma de dibujarla como ícono.
  const badge = (() => {
    if (!value.trim()) return null;
    if (isAt) {
      if (!value.slice(1)) return null;
      return matchedUser ? { text: '@USUARIO', check: true, color: 'text-green' } : null;
    }
    return isExisting
      ? { text: 'EXISTE', check: true,  color: 'text-green' }
      : { text: 'NUEVO',  check: false, color: 'text-brand' };
  })();

  // Group items by section for rendering
  const sections = useMemo(() => {
    const result = [];
    let currentSection = undefined;
    let startIdx = 0;
    items.forEach((item, i) => {
      if (item.section !== currentSection) {
        if (currentSection !== undefined) {
          result.push({ label: currentSection, items: items.slice(startIdx, i), startIdx });
        }
        currentSection = item.section;
        startIdx = i;
      }
    });
    if (currentSection !== undefined) {
      result.push({ label: currentSection, items: items.slice(startIdx), startIdx });
    }
    return result;
  }, [items]);

  return (
    <div ref={ref} className={`relative flex-1 ${className ?? ''}`}>
      <div className="relative">
        <input
          className="w-full bg-surface border border-border-mid text-white px-3.5 py-2.5 font-sans text-[14px] rounded-sm outline-none pr-22.5"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {badge && (
          <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono tracking-wide pointer-events-none flex items-center gap-1 ${badge.color}`}>
            {badge.check && <Check size={11} strokeWidth={3} className="shrink-0" />}
            {badge.text}
          </span>
        )}
      </div>

      {showDropdown && (
        <div ref={listRef} className="absolute top-full left-0 right-0 z-100 bg-surface-alt border border-border-strong border-t-0 rounded-b-sm max-h-52 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.label ?? '__root'}>
              {section.label && (
                <div className="px-3.5 py-1 text-[9px] font-mono tracking-widest text-dim border-b border-border-mid bg-surface">
                  {section.label}
                </div>
              )}
              {section.items.map((item, i) => {
                const globalIdx = section.startIdx + i;
                const isActive  = globalIdx === safeIdx;
                return (
                  <div
                    key={item.key}
                    data-item
                    onMouseDown={() => { item.onSelect(); setOpen(false); }}
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                    className={`px-3.5 py-2.25 cursor-pointer text-[14px] text-content font-sans border-b border-border-mid flex justify-between items-center gap-3 ${isActive ? 'bg-border-mid' : 'hover:bg-border-mid'}`}
                  >
                    <span>{item.label}</span>
                    {item.sub && (
                      <span className="text-[11px] text-muted font-mono shrink-0">{item.sub}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
