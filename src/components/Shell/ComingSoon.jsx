import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function ComingSoon({ icon, title, text, linkTo, linkLabel }) {
  const Icon = icon
  return (
    <div className="flex flex-col items-start gap-3 p-6 sm:p-8 rounded-2xl border border-dashed border-border-strong bg-surface max-w-xl">
      <span className="w-11 h-11 rounded-xl bg-surface-alt border border-border-mid flex items-center justify-center text-brand">
        <Icon size={20} />
      </span>
      <h2 className="m-0 font-condensed font-bold text-[16px] text-white">{title}</h2>
      <p className="m-0 font-sans text-[13.5px] text-soft leading-relaxed">{text}</p>
      {linkTo && (
        <Link to={linkTo} className="inline-flex items-center gap-1.5 min-h-11 font-sans font-bold text-[13px] text-brand no-underline hover:underline">
          {linkLabel}<ArrowRight size={15} />
        </Link>
      )}
    </div>
  )
}
