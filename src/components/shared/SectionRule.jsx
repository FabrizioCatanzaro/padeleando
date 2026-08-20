// Encabezado de sección del perfil: etiqueta, línea que ocupa el resto del
// ancho y, opcionalmente, una acción a la derecha. Reemplaza a las tarjetas con
// título gris de antes, que hacían que todas las secciones pesaran igual.
export default function SectionRule({ children, action, className = '' }) {
  return (
    <div className={`flex items-center gap-3 mt-6 first:mt-0 mb-3 ${className}`}>
      <h2 className="font-condensed font-bold text-[12px] tracking-[0.16em] text-muted m-0 shrink-0">{children}</h2>
      <span className="flex-1 h-px bg-border-mid" />
      {action}
    </div>
  );
}
