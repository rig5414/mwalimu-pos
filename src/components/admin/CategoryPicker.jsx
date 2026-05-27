import { useMemo, useState } from 'react'
import { optionLabel } from '../../lib/categoryTree'
import { posTheme } from '../../styles/posTheme'

export default function CategoryPicker({
  value,
  onChange,
  leaves = [],
  placeholder = 'Select category…',
  hint,
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return leaves
    const q = query.toLowerCase()
    return leaves.filter(
      (leaf) =>
        leaf.name?.toLowerCase().includes(q) ||
        leaf.path_label?.toLowerCase().includes(q)
    )
  }, [leaves, query])

  const selected = leaves.find((l) => l.id === value)

  return (
    <div className="space-y-2">
      <div className="pos-search-bar min-h-[40px] py-1">
        <svg
          className="w-4 h-4 flex-shrink-0"
          style={{ color: posTheme.textMuted }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Filter categories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <select className="pos-glass-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {filtered.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {optionLabel(cat, { showType: true })}
          </option>
        ))}
      </select>

      {selected?.path_label && (
        <p className="text-xs" style={{ color: posTheme.textMuted }}>
          Selected: {selected.path_label}
        </p>
      )}

      {hint && (
        <p className="text-xs leading-relaxed" style={{ color: posTheme.textMuted }}>
          {hint}
        </p>
      )}
    </div>
  )
}
