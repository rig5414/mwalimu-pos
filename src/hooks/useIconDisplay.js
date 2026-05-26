import { useState, useEffect } from 'react'

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
            if (res && res.ok && res.data) {
              iconCache.set(categoryId, res.data)
              setImageUrl(res.data)
            } else {
              iconCache.set(categoryId, null)
              setImageUrl(null)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching category icon:', err)
        if (isMounted) {
          setImageUrl(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchIcon()

    return () => {
      isMounted = false
    }
  }, [categoryId])

  // Listen for real-time updates when an icon is uploaded/deleted
  useEffect(() => {
    if (!categoryId) return

    const handleUpdate = (e) => {
      if (e.detail && e.detail.categoryId === categoryId) {
        setImageUrl(e.detail.dataUrl)
      }
    }

    window.addEventListener('category-icon-updated', handleUpdate)
    return () => {
      window.removeEventListener('category-icon-updated', handleUpdate)
    }
  }, [categoryId])

  return { imageUrl, isLoading, fallback: fallbackEmoji || '📂' }
}

// Function to manually update the cache and trigger real-time updates in other components
export function updateIconCache(categoryId, dataUrl) {
  if (dataUrl === null) {
    iconCache.delete(categoryId)
  } else {
    iconCache.set(categoryId, dataUrl)
  }
  
  // Dispatch a custom event to notify all active hook instances
  window.dispatchEvent(
    new CustomEvent('category-icon-updated', {
      detail: { categoryId, dataUrl },
    })
  )
}
