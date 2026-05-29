import { MODEL_IDS, type ModelId } from '../constants/models'
import type { ModelMode, ModelCacheInfo, DownloadProgress, ConnectionStatus } from '../types'

const MODEL_ID_LIST: ModelId[] = [...MODEL_IDS]

export async function checkMagentaConnection(): Promise<ConnectionStatus> {
  if (window.electronAPI?.checkMagentaConnection) {
    return window.electronAPI.checkMagentaConnection()
  }
  const testUrl = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar/config.json'
  const start = Date.now()
  try {
    const res = await fetch(testUrl, { method: 'GET' })
    if (!res.ok) return { online: false, latencyMs: null, message: `Unreachable (HTTP ${res.status})` }
    return { online: true, latencyMs: Date.now() - start, message: 'Connected to Magenta AI' }
  } catch (err) {
    return { online: false, latencyMs: null, message: err instanceof Error ? err.message : 'Offline' }
  }
}

export async function getModelCacheStatus(): Promise<ModelCacheInfo[]> {
  if (window.electronAPI?.getModelCacheStatus) {
    return window.electronAPI.getModelCacheStatus()
  }
  return MODEL_ID_LIST.map((id) => ({ id, cached: false, fileCount: 0, sizeMb: 0 }))
}

export async function downloadAllModels(
  onProgress?: (p: DownloadProgress) => void,
): Promise<ModelCacheInfo[]> {
  if (window.electronAPI?.downloadAllModels) {
    return window.electronAPI.downloadAllModels(onProgress)
  }
  throw new Error('Offline model download requires the desktop app')
}

export async function resolveCheckpointUrls(
  mode: ModelMode,
  connectionOnline: boolean,
): Promise<Record<ModelId, string>> {
  if (mode === 'online' && !connectionOnline) {
    throw new Error('Online mode requires an internet connection to Magenta servers.')
  }

  const urls = {} as Record<ModelId, string>

  for (const id of MODEL_ID_LIST) {
    if (window.electronAPI?.resolveCheckpointUrl) {
      urls[id] = await window.electronAPI.resolveCheckpointUrl(id, mode)
    } else {
      const remote: Record<ModelId, string> = {
        trio: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar',
        melody: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_lokl_q2',
        drums: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/drums_4bar_med_lokl_q2',
        improv: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv',
        drumRnn: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn',
        multitrackChords: 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/multitrack_chords',
      }
      urls[id] = remote[id]
    }
  }
  return urls
}
