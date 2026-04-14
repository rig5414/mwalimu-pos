/**
 * preload.js — the secure bridge
 *
 * This file runs in a privileged context with access to Node APIs,
 * but exposes ONLY a safe, controlled API to the React renderer.
 *
 * The renderer calls window.api.xxx() — never require() or fs directly.
 */

const { contextBridge, ipcRenderer } = require('electron')

// ─── Helper ──────────────────────────────────────────────────────────────────
const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload)

// ─── Exposed API ─────────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('api', {

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login:  (creds)   => invoke('auth:login', creds),
    logout: ()        => invoke('auth:logout'),
  },

  // ── Products / Categories ─────────────────────────────────────────────────
  products: {
    getAll:       (filters) => invoke('products:getAll', filters),
    getById:      (id)      => invoke('products:getById', id),
    create:       (data)    => invoke('products:create', data),
    update:       (data)    => invoke('products:update', data),
    delete:       (id)      => invoke('products:delete', id),    // admin only
  },

  categories: {
    getAll:  ()     => invoke('categories:getAll'),
    create:  (data) => invoke('categories:create', data),
    update:  (data) => invoke('categories:update', data),
    delete:  (id)   => invoke('categories:delete', id),
  },

  // ── Stock ─────────────────────────────────────────────────────────────────
  stock: {
    getAll:       ()        => invoke('stock:getAll'),
    addStock:     (data)    => invoke('stock:add', data),       // shopkeeper + admin
    removeStock:  (data)    => invoke('stock:remove', data),    // admin only
    getLowStock:  ()        => invoke('stock:getLow'),
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  sales: {
    create:     (data)    => invoke('sales:create', data),
    getAll:     (filters) => invoke('sales:getAll', filters),
    getById:    (id)      => invoke('sales:getById', id),
    getToday:   ()        => invoke('sales:getToday'),
    getSummary: (range)   => invoke('sales:getSummary', range),
    void:       (id)      => invoke('sales:void', id),          // admin only
  },

  // ── Clients ───────────────────────────────────────────────────────────────
  clients: {
    getAll:   (search) => invoke('clients:getAll', search),
    getById:  (id)     => invoke('clients:getById', id),
    create:   (data)   => invoke('clients:create', data),
    update:   (data)   => invoke('clients:update', data),
  },

  // ── Users (admin only) ────────────────────────────────────────────────────
  users: {
    getAll:   ()     => invoke('users:getAll'),
    create:   (data) => invoke('users:create', data),
    update:   (data) => invoke('users:update', data),
    delete:   (id)   => invoke('users:delete', id),
  },

  // ── Printing ──────────────────────────────────────────────────────────────
  print: {
    receipt:  (data) => invoke('print:receipt', data),
    testPage: ()     => invoke('print:test'),
  },

  // ── Sync (cloud backup) ───────────────────────────────────────────────────
  sync: {
    push:       ()   => invoke('sync:push'),
    pull:       ()   => invoke('sync:pull'),
    getStatus:  ()   => invoke('sync:status'),
    isOnline:   ()   => invoke('sync:online'),
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    dailySummary:   (date)  => invoke('reports:daily', date),
    stockReport:    ()      => invoke('reports:stock'),
    salesByCategory: (range) => invoke('reports:salesByCategory', range),
  },

})
