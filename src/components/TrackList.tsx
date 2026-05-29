import type { Composition } from '../types'
import { getInstrumentName } from '../constants/gmInstruments'

interface TrackListProps {
  composition: Composition
  selectedTrackId: string | null
  onSelectTrack: (id: string) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  onVolumeChange: (id: string, volume: number) => void
}

export function TrackList({
  composition,
  selectedTrackId,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
}: TrackListProps) {
  return (
    <div className="track-list">
      <div className="track-list-header">
        <span>Tracks</span>
        <span className="track-count">{composition.tracks.length}</span>
      </div>
      {composition.tracks.map((track) => (
        <div
          key={track.id}
          className={`track-item ${selectedTrackId === track.id ? 'selected' : ''}`}
          onClick={() => onSelectTrack(track.id)}
        >
          <div className="track-color" style={{ backgroundColor: track.color }} />
          <div className="track-info">
            <span className="track-name">{track.name}</span>
            <span className="track-instrument">{getInstrumentName(track.instrument)}</span>
            <span className="track-notes">{track.notes.length} notes</span>
          </div>
          <div className="track-controls" onClick={(e) => e.stopPropagation()}>
            <button
              className={`track-btn ${track.muted ? 'active' : ''}`}
              onClick={() => onToggleMute(track.id)}
              title="Mute"
            >
              M
            </button>
            <button
              className={`track-btn ${track.solo ? 'active solo' : ''}`}
              onClick={() => onToggleSolo(track.id)}
              title="Solo"
            >
              S
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={track.volume}
              onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
              className="track-volume"
              title="Volume"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
