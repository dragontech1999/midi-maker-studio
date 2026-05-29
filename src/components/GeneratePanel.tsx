import { useState } from 'react'
import type { GenerateOptions, GenreId, NoteName, ScaleMode, ModelMode } from '../types'
import { GENRES } from '../engine/genres'
import { getDefaultBpm, getDefaultScale } from '../engine/proComposer'
import { NOTE_NAMES } from '../engine/musicTheory'
import { ModelPanel } from './ModelPanel'

interface GeneratePanelProps {
  onGenerate: (options: GenerateOptions) => void
  isGenerating: boolean
  generationStatus?: string
  generationProgress?: number
}

const SCALE_MODES: ScaleMode[] = [
  'major', 'minor', 'harmonic-minor', 'melodic-minor',
  'dorian', 'mixolydian', 'phrygian', 'lydian', 'locrian',
  'pentatonic-major', 'pentatonic-minor', 'blues',
]

export function GeneratePanel({
  onGenerate,
  isGenerating,
  generationStatus,
  generationProgress = 0,
}: GeneratePanelProps) {
  const [genre, setGenre] = useState<GenreId>('pop')
  const [key, setKey] = useState<NoteName>('C')
  const [scale, setScale] = useState<ScaleMode>('major')
  const [bpm, setBpm] = useState(120)
  const [complexity, setComplexity] = useState(0.7)
  const [energy, setEnergy] = useState(0.75)
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modelMode, setModelMode] = useState<ModelMode>('auto')
  const [sideStatus, setSideStatus] = useState('')

  const categories = ['all', ...new Set(GENRES.map((g) => g.category))]

  const filteredGenres = categoryFilter === 'all'
    ? GENRES
    : GENRES.filter((g) => g.category === categoryFilter)

  const handleGenreChange = (id: GenreId) => {
    setGenre(id)
    setBpm(getDefaultBpm(id))
    setScale(getDefaultScale(id))
  }

  const handleGenerate = () => {
    onGenerate({
      genre,
      key,
      scale,
      bpm,
      timeSignature: [4, 4],
      complexity,
      energy,
      length,
      modelMode,
    })
  }

  const activeStatus = isGenerating ? generationStatus : sideStatus
  const activeProgress = isGenerating ? generationProgress : 0

  return (
    <div className="generate-panel">
      <h2 className="panel-title">Generate Song</h2>
      <p className="panel-desc">
        Google Magenta AI with offline model support, connection checks, and procedural fallback.
      </p>

      <ModelPanel
        modelMode={modelMode}
        onModelModeChange={setModelMode}
        disabled={isGenerating}
        onDownloadProgress={(msg, p) => setSideStatus(`${msg} (${Math.round(p * 100)}%)`)}
      />

      <div className="form-group">
        <label>Genre</label>
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-tab ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
        <select value={genre} onChange={(e) => handleGenreChange(e.target.value as GenreId)}>
          {filteredGenres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.defaultBpm[0]}–{g.defaultBpm[1]} BPM)
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Key</label>
          <select value={key} onChange={(e) => setKey(e.target.value as NoteName)}>
            {NOTE_NAMES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Scale</label>
          <select value={scale} onChange={(e) => setScale(e.target.value as ScaleMode)}>
            {SCALE_MODES.map((s) => (
              <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Tempo: {bpm} BPM</label>
        <input type="range" min={60} max={200} value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} />
      </div>

      <div className="form-group">
        <label>Complexity: {Math.round(complexity * 100)}%</label>
        <input type="range" min={0} max={1} step={0.05} value={complexity} onChange={(e) => setComplexity(parseFloat(e.target.value))} />
      </div>

      <div className="form-group">
        <label>Energy: {Math.round(energy * 100)}%</label>
        <input type="range" min={0} max={1} step={0.05} value={energy} onChange={(e) => setEnergy(parseFloat(e.target.value))} />
      </div>

      <div className="form-group">
        <label>Length</label>
        <div className="length-buttons">
          {(['short', 'medium', 'long'] as const).map((l) => (
            <button
              key={l}
              className={`length-btn ${length === l ? 'active' : ''}`}
              onClick={() => setLength(l)}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {(isGenerating || activeStatus) && (
        <div className="generation-progress">
          <div className="generation-progress-bar">
            <div
              className="generation-progress-fill"
              style={{ width: `${Math.round(activeProgress * 100)}%` }}
            />
          </div>
          <p className="generation-status">{activeStatus}</p>
        </div>
      )}

      <button className="generate-btn" onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating…' : 'Generate Professional Song'}
      </button>
    </div>
  )
}
