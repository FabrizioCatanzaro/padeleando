import { useCallback } from 'react';

const INTERACTIVO = 'button, a, input, select, textarea, label, [role="button"], [contenteditable="true"]';
const UMBRAL = 5;

export default function useDragScroll() {
  return useCallback((el) => {
    if (!el) return;
    let drag = null;
    let movido = false;

    const scrolleable = () => {
      const cs = getComputedStyle(el);
      const x = /auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
      const y = /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
      return x || y;
    };
    const marcar = () => { if (!drag) el.style.cursor = scrolleable() ? 'grab' : ''; };

    const onMove = (e) => {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!movido && Math.hypot(dx, dy) < UMBRAL) return;
      movido = true;
      el.scrollLeft = drag.left - dx;
      el.scrollTop = drag.top - dy;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      el.style.userSelect = '';
      drag = null;
      marcar();
    };
    const onDown = (e) => {
      if (e.button !== 0 || e.target.closest(INTERACTIVO) || !scrolleable()) return;
      e.preventDefault();
      movido = false;
      drag = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    // Un arrastre no debe abrir la card donde se soltó.
    const onClick = (e) => {
      if (!movido) return;
      movido = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const ro = new ResizeObserver(marcar);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener('mousedown', onDown);
    el.addEventListener('click', onClick, true);
    marcar();

    return () => {
      ro.disconnect();
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('click', onClick, true);
      if (drag) onUp();
      el.style.cursor = '';
    };
  }, []);
}
