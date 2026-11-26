import { MessageCircle, Phone, Mail, Instagram } from 'lucide-react';

// Espejo de lib/signup.js del backend, que es el que manda.

export const CONTACT_META = {
  whatsapp:  { label: 'WhatsApp',  icon: MessageCircle, placeholder: '+54 9 11 1234-5678' },
  phone:     { label: 'Teléfono',  icon: Phone,         placeholder: '+54 11 4321-1234' },
  email:     { label: 'Mail',      icon: Mail,          placeholder: 'inscripciones@club.com' },
  instagram: { label: 'Instagram', icon: Instagram,     placeholder: '@tucuenta' },
};

export const CONTACT_TYPES = Object.keys(CONTACT_META);

// Contactos que salen del perfil del organizador: WhatsApp público e Instagram.
export function profileContacts(owner) {
  const out = [];
  const wa = owner?.whatsapp ? String(owner.whatsapp).replace(/\D/g, '') : '';
  if (wa && owner.whatsapp_public !== false) out.push({ type: 'whatsapp', value: `+${wa}`, from_profile: true });
  const ig = owner?.instagram ? String(owner.instagram).trim().replace(/^@/, '') : '';
  if (ig) out.push({ type: 'instagram', value: `@${ig}`, from_profile: true });
  return out;
}

// Los del perfil primero; los cargados a mano pisan su canal.
export function mergeContacts(profile, own) {
  const ownTypes = new Set((own ?? []).map((c) => c.type));
  return [...(profile ?? []).filter((c) => !ownTypes.has(c.type)), ...(own ?? [])];
}

export function resolveSignup(tournament, group, ownerProfile = null) {
  const pick = (k) => (tournament?.[k] ?? group?.[k] ?? null);
  return {
    open:     pick('signup_open') ?? false,
    price:    pick('signup_price'),
    unit:     pick('signup_price_unit') ?? 'player',
    contacts: mergeContacts(profileContacts(ownerProfile), pick('signup_contacts') ?? []),
  };
}

export function formatPrice(price, unit) {
  if (price == null) return null;
  if (price === 0) return 'Gratis';
  return `$${Number(price).toLocaleString('es-AR')} por ${unit === 'pair' ? 'pareja' : 'jugador'}`;
}

const digits = (v) => String(v).replace(/\D/g, '');

// Link accionable de un contacto. El mensaje ya viene armado donde aplica.
export function contactHref(contact, tournamentName) {
  const value = String(contact?.value ?? '').trim();
  if (!value) return null;
  const msg = `Hola! Quiero inscribirme${tournamentName ? ` en ${tournamentName}` : ''}.`;
  switch (contact.type) {
    case 'whatsapp':  return `https://wa.me/${digits(value)}?text=${encodeURIComponent(msg)}`;
    case 'phone':     return `tel:${value.replace(/[^\d+]/g, '')}`;
    case 'email':     return `mailto:${value}?subject=${encodeURIComponent(msg)}`;
    case 'instagram': return `https://instagram.com/${value.replace(/^@/, '')}`;
    default:          return null;
  }
}

// Hay algo que mostrar: el interruptor está activo y hay precio o contactos.
export function hasSignupInfo(signup) {
  return !!signup?.open && (signup.price != null || (signup.contacts?.length ?? 0) > 0);
}

// En hora local y no con toISOString: en Argentina, después de las 21 el día UTC
// ya es el siguiente y una jornada de hoy se leería como pasada.
function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// La insignia de "inscripción abierta" en la tarjeta de una jornada.
//
// resolveSignup hereda del grupo, así que una categoría con signup_open se lo
// pasa a TODAS sus jornadas: sin estas guardas la insignia aparecería en cada
// tarjeta y dejaría de significar algo. Misma regla que la consulta `signup` de
// GET /api/home, para que las dos superficies coincidan.
export function showsSignup(tournament, signup) {
  if (!hasSignupInfo(signup)) return false;
  if (tournament?.status === 'finished') return false;
  const day = String(tournament?.event_date ?? '').slice(0, 10);
  return !day || day >= todayKey();
}
