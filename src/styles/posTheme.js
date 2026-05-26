/**
 * Shopkeeper POS theme — aligned with LoginPage frosted glass / navy palette.
 */
export const posTheme = {
  bg: 'linear-gradient(160deg, #0a192f 0%, #0f2845 48%, #152a4a 100%)',

  blur: 'blur(20px) saturate(1.5)',
  blurStrong: 'blur(22px) saturate(1.6)',

  panelBg: 'rgba(255,255,255,0.08)',
  panelBorder: 'rgba(255,255,255,0.12)',

  cardBg: 'rgba(255,255,255,0.14)',
  cardBorder: 'rgba(255,255,255,0.22)',
  cardShadow: '0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',

  inputBg: 'rgba(255,255,255,0.10)',
  inputBorder: 'rgba(255,255,255,0.18)',

  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.45)',
  textDim: 'rgba(255,255,255,0.35)',

  gold: '#e8a020',
  goldLight: '#f5b93a',
  goldDark: '#1a2332',
  goldBg: 'rgba(232,160,32,0.18)',
  goldBorder: 'rgba(232,160,32,0.55)',
  goldGlow: '0 4px 16px rgba(232,160,32,0.3)',

  trackBg: 'rgba(255,255,255,0.12)',

  overlay: 'rgba(10,25,47,0.72)',
  overlayBlur: 'blur(6px)',

  successBg: 'rgba(74,222,128,0.15)',
  successBorder: 'rgba(74,222,128,0.35)',
  successText: '#bbf7d0',

  warnBg: 'rgba(232,160,32,0.12)',
  warnBorder: 'rgba(232,160,32,0.35)',
  warnText: '#fde68a',

  dangerBg: 'rgba(248,113,113,0.15)',
  dangerBorder: 'rgba(248,113,113,0.35)',
  dangerText: '#fecaca',
}

export const glassPanel = {
  background: posTheme.panelBg,
  borderColor: posTheme.panelBorder,
  backdropFilter: posTheme.blur,
  WebkitBackdropFilter: posTheme.blur,
}

export const glassCard = {
  background: posTheme.cardBg,
  border: `1px solid ${posTheme.cardBorder}`,
  backdropFilter: posTheme.blur,
  WebkitBackdropFilter: posTheme.blur,
  boxShadow: posTheme.cardShadow,
}
