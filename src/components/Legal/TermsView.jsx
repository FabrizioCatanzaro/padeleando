import AdRail from '../shared/AdRail'

const LAST_UPDATED = '30 de abril de 2026'

function Section({ title, children }) {
  return (
    <section className="mt-8 border-t border-border pt-8">
      <h2 className="font-condensed font-bold text-[20px] text-white mb-3">{title}</h2>
      <div className="space-y-3 text-[13px] text-content leading-relaxed">{children}</div>
    </section>
  )
}

export default function TermsView() {
  return (
    <div className="bg-base text-content font-sans pb-16">
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <p className="text-[11px] font-mono text-muted uppercase tracking-widest mb-1">Legal</p>
        <h1 className="font-condensed font-bold text-[30px] text-white leading-tight">
          Términos y Condiciones
        </h1>
        <p className="text-[12px] text-muted mt-1">
          Última actualización: <span className="font-mono">{LAST_UPDATED}</span>
        </p>
      </div>

      <AdRail className="xl:max-w-6xl xl:mx-auto xl:px-6">
        <div className="max-w-2xl mx-auto px-6">
          {/* Aviso de vigencia */}
          <div className="mt-6 bg-surface border border-border-mid rounded-lg p-4">
            <p className="text-[12px] text-muted leading-relaxed">
              <span className="text-white font-semibold">Aviso importante:</span> Estos Términos y
              Condiciones pueden ser actualizados en cualquier momento. Te notificaremos sobre cambios
              significativos por correo electrónico o mediante un aviso visible en la plataforma.
              El uso continuado del servicio después de la publicación de cambios implica tu aceptación
              de los nuevos términos.
            </p>
          </div>

          {/* Intro */}
          <div className="mt-8">
            <p className="text-[13px] text-content leading-relaxed">
              Bienvenido a <span className="text-white font-semibold">Padeleando</span> ("la Plataforma",
              "nosotros"). Al acceder o utilizar nuestros servicios, aceptás estos Términos y Condiciones
              en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar el servicio.
            </p>
          </div>

          <Section title="1. Descripción del servicio">
            <p>
              Padeleando es una plataforma web para la gestión de torneos de pádel. Permite crear y
              administrar torneos en formato Liga y Americano, registrar resultados, visualizar
              estadísticas y compartir torneos públicamente.
            </p>
            <p>
              El acceso básico al servicio es gratuito. Ciertas funcionalidades adicionales pueden
              estar disponibles exclusivamente para usuarios con suscripción Premium.
            </p>
          </Section>

          <Section title="2. Registro y cuenta de usuario">
            <p>
              Para acceder a funcionalidades que requieren autenticación, debés crear una cuenta
              proporcionando información veraz, completa y actualizada. Sos responsable de mantener la
              confidencialidad de tus credenciales y de toda la actividad que ocurra bajo tu cuenta.
            </p>
            <p>
              Podés registrarte mediante correo electrónico y contraseña, o a través de tu cuenta de
              Google (OAuth 2.0). Al usar Google OAuth, autorizás a Padeleando a recibir tu nombre
              y dirección de correo electrónico de Google.
            </p>
            <p>
              Nos reservamos el derecho de suspender o eliminar cuentas que violen estos términos,
              usen el servicio para actividades ilegales o proporcionen información falsa.
            </p>
          </Section>

          <Section title="3. Uso aceptable">
            <p>Al usar Padeleando te comprometés a:</p>
            <ul className="list-disc list-inside space-y-1 text-[13px] text-content pl-2">
              <li>No usar el servicio para fines ilegales o no autorizados.</li>
              <li>No intentar acceder a cuentas de terceros sin autorización.</li>
              <li>No cargar contenido ofensivo, difamatorio o que infrinja derechos de terceros.</li>
              <li>No realizar acciones que sobrecarguen o interfieran con la infraestructura del servicio.</li>
              <li>No revertir, descompilar o intentar extraer el código fuente de la Plataforma.</li>
            </ul>
          </Section>

          <Section title="4. Contenido del usuario">
            <p>
              Al cargar fotos, nombres u otro contenido a la Plataforma, declarás que tenés los derechos
              necesarios para hacerlo y que dicho contenido no infringe derechos de terceros.
            </p>
            <p>
              Padeleando se reserva el derecho de eliminar contenido que viole estos términos, sin
              necesidad de notificación previa.
            </p>
            <p>
              Las imágenes cargadas son almacenadas en Cloudinary bajo sus propias políticas de uso.
              Al cargar imágenes aceptás también sus términos de servicio.
            </p>
          </Section>

          <Section title="5. Suscripción Premium">
            <p>
              Padeleando puede ofrecer planes de suscripción paga ("Premium") que desbloquean
              funcionalidades adicionales. Los precios, condiciones y funciones incluidas pueden
              cambiar en cualquier momento, con previo aviso a los suscriptores activos.
            </p>
            <p>
              Los pagos son procesados por terceros (actualmente Mercado Pago). Padeleando no almacena
              datos de tarjetas de crédito ni información de pago sensible. La política de reembolsos
              estará detallada en el proceso de compra correspondiente.
            </p>
          </Section>

          <Section title="6. Propiedad intelectual">
            <p>
              Todo el contenido de la Plataforma (diseño, código, logotipos, textos, funcionalidades)
              es propiedad de Padeleando o sus licenciantes y está protegido por las leyes aplicables
              de propiedad intelectual. Queda prohibida su reproducción o uso no autorizado.
            </p>
          </Section>

          <Section title="7. Disponibilidad del servicio">
            <p>
              Nos esforzamos por mantener el servicio disponible de forma continua, pero no garantizamos
              una disponibilidad ininterrumpida. El servicio puede interrumpirse por mantenimiento,
              actualizaciones, fallas técnicas o causas fuera de nuestro control.
            </p>
          </Section>

          <Section title="8. Limitación de responsabilidad">
            <p>
              En la máxima medida permitida por la ley aplicable, Padeleando no será responsable por
              daños directos, indirectos, incidentales o consecuentes derivados del uso o la
              imposibilidad de uso del servicio.
            </p>
            <p>
              Padeleando no garantiza la exactitud, completitud o utilidad de ningún contenido generado
              por los usuarios dentro de la Plataforma.
            </p>
          </Section>

          <Section title="9. Modificaciones al servicio y a estos términos">
            <p>
              Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte del
              servicio en cualquier momento, con o sin previo aviso.
            </p>
            <p>
              Estos Términos y Condiciones pueden ser actualizados periódicamente. La fecha de última
              actualización siempre estará visible al comienzo de este documento. El uso continuado de
              la Plataforma después de cualquier modificación implica la aceptación de los nuevos
              términos.
            </p>
          </Section>

          <Section title="10. Ley aplicable y jurisdicción">
            <p>
              Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa
              derivada del uso del servicio será sometida a la jurisdicción de los tribunales ordinarios
              de la Ciudad Autónoma de Buenos Aires, renunciando las partes a cualquier otro fuero
              que pudiera corresponderles.
            </p>
          </Section>

          <Section title="11. Contacto">
            <p>
              Para consultas sobre estos Términos y Condiciones podés escribirnos a{' '}
              <a href="mailto:soporte@padeleando.ar" className="text-brand hover:underline">
                soporte@padeleando.ar
              </a>.
            </p>
          </Section>
        </div>
      </AdRail>
    </div>
  )
}
