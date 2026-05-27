/** Normalize category icon values for <img src> (IPC / DB / FileReader). */
export function normalizeCategoryIconSrc(src) {
  if (!src) return null
  if (typeof src !== 'string') return null
  const trimmed = src.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:image/')) return trimmed
  // Bare base64 payload from legacy paths
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    return `data:image/png;base64,${trimmed.replace(/\s/g, '')}`
  }
  return trimmed
}
