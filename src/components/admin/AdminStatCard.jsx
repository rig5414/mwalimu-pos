import { Link } from 'react-router-dom'
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'
import { posTheme } from '../../styles/posTheme'

const ACCENTS = {
  gold: {
    glow: 'rgba(232,160,32,0.35)',
    border: 'rgba(232,160,32,0.45)',
    iconBg: 'rgba(232,160,32,0.2)',
    value: posTheme.gold,
  },
  cyan: {
    glow: 'rgba(56,189,248,0.3)',
    border: 'rgba(56,189,248,0.4)',
    iconBg: 'rgba(56,189,248,0.15)',
    value: '#67e8f9',
  },
  green: {
    glow: 'rgba(74,222,128,0.3)',
    border: 'rgba(74,222,128,0.4)',
    iconBg: 'rgba(74,222,128,0.15)',
    value: '#86efac',
  },
  red: {
    glow: 'rgba(248,113,113,0.3)',
    border: 'rgba(248,113,113,0.4)',
    iconBg: 'rgba(248,113,113,0.15)',
    value: '#fca5a5',
  },
}

export default function AdminStatCard({
  label,
  value,
  sub,
  icon,
  accent = 'gold',
  animate = true,
  delay = 0,
  href,
  to,
  format = 'number',
}) {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0
  const animated = useAnimatedNumber(animate ? num : 0, 1000 + delay * 80)
  const display = animate ? animated : num

  const fmt =
    format === 'money'
      ? `KES ${display.toLocaleString()}`
      : format === 'compact'
        ? display >= 1e6
          ? `KES ${(display / 1e6).toFixed(1)}M`
          : display >= 1e3
            ? `KES ${Math.round(display / 1e3)}k`
            : `KES ${display.toLocaleString()}`
        : display.toLocaleString()

  const a = ACCENTS[accent] || ACCENTS.gold

  const inner = (
    <div
      className="admin-stat-card group relative overflow-hidden rounded-2xl p-5 min-h-[130px] flex flex-col justify-between"
      style={{
        animationDelay: `${delay}ms`,
        '--stat-glow': a.glow,
        '--stat-border': a.border,
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none admin-stat-shine"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 relative z-10">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em]" style={{ color: posTheme.textMuted }}>
          {label}
        </p>
        {icon && (
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: a.iconBg, border: `1px solid ${a.border}` }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <p className="font-head font-extrabold text-2xl lg:text-[1.65rem] tabular-nums" style={{ color: a.value }}>
          {typeof value === 'string' && !animate ? value : fmt}
        </p>
        {sub && (
          <p className="text-xs font-semibold mt-1.5" style={{ color: posTheme.textSecondary }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block no-underline admin-stat-link">
        {inner}
      </Link>
    )
  }
  return inner
}
