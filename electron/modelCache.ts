import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export const MODEL_IDS = ['trio', 'improv', 'melody', 'drums', 'drumRnn', 'multitrackChords'] as const
export type ModelId = (typeof MODEL_IDS)[number]

export const MODEL_REMOTE_URLS: Record<ModelId, string> = {
  trio: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar',
  melody: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_lokl_q2',
  drums: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_4bar_med_lokl_q2',
  improv: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv',
  drumRnn: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn',
  multitrackChords: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/multitrack_chords',
}

export interface ConnectionStatus {
  online: boolean
  latencyMs: number | null
  message: string
}

export interface ModelCacheInfo {
  id: ModelId
  cached: boolean
  fileCount: number
  sizeMb: number
}

export interface DownloadProgress {
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

export function getModelsDir(): string {
  const dir = path.join(app.getPath('userData'), 'models')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function getModelDir(id: ModelId): string {
  const dir = path.join(getModelsDir(), id)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function resolveModelFilePath(urlPath: string): string {
  const clean = decodeURIComponent(urlPath.replace(/^\/+/, ''))
  const [modelId, ...rest] = clean.split('/')
  if (!modelId || !MODEL_IDS.includes(modelId as ModelId)) {
    throw new Error(`Unknown model path: ${urlPath}`)
  }
  return path.join(getModelDir(modelId as ModelId), rest.join('/'))
}

export function isModelCached(id: ModelId): boolean {
  const dir = getModelDir(id)
  const config = path.join(dir, 'config.json')
  const manifest = path.join(dir, 'weights_manifest.json')
  return fs.existsSync(config) && fs.existsSync(manifest)
}

export function getModelCacheInfo(id: ModelId): ModelCacheInfo {
  const dir = getModelDir(id)
  if (!isModelCached(id)) {
    return { id, cached: false, fileCount: 0, sizeMb: 0 }
  }
  const files = fs.readdirSync(dir)
  let size = 0
  for (const f of files) {
    size += fs.statSync(path.join(dir, f)).size
  }
  return { id, cached: true, fileCount: files.length, sizeMb: Math.round(size / 1024 / 1024 * 10) / 10 }
}

export function getAllModelCacheInfo(): ModelCacheInfo[] {
  return MODEL_IDS.map(getModelCacheInfo)
}

export function allModelsCached(): boolean {
  return MODEL_IDS.every(isModelCached)
}

export async function checkMagentaConnection(): Promise<ConnectionStatus> {
  const testUrl = `${MODEL_REMOTE_URLS.trio}/config.json`
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(testUrl, { method: 'GET', signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      return { online: false, latencyMs: null, message: `Magenta servers unreachable (HTTP ${res.status})` }
    }
    return { online: true, latencyMs: Date.now() - start, message: 'Connected to Magenta AI' }
  } catch (err) {
    return {
      online: false,
      latencyMs: null,
      message: err instanceof Error ? err.message : 'Cannot reach Magenta servers',
    }
  }
}

async function listRemoteFiles(baseUrl: string): Promise<string[]> {
  const files = new Set<string>(['config.json', 'weights_manifest.json'])
  const manifestRes = await fetch(`${baseUrl}/weights_manifest.json`)
  if (!manifestRes.ok) throw new Error(`Failed to fetch manifest from ${baseUrl}`)
  const manifest = await manifestRes.json() as { paths?: string[] }[]
  for (const group of manifest) {
    for (const p of group.paths ?? []) files.add(p)
  }
  return [...files]
}

export async function downloadModel(
  id: ModelId,
  onProgress?: (p: DownloadProgress) => void,
  modelIndex = 0,
  modelTotal = MODEL_IDS.length,
): Promise<void> {
  const baseUrl = MODEL_REMOTE_URLS[id]
  const destDir = getModelDir(id)
  const remoteFiles = await listRemoteFiles(baseUrl)
  let bytesDownloaded = 0

  for (let fi = 0; fi < remoteFiles.length; fi++) {
    const fileName = remoteFiles[fi]!
    const dest = path.join(destDir, fileName)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      bytesDownloaded += fs.statSync(dest).size
      onProgress?.({
        modelId: id,
        modelIndex,
        modelTotal,
        fileName,
        fileIndex: fi + 1,
        fileTotal: remoteFiles.length,
        bytesDownloaded,
        overallProgress: (modelIndex + (fi + 1) / remoteFiles.length) / modelTotal,
        message: `Cached ${id}/${fileName}`,
      })
      continue
    }

    onProgress?.({
      modelId: id,
      modelIndex,
      modelTotal,
      fileName,
      fileIndex: fi + 1,
      fileTotal: remoteFiles.length,
      bytesDownloaded,
      overallProgress: (modelIndex + fi / remoteFiles.length) / modelTotal,
      message: `Downloading ${id}/${fileName}…`,
    })

    const res = await fetch(`${baseUrl}/${fileName}`)
    if (!res.ok) throw new Error(`Failed to download ${fileName} (${res.status})`)
    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buffer)
    bytesDownloaded += buffer.length

    onProgress?.({
      modelId: id,
      modelIndex,
      modelTotal,
      fileName,
      fileIndex: fi + 1,
      fileTotal: remoteFiles.length,
      bytesDownloaded,
      overallProgress: (modelIndex + (fi + 1) / remoteFiles.length) / modelTotal,
      message: `Downloaded ${id}/${fileName}`,
    })
  }
}

export async function downloadAllModels(
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  for (let i = 0; i < MODEL_IDS.length; i++) {
    await downloadModel(MODEL_IDS[i]!, onProgress, i, MODEL_IDS.length)
  }
}

export function resolveCheckpointUrl(id: ModelId, mode: 'auto' | 'online' | 'offline'): string {
  if (mode === 'online') return MODEL_REMOTE_URLS[id]
  if (isModelCached(id)) return `mms-model://${id}`
  if (mode === 'offline') {
    throw new Error(`Model "${id}" is not cached. Download models for offline use first.`)
  }
  return MODEL_REMOTE_URLS[id]
}
