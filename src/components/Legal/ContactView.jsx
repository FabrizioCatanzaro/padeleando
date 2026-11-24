import { Mail, Phone, Linkedin, MessageCircle } from 'lucide-react'
import AdRail from '../shared/AdRail'

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: 'soporte@padeleando.ar',
    href: 'mailto:soporte@padeleando.ar',
    desc: 'Para consultas generales, soporte técnico o sugerencias.',
  },
  {
    icon: Phone,
    label: 'WhatsApp',
    value: '+54 9 11 2503-1107',
    href: 'https://wa.me/5491125031107',
    desc: 'Respuesta rápida para consultas urgentes.',
    external: true,
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'Fabrizio Catanzaro',
    href: 'https://www.linkedin.com/in/luciano-fabrizio-catanzaro-pfahler/',
    desc: 'Conectá profesionalmente con el desarrollador.',
    external: true,
  },
]

export default function ContactView() {
  return (
    <div className="bg-base text-content font-sans pb-16">
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <p className="text-[11px] font-mono text-muted uppercase tracking-widest mb-1">Soporte</p>
        <h1 className="font-condensed font-bold text-[30px] text-white leading-tight">
          Contacto
        </h1>
        <p className="text-[12px] text-muted mt-1">
          Estamos para ayudarte. Elegí el canal que prefieras.
        </p>
      </div>

      <AdRail className="xl:max-w-6xl xl:mx-auto xl:px-6">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mt-8 space-y-4">
            {channels.map((ch) => {
              const Icon = ch.icon
              return (
              <a
                key={ch.label}
                href={ch.href}
                target={ch.external ? '_blank' : undefined}
                rel={ch.external ? 'noopener noreferrer' : undefined}
                className="flex items-start gap-4 bg-surface border border-border-mid rounded-lg p-5 hover:border-border-strong transition-colors group"
              >
                <div className="mt-0.5 p-2 rounded-md bg-base border border-border-strong">
                  <Icon size={16} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-muted uppercase tracking-widest mb-0.5">{ch.label}</p>
                  <p className="text-[14px] font-semibold text-white group-hover:text-brand transition-colors truncate">
                    {ch.value}
                  </p>
                  <p className="text-[12px] text-muted mt-1">{ch.desc}</p>
                </div>
              </a>
              )
            })}
          </div>

          <div className="mt-10 border-t border-border pt-8">
            <div className="flex items-start gap-3">
              <MessageCircle size={16} className="text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-white mb-1">Tiempo de respuesta</p>
                <p className="text-[13px] text-muted leading-relaxed">
                  Respondemos todas las consultas dentro de las <span className="text-content">48 horas hábiles</span>.
                  Para soporte técnico urgente recomendamos WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-surface border border-border-mid rounded-lg p-5">
            <p className="text-[12px] text-muted leading-relaxed">
              Si tenés conocimientos técnicos y encontraste un bug o querés proponer una funcionalidad, también podés abrir
              un issue directamente en nuestro repositorio. Incluí capturas de pantalla y
              pasos para reproducir el problema — eso acelera mucho la resolución.
            </p>
          </div>
        </div>
      </AdRail>
    </div>
  )
}
