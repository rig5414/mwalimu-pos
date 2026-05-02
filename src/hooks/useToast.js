import { create } from 'zustand'
import { nanoid } from 'nanoid'

const useToastStore = create((set) => ({
  toasts: [],
  add: (message, variant = 'info', duration = 3000) => {
    const id = nanoid()
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant, duration }],
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
    return id
  },
  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))

export function useToast() {
  const { add, remove } = useToastStore()

  return {
    success: (message, duration = 3000) => add(message, 'success', duration),
    error: (message, duration = 4000) => add(message, 'error', duration),
    warning: (message, duration = 3500) => add(message, 'warning', duration),
    info: (message, duration = 3000) => add(message, 'info', duration),
    remove,
  }
}

export { useToastStore }
