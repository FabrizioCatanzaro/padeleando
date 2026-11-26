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

function DataTable({ rows }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-[12px] border border-border-mid rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-surface">
            {rows[0].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-muted font-semibold border-b border-border-mid">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-content align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyView() {
  return (
    <div className="bg-base text-content font-sans pb-16">
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <p className="text-[11px] font-mono text-muted uppercase tracking-widest mb-1">Legal</p>
        <h1 className="font-condensed font-bold text-[30px] text-white leading-tight">
          Política de Privacidad
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
              <span className="text-white font-semibold">Aviso importante:</span> Esta Política de
              Privacidad puede ser actualizada en cualquier momento. Ante cambios significativos, te
              notificaremos por correo electrónico o mediante un aviso en la plataforma. El uso
              continuado del servicio implica la aceptación de la política vigente.
            </p>
          </div>

          {/* Intro */}
          <div className="mt-8">
            <p className="text-[13px] text-content leading-relaxed">
              En <span className="text-white font-semibold">Padeleando</span> ("nosotros", "la Plataforma")
              tomamos muy en serio la privacidad de nuestros usuarios. Esta política describe qué
              información recopilamos, cómo la usamos, con quién la compartimos y cuáles son tus
              derechos al respecto.
            </p>
          </div>

          <Section title="1. Responsable del tratamiento">
            <p>
              El responsable del tratamiento de tus datos personales es Padeleando, desarrollado y
              operado por Fabrizio Catanzaro, con domicilio en Buenos Aires, República Argentina. Podés contactarnos
              en{' '}
              <a href="mailto:soporte@padeleando.ar" className="text-brand hover:underline">
                soporte@padeleando.ar
              </a>
              .
            </p>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p>Recopilamos la siguiente información según tu interacción con la Plataforma:</p>
            <DataTable
              rows={[
                ['Dato', 'Fuente', 'Obligatorio'],
                ['Nombre de usuario', 'Registro / Google OAuth', 'Sí'],
                ['Dirección de correo electrónico', 'Registro / Google OAuth', 'Sí'],
                ['Contraseña', 'Registro con email', 'Solo si no usás Google'],
                ['Foto de perfil (avatar)', 'Carga opcional', 'No'],
                ['Fotos de torneo', 'Carga opcional (Premium)', 'No'],
                ['Redes sociales (Instagram, etc.)', 'Perfil opcional', 'No'],
                ['Datos de torneos y partidos', 'Uso del servicio', 'Funcional'],
                ['Dirección IP y datos de sesión', 'Automático (logs)', 'Técnico'],
              ]}
            />
            <p className="mt-3">
              No recopilamos ni almacenamos datos de tarjetas de crédito. Los pagos son procesados
              íntegramente por el procesador de pagos externo contratado.
            </p>
          </Section>

          <Section title="3. Finalidad del tratamiento">
            <p>Utilizamos tus datos para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Crear y gestionar tu cuenta de usuario.</li>
              <li>Permitirte crear, participar y gestionar torneos.</li>
              <li>Calcular y mostrar estadísticas personales y de categoría.</li>
              <li>Enviar correos de verificación de cuenta y recuperación de contraseña.</li>
              <li>Notificarte sobre actividad relevante (invitaciones, seguidores, resultados).</li>
              <li>Gestionar suscripciones Premium y procesar pagos a través de terceros.</li>
              <li>Mantener la seguridad e integridad del servicio.</li>
              <li>Cumplir con obligaciones legales aplicables.</li>
            </ul>
          </Section>

          <Section title="4. Cookies">
            <p>
              Padeleando utiliza cookies <span className="font-mono text-[12px]">httpOnly</span> para
              gestionar la sesión autenticada (tokens de acceso y refresh). Estas cookies son estrictamente
              necesarias para el funcionamiento del servicio y no pueden ser desactivadas mientras estés
              conectado.
            </p>
            <p>
              No utilizamos cookies de seguimiento, publicidad o analítica de terceros.
            </p>
          </Section>

          <Section title="5. Terceros con acceso a tus datos">
            <p>
              Para operar el servicio utilizamos los siguientes proveedores externos, cada uno con
              sus propias políticas de privacidad:
            </p>
            <DataTable
              rows={[
                ['Proveedor', 'Finalidad', 'Datos compartidos'],
                ['Cloudinary', 'Almacenamiento de imágenes', 'Fotos de perfil y torneos'],
                ['Google (OAuth 2.0)', 'Autenticación con Google', 'Nombre y email de Google'],
                ['Mercado Pago', 'Procesamiento de pagos (Premium)', 'Email, monto de transacción'],
              ]}
            />
            <p className="mt-3">
              No vendemos, alquilamos ni cedemos tus datos personales a terceros con fines
              publicitarios o comerciales.
            </p>
          </Section>

          <Section title="6. Transferencias internacionales de datos">
            <p>
              Algunos de nuestros proveedores (como Cloudinary) pueden procesar datos
              fuera de Argentina. En todos los casos exigimos que dichos proveedores ofrezcan garantías
              adecuadas de protección según las leyes aplicables.
            </p>
          </Section>

          <Section title="7. Retención de datos">
            <p>
              Conservamos tus datos mientras tu cuenta esté activa o sea necesario para prestarte
              el servicio. Si eliminás tu cuenta, eliminaremos o anonimizaremos tus datos personales
              en un plazo máximo de 30 días, salvo que la ley nos exija conservarlos por más tiempo.
            </p>
            <p>
              Los logs técnicos (IP, eventos del servidor) se eliminan automáticamente luego de 90 días.
            </p>
          </Section>

          <Section title="8. Tus derechos">
            <p>
              De acuerdo con la Ley 25.326 de Protección de Datos Personales de Argentina y las
              normativas aplicables, tenés derecho a:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="text-white font-medium">Acceso:</span> solicitar una copia de los datos que tenemos sobre vos.</li>
              <li><span className="text-white font-medium">Rectificación:</span> corregir datos inexactos o incompletos.</li>
              <li><span className="text-white font-medium">Supresión:</span> solicitar la eliminación de tus datos ("derecho al olvido").</li>
              <li><span className="text-white font-medium">Oposición:</span> oponerte al tratamiento de tus datos en determinadas circunstancias.</li>
              <li><span className="text-white font-medium">Portabilidad:</span> recibir tus datos en un formato estructurado y legible.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, escribinos a{' '}
              <a href="mailto:soporte@padeleando.ar" className="text-brand hover:underline">
                soporte@padeleando.ar
              </a>{' '}
              indicando tu nombre de usuario y el derecho que querés ejercer. Responderemos en un
              plazo máximo de 30 días hábiles.
            </p>
          </Section>

          <Section title="9. Seguridad">
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus datos: contraseñas
              almacenadas con hash, comunicaciones cifradas mediante HTTPS, tokens de sesión
              en cookies <span className="font-mono text-[12px]">httpOnly</span> y acceso restringido
              a la base de datos.
            </p>
            <p>
              Sin embargo, ningún sistema es completamente infalible. Si detectás alguna vulnerabilidad
              o incidente de seguridad, te pedimos que nos lo reportes de inmediato.
            </p>
          </Section>

          <Section title="10. Modificaciones a esta política">
            <p>
              Podemos actualizar esta Política de Privacidad en cualquier momento. La fecha de última
              actualización siempre estará visible al inicio de este documento. Te notificaremos sobre
              cambios significativos por correo electrónico o mediante un aviso destacado en la
              Plataforma.
            </p>
          </Section>

          <Section title="12. Contacto y reclamos">
            <p>
              Para consultas o reclamos relacionados con esta política, escribinos a{' '}
              <a href="mailto:soporte@padeleando.ar" className="text-brand hover:underline">
                soporte@padeleando.ar
              </a>
            </p>
          </Section>
        </div>
      </AdRail>
    </div>
  )
}
