import AdBanner from './AdBanner'
import { useAdFree } from '../../hooks/useAdFree'

export default function AdInline({ className = 'mt-10' }) {
  const adFree = useAdFree()
  if (adFree) return null
  return (
    <aside aria-label="Publicidad" className={`xl:hidden ${className}`}>
      <AdBanner />
    </aside>
  )
}
