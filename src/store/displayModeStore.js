import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Tablet-optimized large cards vs dense admin-style grid. */
export const useDisplayModeStore = create(
  persist(
    (set) => ({
      mode: 'touch',
      setMode: (mode) => set({ mode: mode === 'dense' ? 'dense' : 'touch' }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'touch' ? 'dense' : 'touch' })),
    }),
    { name: 'mwalimu-pos-display-mode' }
  )
)
