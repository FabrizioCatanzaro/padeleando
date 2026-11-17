import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    q: '¿Qué es Padeleando?',
    a: 'Padeleando es una plataforma gratuita para organizar y gestionar torneos de pádel. Podés crear torneos en formato Liga o Americano, cargar resultados en tiempo real, ver tablas de posiciones, estadísticas de jugadores y compartir el torneo con un link público.',
  },
  {
    q: '¿Necesito crear una cuenta para usarlo?',
    a: 'Para ver torneos públicos o el perfil de un jugador no necesitás cuenta. Para crear torneos, registrar resultados o acceder a estadísticas personales sí necesitás registrarte. El registro es gratuito.',
  },
  {
    q: '¿Qué formatos de torneo hay?',
    a: 'Ofrecemos dos formatos: Liga (todos contra todos con tabla de posiciones) y Americano (fase de grupos + cuadro de eliminación). El formato de Liga tiene dos modos: jugadores libres (las parejas rotan cada partido) y parejas fijas.',
  },
  {
    q: '¿Cómo invito jugadores a mi torneo?',
    a: 'Desde la vista del torneo podés compartir un link de invitación. Los jugadores que tengan cuenta en Padeleando pueden vincularse a su slot dentro del torneo; a partir de ahí sus resultados quedan asociados a su perfil.',
  },
  {
    q: '¿Qué es una cuenta Premium?',
    a: 'La cuenta Premium desbloquea funciones adicionales como agregar álbum de fotos en torneos, avatar personalizado, acceso a estadísticas avanzadas de partidos, estadísticas avanzadas personales y creación ilimitada de torneos.',
  },
  {
    q: '¿Cómo se calculan las estadísticas?',
    a: 'Las posiciones se calculan por victorias, luego por diferencia de puntos y finalmente por puntos a favor. Las estadísticas personales (racha, % victorias, compañeros frecuentes) se calculan sobre todos los torneos en los que participaste y están vinculados a tu cuenta.',
  },
  {
    q: '¿Puedo hacer el torneo privado?',
    a: 'Sí. Podés crear categorías privadas y todos los torneos dentro de esa categoría estarán ocultos. Los torneos privados no aparecen en búsquedas públicas y solo los miembros autorizados pueden verlos. Los torneos privados se pueden compartir en "Modo lectura" pero no permite ver el resto de torneos de la categoría.',
  },
  {
    q: '¿Puedo ver un torneo en progreso sin ser participante?',
    a: 'Sí. Cada torneo tiene un link de solo lectura que podés compartir libremente. Cualquier persona puede seguir los resultados en tiempo real sin necesidad de tener una cuenta en Padeleando.',
  },
  {
    q: '¿En qué dispositivos funciona?',
    a: 'Padeleando es una aplicación web optimizada para móviles y escritorio. No requiere instalación; funciona directamente desde el navegador.',
  },
  {
    q: '¿Cómo puedo contactarlos?',
    a: 'Podés escribirnos a soporte@padeleando.ar. También encontrás más formas de contacto en la sección Contacto de este sitio.',
  },
]

function FAQItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-start gap-4 py-5 px-0 text-left"
      >
        <span className="text-[14px] font-semibold text-white leading-snug">{item.q}</span>
        {open
          ? <ChevronUp size={16} className="text-brand shrink-0 mt-0.5" />
          : <ChevronDown size={16} className="text-muted shrink-0 mt-0.5" />}
      </button>
      {open && (
        <p className="text-[13px] text-content leading-relaxed pb-5">{item.a}</p>
      )}
    </div>
  )
}

export default function FAQView() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div className="bg-base text-content font-sans pb-16">
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <p className="text-[11px] font-mono text-muted uppercase tracking-widest mb-1">Ayuda</p>
        <h1 className="font-condensed font-bold text-[30px] text-white leading-tight">
          Preguntas frecuentes
        </h1>
        <p className="text-[12px] text-muted mt-1">
          Todo lo que necesitás saber sobre Padeleando.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 mt-2">
        {faqs.map((item, i) => (
          <FAQItem
            key={i}
            item={item}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-6 mt-10">
        <div className="bg-surface border border-border-mid rounded-lg p-5">
          <p className="text-[13px] text-content">
            ¿No encontraste lo que buscabas?{' '}
            <a href="/contacto" className="text-brand hover:underline">
              Escribinos
            </a>{' '}
            y te respondemos a la brevedad.
          </p>
        </div>
      </div>
    </div>
  )
}
