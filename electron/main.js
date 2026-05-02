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
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: !isDev,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(indexPath)
      .catch(err => {
        console.error('Failed to load app:', err)
        mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'))
      })
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return  // never run in dev

  // Silent background check on startup
  autoUpdater.autoDownload = true        // download automatically once found
  autoUpdater.autoInstallOnAppQuit = true // install when user quits naturally

  autoUpdater.checkForUpdates().catch(err => {
    console.log('Update check failed:', err.message)
  })

  // ── Update available → inform user, download starts automatically ──
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available`,
      detail: 'A new update is downloading in the background. You will be notified when it is ready to install.',
      buttons: ['OK'],
    })
  })

  // ── Already on latest ──
  autoUpdater.on('update-not-available', () => {
    console.log('✅ App is up to date.')
  })

  // ── Download progress (optional — logs to console) ──
  autoUpdater.on('download-progress', (progress) => {
    const msg = `Downloading update: ${Math.round(progress.percent)}%`
    console.log(msg)
    // Also update the window title so user sees progress
    if (mainWindow) {
      mainWindow.setTitle(`Mwalimu POS — Updating ${Math.round(progress.percent)}%`)
    }
  })

  // ── Downloaded and ready — ask user to restart ──
  autoUpdater.on('update-downloaded', (info) => {
    // Reset window title
    if (mainWindow) mainWindow.setTitle('Mwalimu Uniforms POS')

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready to Install',
      message: `Version ${info.version} has been downloaded`,
      detail: 'Restart Mwalimu POS now to apply the update. If you choose Later, it will install automatically next time you close the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  // ── Error handling ──
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message)
    // Only show dialog for non-network errors to avoid annoying the user
    if (!err.message.includes('net::') && !err.message.includes('ENOTFOUND')) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Update Error',
        message: 'Could not check for updates',
        detail: err.message,
        buttons: ['OK'],
      })
    }
  })
}

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initDB()
  createWindow()
  registerIPCHandlers()
  setupAutoUpdater()   // ← replaces the old checkForUpdatesAndNotify block

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────
function registerIPCHandlers() {
  const handlers = require('./ipc/handlers')
  handlers.register(ipcMain, db)
}