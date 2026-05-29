import { contextBridge, ipcRenderer } from 'electron'

type ModelId = 'trio' | 'improv' | 'melody' | 'drums' | 'drumRnn' | 'multitrackChords'

interface AppPaths {
  outputDir: string
  exportsDir: string
}

interface ConnectionStatus {
  online: boolean
  latencyMs: number | null
  message: string
}

interface ModelCacheInfo {
  id: ModelId
  cached: boolean
  fileCount: number
  sizeMb: number
}

interface DownloadProgress {
  modelId: ModelId
  modelIndex: number
  modelTotal: number
  fileName: string
  fileIndex: number
  fileTotal: number
  bytesDownloaded: number
  overallProgress: number
  message: string
}

const api = {
  getPaths: (): Promise<AppPaths> => ipcRenderer.invoke('app:getPaths'),
  openFolder: (folderPath: string): Promise<void> => ipcRenderer.invoke('app:openFolder', folderPath),
  saveMidi: (data: Uint8Array, filename: string): Promise<string | null> =>
    ipcRenderer.invoke('export:saveMidi', data, filename),
  saveZip: (data: Uint8Array, filename: string): Promise<string | null> =>
    ipcRenderer.invoke('export:saveZip', data, filename),
  saveToExports: (data: Uint8Array, filename: string): Promise<string> =>
    ipcRenderer.invoke('export:saveToExports', data, filename),

  checkMagentaConnection: (): Promise<ConnectionStatus> =>
    ipcRenderer.invoke('models:checkConnection'),
  getModelCacheStatus: (): Promise<ModelCacheInfo[]> =>
    ipcRenderer.invoke('models:getCacheStatus'),
  resolveCheckpointUrl: (id: ModelId, mode: 'auto' | 'online' | 'offline'): Promise<string> =>
    ipcRenderer.invoke('models:resolveCheckpointUrl', id, mode),
  downloadAllModels: (onProgress?: (p: DownloadProgress) => void): Promise<ModelCacheInfo[]> => {
    if (onProgress) {
      const handler = (_: unknown, progress: DownloadProgress) => onProgress(progress)
      ipcRenderer.on('models:download-progress', handler)
      return ipcRenderer.invoke('models:downloadAll').finally(() => {
        ipcRenderer.removeListener('models:download-progress', handler)
      })
    }
    return ipcRenderer.invoke('models:downloadAll')
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
