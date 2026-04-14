const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Database ───────────────────────────────────────────────────────────────
let db
function initDB() {
  const Database = require('better-sqlite3')
  const dbPath = isDev
    ? path.join(__dirname, '../dev-data.db')
    : path.join(app.getPath('userData'), 'mwalimu.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL') // better performance
  db.pragma('foreign_keys = ON')

  // Run migrations
  const migrate = require('./db/migrate')
  migrate(db)

  console.log('✅ Database ready at:', dbPath)
}

// ─── Window ──────────────────────────────────────────────────────────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Mwalimu Uniforms POS',
    // icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // security: on
      nodeIntegration: false,   // security: off
      sandbox: false,
    },
    // Good for touch tablets — hides default titlebar in production
    // frame: !isDev,
    autoHideMenuBar: !isDev,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initDB()
  createWindow()
  registerIPCHandlers()

  // ── Auto-update check (only in production) ──
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.log('Update check failed:', err)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────
// All database calls go through IPC — renderer never touches DB directly.
// Pattern: ipcMain.handle('channel', (event, payload) => { ... })

function registerIPCHandlers() {
  const handlers = require('./ipc/handlers')
  handlers.register(ipcMain, db)
}
