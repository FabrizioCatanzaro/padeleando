import AdBanner from './AdBanner'
import { useAdFree } from '../../hooks/useAdFree'

export default function AdRail({ children, className = '' }) {
  const adFree = useAdFree()
  if (adFree) return <div className={className}>{children}</div>
  return (
    <div className={`xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10 xl:items-start ${className}`}>
      <div className="min-w-0">{children}</div>
      <aside aria-label="Publicidad" className="hidden xl:block sticky top-24">
        <AdBanner />
      </aside>
    </div>
  )
}
