interface AppPaths {
  outputDir: string
  exportsDir: string
}

interface ElectronAPI {
  getPaths: () => Promise<AppPaths>
  openFolder: (folderPath: string) => Promise<void>
  saveMidi: (data: Uint8Array, filename: string) => Promise<string | null>
  saveZip: (data: Uint8Array, filename: string) => Promise<string | null>
  saveToExports: (data: Uint8Array, filename: string) => Promise<string>
  checkMagentaConnection: () => Promise<import('./index').ConnectionStatus>
  getModelCacheStatus: () => Promise<import('./index').ModelCacheInfo[]>
  resolveCheckpointUrl: (id: string, mode: 'auto' | 'online' | 'offline') => Promise<string>
  downloadAllModels: (
    onProgress?: (p: import('./index').DownloadProgress) => void,
  ) => Promise<import('./index').ModelCacheInfo[]>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
