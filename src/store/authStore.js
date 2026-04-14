import { create } from 'zustand'

// Demo user credentials for browser dev mode
const DEMO_USERS = {
  'shopkeeper:1234': { id: '1', name: 'Shopkeeper', username: 'shopkeeper', role: 'shopkeeper' },
  'admin:9999': { id: '2', name: 'Admin', username: 'admin', role: 'admin' },
}

export const useAuthStore = create((set) => ({
  user: null,

  login: async (username, pin, role) => {
    if (window.api) {
      // Electron mode: use real IPC
      const res = await window.api.auth.login({ username, pin, role })
      if (!res.ok) throw new Error(res.error)
      set({ user: res.data })
      return res.data
    } else {
      // Browser dev mode: use demo data
      const key = `${username}:${pin}`
      const user = DEMO_USERS[key]
      if (!user || user.role !== role) {
        throw new Error('Invalid credentials. Use shopkeeper/1234 or admin/9999')
      }
      set({ user })
      return user
    }
  },

  logout: () => {
    set({ user: null })
  },
}))
