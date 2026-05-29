import { useCallback, useEffect, useState } from 'react'
import type { ConnectionStatus, DownloadProgress, ModelCacheInfo, ModelMode } from '../types'
import { MODEL_LABELS } from '../constants/models'
import {
  checkMagentaConnection,
  downloadAllModels,
  getModelCacheStatus,
} from '../engine/modelService'

interface ModelPanelProps {
  modelMode: ModelMode
  onModelModeChange: (mode: ModelMode) => void
  disabled?: boolean
  onDownloadProgress?: (message: string, progress: number) => void
}

export function ModelPanel({
  modelMode,
  onModelModeChange,
  disabled,
  onDownloadProgress,
}: ModelPanelProps) {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null)
  const [cache, setCache] = useState<ModelCacheInfo[]>([])
  const [checking, setChecking] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadMsg, setDownloadMsg] = useState('')

  const refresh = useCallback(async () => {
    setChecking(true)
    try {
      const [conn, status] = await Promise.all([
        checkMagentaConnection(),
        getModelCacheStatus(),
      ])
      setConnection(conn)
      setCache(status)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const cachedCount = cache.filter((c) => c.cached).length
  const allCached = cachedCount === cache.length && cache.length > 0

  const handleDownload = async () => {
    if (!window.electronAPI?.downloadAllModels) return
    setDownloading(true)
    setDownloadMsg('Starting download…')
    try {
      const conn = await checkMagentaConnection()
      if (!conn.online) {
        setDownloadMsg('Cannot download — no internet connection')
        return
      }
      const updated = await downloadAllModels((p: DownloadProgress) => {
        const pct = Math.round(p.overallProgress * 100)
        const msg = `${p.message} (${pct}%)`
        setDownloadMsg(msg)
        onDownloadProgress?.(msg, p.overallProgress)
      })
      setCache(updated)
      setDownloadMsg('All models cached for offline use')
    } catch (err) {
      setDownloadMsg(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="model-panel">
      <div className="model-panel-header">
        <span className="model-panel-title">AI Models</span>
        <button className="model-refresh-btn" onClick={() => void refresh()} disabled={checking || disabled}>
          {checking ? '…' : '↻'}
        </button>
      </div>

      <div className={`connection-badge ${connection?.online ? 'online' : 'offline'}`}>
        <span className="connection-dot" />
        {checking
          ? 'Checking Magenta…'
          : connection?.online
            ? `Online (${connection.latencyMs}ms)`
            : connection?.message ?? 'Offline'}
      </div>

      <div className="form-group">
        <label>Model mode</label>
        <div className="length-buttons">
          {(['auto', 'online', 'offline'] as const).map((m) => (
            <button
              key={m}
              className={`length-btn ${modelMode === m ? 'active' : ''}`}
              onClick={() => onModelModeChange(m)}
              disabled={disabled || downloading}
              title={
                m === 'auto' ? 'Use cache offline, download when online' :
                m === 'online' ? 'Always fetch from Google (needs internet)' :
                'Cached models only'
              }
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="cache-summary">
        <span>{cachedCount}/{cache.length || 6} models cached locally</span>
        {allCached && <span className="cache-ready">Ready for offline</span>}
      </div>

      <ul className="cache-list">
        {cache.map((c) => (
          <li key={c.id} className={c.cached ? 'cached' : 'missing'}>
            <span className="cache-indicator">{c.cached ? '✓' : '○'}</span>
            <span className="cache-name">{MODEL_LABELS[c.id as keyof typeof MODEL_LABELS] ?? c.id}</span>
            {c.cached && <span className="cache-size">{c.sizeMb} MB</span>}
          </li>
        ))}
      </ul>

      {window.electronAPI && (
        <button
          className="download-models-btn"
          onClick={() => void handleDownload()}
          disabled={downloading || disabled || connection?.online === false}
        >
          {downloading ? 'Downloading models…' : allCached ? 'Re-download AI Models' : 'Download for Offline Use'}
        </button>
      )}

      {downloadMsg && <p className="download-status">{downloadMsg}</p>}
      {modelMode === 'offline' && !allCached && (
        <p className="model-warning">Offline mode requires downloaded models. Click download above.</p>
      )}
    </div>
  )
}
