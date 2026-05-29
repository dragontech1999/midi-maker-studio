import { app, BrowserWindow, ipcMain, dialog, shell, session, protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import {
  checkMagentaConnection,
  downloadAllModels,
  getAllModelCacheInfo,
  resolveCheckpointUrl,
  resolveModelFilePath,
  type ModelId,
  type DownloadProgress,
} from './modelCache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mms-model',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null
const isDev = !app.isPackaged

function getOutputDir(): string {
  const dir = path.join(app.getPath('documents'), 'MIDI Maker Studio')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getExportsDir(): string {
  const dir = path.join(getOutputDir(), 'exports')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1280,
    minHeight: 800,
    title: 'MIDI Maker Studio v1.3',
    backgroundColor: '#0a0a0f',
    icon: isDev
      ? path.join(__dirname, '../build/icon.png')
      : path.join(process.resourcesPath, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('mms-model', (request, callback) => {
    try {
      const url = new URL(request.url)
      const rel = url.hostname + url.pathname
      const filePath = resolveModelFilePath(rel)
      callback({ path: path.normalize(filePath) })
    } catch (err) {
      console.error('mms-model protocol error:', err)
      callback({ error: -2 })
    }
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: mms-model: https://storage.googleapis.com https://cdn.jsdelivr.net; connect-src 'self' mms-model: https://storage.googleapis.com https://cdn.jsdelivr.net data: blob:; img-src 'self' data: blob:; media-src 'self' data: blob:;",
        ],
      },
    })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('app:getPaths', () => ({
  outputDir: getOutputDir(),
  exportsDir: getExportsDir(),
}))

ipcMain.handle('app:openFolder', async (_e, folderPath: string) => {
  await shell.openPath(folderPath)
})

ipcMain.handle('models:checkConnection', () => checkMagentaConnection())

ipcMain.handle('models:getCacheStatus', () => getAllModelCacheInfo())

ipcMain.handle('models:resolveCheckpointUrl', (_e, id: ModelId, mode: 'auto' | 'online' | 'offline') =>
  resolveCheckpointUrl(id, mode),
)

ipcMain.handle('models:downloadAll', async (event) => {
  const sender = event.sender
  await downloadAllModels((progress: DownloadProgress) => {
    sender.send('models:download-progress', progress)
  })
  return getAllModelCacheInfo()
})

ipcMain.handle('export:saveMidi', async (_e, data: Uint8Array, filename: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export MIDI',
    defaultPath: path.join(getExportsDir(), filename),
    filters: [{ name: 'MIDI Files', extensions: ['mid', 'midi'] }],
  })
  if (result.canceled || !result.filePath) return null
  fs.writeFileSync(result.filePath, Buffer.from(data))
  return result.filePath
})

ipcMain.handle('export:saveZip', async (_e, data: Uint8Array, filename: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Export Stems',
    defaultPath: path.join(getExportsDir(), filename),
    filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
  })
  if (result.canceled || !result.filePath) return null
  fs.writeFileSync(result.filePath, Buffer.from(data))
  return result.filePath
})

ipcMain.handle('export:saveToExports', (_e, data: Uint8Array, filename: string) => {
  const dest = path.join(getExportsDir(), filename)
  fs.writeFileSync(dest, Buffer.from(data))
  return dest
})
