import { posTheme } from '../styles/posTheme'

export const ADMIN_CHART = {
  grid: 'rgba(255,255,255,0.08)',
  axis: 'rgba(255,255,255,0.4)',
  tooltipBg: 'rgba(15,40,69,0.95)',
  tooltipBorder: 'rgba(255,255,255,0.15)',
  gold: posTheme.gold,
  goldLight: posTheme.goldLight,
  cyan: '#38bdf8',
  navy: '#1a3a5c',
  gradient: [
    { offset: '0%', color: posTheme.gold, opacity: 0.9 },
    { offset: '100%', color: posTheme.goldLight, opacity: 0.4 },
  ],
}

export const adminTooltipStyle = {
  contentStyle: {
    background: ADMIN_CHART.tooltipBg,
    border: `1px solid ${ADMIN_CHART.tooltipBorder}`,
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
    backdropFilter: 'blur(12px)',
  },
  labelStyle: { color: 'rgba(255,255,255,0.65)' },
  itemStyle: { color: posTheme.gold },
}
