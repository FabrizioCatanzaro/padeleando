import { CONTACT_META, contactHref, formatPrice } from '../../utils/signup';

// Los contactos son lo único accionable: no hay alta in-app todavía.
export default function SignupFooter({ t }) {
  const price = formatPrice(t.signup?.price, t.signup?.unit);
  const contacts = t.signup?.contacts ?? [];
  return (
    <div className="mt-2 pt-2 border-t border-border-mid">
      {price && <div className="font-condensed font-bold text-[15px] text-brand leading-none mb-2">{price}</div>}
      {contacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contacts.slice(0, 3).map((c) => {
            const meta = CONTACT_META[c.type];
            const href = contactHref(c, t.name);
            if (!meta || !href) return null;
            const Icon = meta.icon;
            return (
              <a
                key={c.type}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={meta.label}
                className="inline-flex items-center gap-1 border border-border-mid rounded-full px-2 py-1 font-mono text-[10px] text-secondary hover:border-brand hover:text-brand transition-colors no-underline"
              >
                <Icon size={11} />{meta.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
