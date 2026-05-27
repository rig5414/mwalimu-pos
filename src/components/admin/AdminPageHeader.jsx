import { posTheme } from '../../styles/posTheme'

export default function AdminPageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6 admin-fade-in">
      <div>
        {eyebrow && (
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] mb-1" style={{ color: posTheme.gold }}>
            {eyebrow}
          </p>
        )}
        <h1 className="font-head font-bold text-2xl text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: posTheme.textMuted }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
