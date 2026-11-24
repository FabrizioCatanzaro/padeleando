import { Trophy, Users, BarChart2, Share2 } from 'lucide-react'
import AdRail from '../shared/AdRail'

const features = [
  {
    icon: Trophy,
    title: 'Torneos a tu medida',
    desc: 'Liga o Americano, parejas fijas o jugadores libres. Vos decidís el formato y nosotros nos encargamos de los cálculos.',
  },
  {
    icon: Users,
    title: 'Comunidad conectada',
    desc: 'Invitá jugadores con un link, seguí a tus compañeros habituales y llevá el registro de tus partidos a lo largo del tiempo.',
  },
  {
    icon: BarChart2,
    title: 'Estadísticas reales',
    desc: 'Porcentaje de victorias, racha actual, diferencial de puntos, compañeros frecuentes y mucho más en tu perfil público.',
  },
  {
    icon: Share2,
    title: 'Compartí en un click',
    desc: 'Cada torneo tiene un link de solo lectura. Cualquier persona puede seguir los resultados en vivo sin necesidad de cuenta.',
  },
]

export default function AboutView() {
  return (
    <div className="bg-base text-content font-sans pb-16">
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <p className="text-[11px] font-mono text-muted uppercase tracking-widest mb-1">Nosotros</p>
        <h1 className="font-condensed font-bold text-[30px] text-white leading-tight">
          Sobre Padeleando
        </h1>
        <p className="text-[12px] text-muted mt-1">
          Tu compañero ideal de Padel.
        </p>
      </div>

      <AdRail className="xl:max-w-6xl xl:mx-auto xl:px-6">
        <div className="max-w-2xl mx-auto px-6">
          {/* Intro */}
          <div className="mt-8 space-y-4">
            <p className="text-[14px] text-content leading-relaxed">
              <span className="text-white font-semibold">Padeleando</span> nació de una necesidad concreta:
              organizar torneos de pádel sin hojas de Excel, partidos en cuadernillos, grupos de WhatsApp interminables
              ni aplicaciones genéricas que no entienden el deporte.
            </p>
            <p className="text-[14px] text-content leading-relaxed">
              Es una plataforma pensada para jugadores amateurs y organizadores de clubes que quieren
              gestionar sus torneos de forma simple, rápida y sin costo. Desde un celular, en la cancha,
              entre partido y partido.
            </p>
          </div>

          {/* Features */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <div key={feat.title} className="bg-surface border border-border-mid rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className="text-brand" />
                    <span className="text-[13px] font-semibold text-white">{feat.title}</span>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{feat.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Stack */}
          {/* <div className="mt-10 border-t border-border pt-8">
            <h2 className="font-condensed font-bold text-[20px] text-white mb-4">Tecnología</h2>
            <p className="text-[13px] text-content leading-relaxed mb-4">
              Padeleando está construida con tecnologías modernas y pensada para escalar:
            </p>
            <ul className="space-y-2 text-[13px] text-content">
              {[
                ['Frontend', 'React 19 + Vite + Tailwind CSS'],
                ['Backend', 'Node.js + Express'],
                ['Base de datos', 'PostgreSQL serverless (Neon)'],
                ['Imágenes', 'Cloudinary'],
                ['Deployment', 'Vercel (frontend) + Render (API)'],
              ].map(([label, value]) => (
                <li key={label} className="flex gap-2">
                  <span className="text-muted w-28 shrink-0">{label}</span>
                  <span className="font-mono text-[12px]">{value}</span>
                </li>
              ))}
            </ul>
          </div> */}

          {/* Author */}
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="font-condensed font-bold text-[20px] text-white mb-3">El equipo</h2>
            <p className="text-[13px] text-content leading-relaxed">
              Padeleando es desarrollada y mantenida a pulmón, por el simple hecho de ayudar a la comunidad
              del padel que tanto me ha dado.
              {' '}
              {/* <a
                href="https://www.linkedin.com/in/luciano-fabrizio-catanzaro-pfahler/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                Fabrizio Catanzaro
              </a> */}
              Si tenés ideas, reportes de errores
              o simplemente querés decir hola, pasate por la{' '}
              <a href="/contacto" className="text-brand hover:underline">
                página de contacto
              </a>
              .
            </p>
          </div>
        </div>
      </AdRail>
    </div>
  )
}
