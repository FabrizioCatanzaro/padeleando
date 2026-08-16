import { tutorialImg } from './tutorialImages'

export default function TutorialMedia({ name, caption }) {
  const img = tutorialImg(name)

  return (
    <div className="mb-6">
      {/* El alto se reserva con la relación de aspecto de cada versión: la vertical y la horizontal no miden igual. */}
      <picture className="block" style={{ '--ar-m': img.ratio, '--ar-d': img.ratioDesktop }}>
        <source media="(min-width: 768px)" srcSet={img.srcDesktop} />
        <img
          src={img.src}
          alt={caption}
          width={img.width}
          height={img.height}
          loading="lazy"
          decoding="async"
          className="w-full h-auto aspect-[var(--ar-m)] md:aspect-[var(--ar-d)] rounded-lg border border-border-strong"
        />
      </picture>
      {caption && (
        <div className="text-[11px] font-mono text-muted mt-2 text-center tracking-wide">
          {caption}
        </div>
      )}
    </div>
  )
}
