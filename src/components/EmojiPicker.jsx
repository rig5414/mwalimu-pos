import { useState, useEffect, useMemo } from 'react'

export default function EmojiPicker({ selectedEmoji, onSelect }) {
  const [emojiData, setEmojiData] = useState({})
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('people')
  const [loading, setLoading] = useState(true)

  // Load emoji data on mount
  useEffect(() => {
    async function loadEmojis() {
      try {
        const data = await import('@emoji-mart/data')
        const emojisMap = data.emojis
        const categories = data.categories

        // Organize emojis by category
        const organized = {}
        categories.forEach((cat) => {
          organized[cat.id] = {
            name: cat.name,
            emojis: cat.emojis
              .map((emojiId) => {
                const emojiObj = emojisMap[emojiId]
                if (!emojiObj || !emojiObj.skins?.[0]) return null
                return {
                  id: emojiId,
                  emoji: emojiObj.skins[0].native,
                  keywords: emojiObj.keywords || [],
                  name: emojiObj.name,
                }
              })
              .filter(Boolean),
          }
        })

        setEmojiData(organized)
      } catch (err) {
        console.error('Failed to load emoji data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEmojis()
  }, [])

  // Filter emojis based on search & category
  const filtered = useMemo(() => {
    if (!emojiData[selectedCategory]) return []

    let emojis = emojiData[selectedCategory].emojis

    if (search.trim()) {
      const query = search.toLowerCase()
      emojis = emojis.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.keywords.some((k) => k.toLowerCase().includes(query))
      )
    }

    return emojis
  }, [emojiData, selectedCategory, search])

  const categories = Object.keys(emojiData)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading emojis...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <input
        type="text"
        className="input text-sm"
        placeholder="Search emojis by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setSelectedCategory(cat)
              setSearch('')
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-primary text-white border-primary'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {emojiData[cat]?.name || cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1 max-h-[240px] overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
        {filtered.length > 0 ? (
          filtered.map((emoji) => (
            <button
              key={emoji.id}
              type="button"
              onClick={() => onSelect(emoji.emoji)}
              title={emoji.name}
              className={`flex items-center justify-center text-3xl p-2 rounded-lg transition-all cursor-pointer ${
                selectedEmoji === emoji.emoji
                  ? 'bg-primary text-white scale-125'
                  : 'hover:bg-white hover:scale-110'
              }`}
            >
              {emoji.emoji}
            </button>
          ))
        ) : (
          <div className="col-span-8 flex items-center justify-center h-20 text-gray-400 text-sm">
            No emojis found
          </div>
        )}
      </div>

      {/* Selected emoji display */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-2xl">{selectedEmoji}</span>
        <span className="text-xs text-gray-500">Selected</span>
      </div>
    </div>
  )
}
