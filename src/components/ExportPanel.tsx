import { useState } from 'react'
import type { Composition } from '../types'
import { exportFullSong, exportStemsZip, downloadBlob } from '../engine/midiExport'

interface ExportPanelProps {
  composition: Composition
}

export function ExportPanel({ composition }: ExportPanelProps) {
  const [exporting, setExporting] = useState<'none' | 'full' | 'stems'>('none')
  const [lastExport, setLastExport] = useState<string | null>(null)

  const safeName = composition.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')

  const saveViaElectron = async (data: Uint8Array, filename: string, type: 'midi' | 'zip') => {
    if (window.electronAPI) {
      const fn = type === 'midi' ? window.electronAPI.saveMidi : window.electronAPI.saveZip
      const path = await fn(data, filename)
      if (path) setLastExport(path)
      return path
    }
    downloadBlob(data, filename)
    setLastExport(filename)
    return filename
  }

  const handleExportFull = async () => {
    setExporting('full')
    try {
      const data = exportFullSong(composition)
      await saveViaElectron(data, `${safeName}.mid`, 'midi')
    } finally {
      setExporting('none')
    }
  }

  const handleExportStems = async () => {
    setExporting('stems')
    try {
      const data = await exportStemsZip(composition)
      await saveViaElectron(data, `${safeName}_stems.zip`, 'zip')
    } finally {
      setExporting('none')
    }
  }

  const handleOpenExports = async () => {
    if (window.electronAPI) {
      const paths = await window.electronAPI.getPaths()
      await window.electronAPI.openFolder(paths.exportsDir)
    }
  }

  return (
    <div className="export-panel">
      <h2 className="panel-title">Export</h2>
      <p className="panel-desc">
        Export the full multitrack MIDI or a ZIP of individual stems — numbered for correct
        track order in Ableton, FL Studio, Logic Pro, and other DAWs.
      </p>

      <div className="export-summary">
        <div className="export-stat">
          <span className="stat-label">Tracks</span>
          <span className="stat-value">{composition.tracks.filter((t) => t.notes.length > 0).length}</span>
        </div>
        <div className="export-stat">
          <span className="stat-label">Bars</span>
          <span className="stat-value">{composition.totalBars}</span>
        </div>
        <div className="export-stat">
          <span className="stat-label">BPM</span>
          <span className="stat-value">{composition.bpm}</span>
        </div>
        <div className="export-stat">
          <span className="stat-label">Sections</span>
          <span className="stat-value">{composition.sections.length}</span>
        </div>
      </div>

      <div className="export-tracks">
        <h3>Stems included</h3>
        <ul>
          {composition.tracks.filter((t) => t.notes.length > 0).map((t, i) => (
            <li key={t.id}>
              <span className="stem-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="stem-color" style={{ backgroundColor: t.color }} />
              {t.name} — {t.notes.length} notes
            </li>
          ))}
        </ul>
      </div>

      <div className="export-actions">
        <button
          className="export-btn primary"
          onClick={handleExportFull}
          disabled={exporting !== 'none'}
        >
          {exporting === 'full' ? 'Exporting…' : 'Export Full Song (.mid)'}
        </button>
        <button
          className="export-btn secondary"
          onClick={handleExportStems}
          disabled={exporting !== 'none'}
        >
          {exporting === 'stems' ? 'Packaging…' : 'Export Stems (.zip)'}
        </button>
        {window.electronAPI && (
          <button className="export-btn ghost" onClick={handleOpenExports}>
            Open Exports Folder
          </button>
        )}
      </div>

      {lastExport && (
        <p className="export-success">Saved: {lastExport}</p>
      )}
    </div>
  )
}
