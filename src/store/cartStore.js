import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],
  customerName: '',

  setCustomerName: (name) => set({ customerName: name }),

  addItem: (item) => {
    // item: { variantId, productName, color, size, price, icon, stock }
    const key = `${item.variantId}`
    const existing = get().items.find(i => i.key === key)
    if (existing) {
      set(state => ({
        items: state.items.map(i =>
          i.key === key ? { ...i, qty: i.qty + item.qty } : i
        )
      }))
    } else {
      set(state => ({ items: [...state.items, { ...item, key, qty: item.qty || 1 }] }))
    }
  },

  updateQty: (key, qty) => {
    if (qty <= 0) {
      set(state => ({ items: state.items.filter(i => i.key !== key) }))
    } else {
      set(state => ({
        items: state.items.map(i => i.key === key ? { ...i, qty } : i)
      }))
    }
  },

  removeItem: (key) => set(state => ({ items: state.items.filter(i => i.key !== key) })),

  clear: () => set({ items: [], customerName: '' }),

  get subtotal() {
    return get().items.reduce((sum, i) => sum + i.price * i.qty, 0)
  },

  get itemCount() {
    return get().items.reduce((sum, i) => sum + i.qty, 0)
  },
}))
