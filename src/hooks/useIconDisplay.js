import { useState, useEffect } from 'react'
import { normalizeCategoryIconSrc } from '../lib/categoryIcon'

const iconCache = new Map()

export function useIconDisplay(categoryId, fallbackEmoji) {
  const [imageUrl, setImageUrl] = useState(() => iconCache.get(categoryId) || null)
  const [isLoading, setIsLoading] = useState(!iconCache.has(categoryId) && !!categoryId)

  useEffect(() => {
    if (!categoryId) {
      setImageUrl(null)
      setIsLoading(false)
      return
    }

    if (iconCache.has(categoryId)) {
      setImageUrl(iconCache.get(categoryId))
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    async function fetchIcon() {
      try {
        if (window.api?.categories?.getIcon) {
          const res = await window.api.categories.getIcon({ category_id: categoryId })
          if (isMounted) {
            if (res?.ok && res.data) {
              const dataUrl = normalizeCategoryIconSrc(res.data)
              iconCache.set(categoryId, dataUrl)
              setImageUrl(dataUrl)
            } else {
              iconCache.set(categoryId, null)
              setImageUrl(null)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching category icon:', err)
        if (isMounted) setImageUrl(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchIcon()

    return () => {
      isMounted = false
    }
  }, [categoryId])

  useEffect(() => {
    if (!categoryId) return

    const handleUpdate = (e) => {
      if (e.detail?.categoryId === categoryId) {
        setImageUrl(normalizeCategoryIconSrc(e.detail.dataUrl))
      }
    }

    window.addEventListener('category-icon-updated', handleUpdate)
    return () => window.removeEventListener('category-icon-updated', handleUpdate)
  }, [categoryId])

  return { imageUrl, isLoading, fallback: fallbackEmoji || '📂' }
}

export function updateIconCache(categoryId, dataUrl) {
  const normalized = dataUrl === null ? null : normalizeCategoryIconSrc(dataUrl)
  if (normalized === null) {
    iconCache.delete(categoryId)
  } else {
    iconCache.set(categoryId, normalized)
  }

  window.dispatchEvent(
    new CustomEvent('category-icon-updated', {
      detail: { categoryId, dataUrl: normalized },
    })
  )
}
