const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const log = require('electron-log')
const path = require('path')

log.transports.file.level = 'info'
log.info('Mwalimu POS starting…', { packaged: app.isPackaged, version: app.getVersion() })

let autoUpdater = null
try {
  const { autoUpdater: au } = require('electron-updater')
  autoUpdater = au
} catch (e) {
  log.warn('electron-updater not available:', e.message)
}

const isDev = !app.isPackaged

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

  log.info('Database ready at:', dbPath)
}

// ─── Window ──────────────────────────────────────────────────────────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    center: true,
    title: 'Mwalimu Uniforms POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: !isDev,
  })

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.focus()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html')
    mainWindow
      .loadFile(indexPath)
      .catch((err) => {
        log.error('Failed to load app from primary path:', err)
        return mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'))
      })
      .catch((err) => {
        log.error('Failed to load app from fallback path:', err)
        dialog.showErrorBox(
          'Mwalimu POS — load error',
          'The application UI could not be loaded. Please reinstall from the latest installer.\n\n' +
            String(err?.message || err)
        )
      })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function showStartupError(title, err) {
  const detail = err?.stack || String(err?.message || err)
  log.error(title, detail)
  dialog.showErrorBox(title, detail)
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev || !autoUpdater) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.checkForUpdates().catch((err) => {
    log.warn('Update check failed:', err.message)
  })

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available`,
      detail:
        'A new update is downloading in the background. You will be notified when it is ready to install.',
      buttons: ['OK'],
    })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('App is up to date.')
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Downloading update: ${Math.round(progress.percent)}%`)
    if (mainWindow) {
      mainWindow.setTitle(`Mwalimu POS — Updating ${Math.round(progress.percent)}%`)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.setTitle('Mwalimu Uniforms POS')

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready to Install',
        message: `Version ${info.version} has been downloaded`,
        detail:
          'Restart Mwalimu POS now to apply the update. If you choose Later, it will install automatically next time you close the app.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true)
        }
      })
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err.message)
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
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })

  app.whenReady().then(() => {
    createWindow()

    try {
      initDB()
      registerIPCHandlers()
    } catch (err) {
      showStartupError('Mwalimu POS — startup failed', err)
    }

    setupAutoUpdater()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  showStartupError('Mwalimu POS — unexpected error', err)
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────
function registerIPCHandlers() {
  const handlers = require('./ipc/handlers')
  handlers.register(ipcMain, db)
}
