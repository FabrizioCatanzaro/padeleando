import { NavLink } from 'react-router-dom'

const TAB = 'shrink-0 inline-flex items-center gap-2 min-h-11 py-3 font-sans text-[14px] whitespace-nowrap no-underline border-b-2 transition-colors'

export default function SectionTabs({ title, tabs, action }) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="m-0 font-condensed font-bold text-[22px] sm:text-[28px] text-white leading-tight">{title}</h1>
        {action}
      </div>
      <div role="tablist" className="flex gap-6 sm:gap-7 mt-4 border-b border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => t.soon ? (
          <span key={t.label} role="tab" aria-disabled="true" className={`${TAB} border-b-transparent text-muted font-semibold cursor-default`}>
            {t.label}
            <span className="text-[9px] font-bold tracking-wider border border-border-strong rounded-md px-1.5 py-0.5"><span className="sm:hidden">PRONTO</span><span className="hidden sm:inline">PRÓXIMAMENTE</span></span>
          </span>
        ) : (
          <NavLink key={t.to} to={t.to} end={t.end} role="tab"
            className={({ isActive }) => `${TAB} ${isActive ? 'border-b-brand text-white font-bold' : 'border-b-transparent text-secondary font-semibold hover:text-white'}`}>
            {t.label}
            {t.badge > 0 && <span className="text-[11px] font-bold text-black bg-cyan rounded-full px-1.5 leading-[18px]">{t.badge}</span>}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
