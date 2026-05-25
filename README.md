# Mwalimu Uniforms POS

Point of Sale + Inventory Management System for Mwalimu Uniforms, Mombasa.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Tailwind CSS |
| Desktop shell | Electron 29 |
| Local database | SQLite (better-sqlite3) |
| State management | Zustand |
| Routing | React Router v6 |
| Build tool | Vite |
| Cloud sync (Phase 7) | Supabase |
| Receipt printing | node-thermal-printer |
| Packaging | electron-builder |

---

## Prerequisites

- Node.js 18+ (download from https://nodejs.org)
- npm 9+
- Git

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

> Note: `better-sqlite3` builds a native module. You need Python and a C++ compiler:
> - **Windows**: Install Visual Studio Build Tools
> - **Linux**: `sudo apt install build-essential python3`

### 2. Run in development mode

```bash
npm run dev
```

This starts:
- Vite dev server on `http://localhost:5173`
- Electron window pointing to that server

### 3. Default login credentials

| Role | Username | PIN |
|---|---|---|
| Shopkeeper | shopkeeper | 1234 |
| Admin | admin | 9999 |

---

## Project Structure

```
mwalimu-pos/
├── electron/
│   ├── main.js          # Electron main process (window, app lifecycle)
│   ├── preload.js       # Secure IPC bridge (window.api)
│   ├── db/
│   │   └── migrate.js   # SQLite schema + seed data
│   └── ipc/
│       └── handlers.js  # All database handlers (auth, sales, stock, etc.)
│
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # Router + route guards
│   ├── store/
│   │   ├── authStore.js # Logged-in user state (Zustand)
│   │   └── cartStore.js # Shopping cart state (Zustand)
│   ├── hooks/
│   │   └── useClock.js  # Live clock hook
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── shopkeeper/
│   │   │   ├── ShopkeeperLayout.jsx
│   │   │   ├── POSPage.jsx      # Main sales interface
│   │   │   ├── StockPage.jsx    # Stock view (add only)
│   │   │   └── ClientsPage.jsx  # Client management
│   │   └── admin/
│   │       ├── AdminLayout.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── SalesPage.jsx
│   │       ├── StockPage.jsx    # Full stock management
│   │       └── UsersPage.jsx
│   ├── components/
│   │   └── pos/
│   │       ├── CartPanel.jsx    # Right side cart
│   │       ├── VariantModal.jsx # Color/size/qty picker
│   │       ├── PaymentModal.jsx # Cash/M-Pesa/Card
│   │       └── ReceiptModal.jsx # Receipt + print
│   └── styles/
│       └── globals.css
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

---

## How the IPC Bridge Works

React **never** talks to SQLite directly. All database calls go through Electron's IPC:

```
React Component
    ↓
window.api.sales.create(data)    ← defined in preload.js
    ↓
ipcRenderer.invoke('sales:create', data)
    ↓  [crosses process boundary]
ipcMain.handle('sales:create', ...)   ← registered in handlers.js
    ↓
better-sqlite3 (SQLite)
```

This keeps the app secure (contextIsolation: true) and the DB logic in one place.

---

## Build for Production

```bash
# Windows installer (.exe)
npm run build:win

# Linux AppImage
npm run build:linux
```

Output goes to `dist-electron/`.

---

## Phase Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Done | POS interface — full sales flow |
| 2 | ✅ Done | Dummy data expansion + barcode scanner |
| 3 | ✅ Done | SQLite wired up + IPC live |
| 4 | ✅ Done | UI/UX refinement, tablet optimization |
| 5 | ✅ Done | IMS — full inventory management |
| 6 | 🔜 Next | Link POS ↔ IMS (live stock deduction) |
| 7 | ⏳ | Cloud sync (Supabase backup) |
| 8 | ⏳ | Reports + admin analytics |
| 9 | ⏳ | Thermal printer integration |
| 10 | ⏳ | M-Pesa STK push + card gateway |

---

## Adding Products / Categories

Currently done via the admin UI. In Phase 5, full product management (CRUD) will be added. For now, you can seed test data directly in `electron/db/migrate.js`.

---

## Environment Variables (Phase 7+)

Create `.env` in root:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Hardware Targets

- **Tablet**: Windows 10/11 or Android (via Capacitor in future)
- **Printer**: ESC/POS thermal printer (USB or Bluetooth)
- **Scanner**: USB barcode scanner (acts as keyboard input — plug and play)
