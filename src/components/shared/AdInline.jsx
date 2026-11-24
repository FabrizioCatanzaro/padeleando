import AdBanner from './AdBanner'

export default function AdInline({ className = 'mt-10' }) {
  return (
    <aside aria-label="Publicidad" className={`xl:hidden ${className}`}>
      <AdBanner />
    </aside>
  )
}
