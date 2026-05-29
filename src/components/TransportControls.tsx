import type { TransportState } from '../types'

interface TransportControlsProps {
  transport: TransportState
  currentBar: number
  totalBars: number
  bpm: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  disabled?: boolean
}

export function TransportControls({
  transport,
  currentBar,
  totalBars,
  bpm,
  onPlay,
  onPause,
  onStop,
  disabled,
}: TransportControlsProps) {
  const barDisplay = Math.floor(currentBar) + 1
  const progress = totalBars > 0 ? (currentBar / totalBars) * 100 : 0

  return (
    <div className="transport">
      <div className="transport-buttons">
        <button
          className="transport-btn play"
          onClick={transport === 'playing' ? onPause : onPlay}
          disabled={disabled}
          title={transport === 'playing' ? 'Pause' : 'Play'}
        >
          {transport === 'playing' ? '⏸' : '▶'}
        </button>
        <button className="transport-btn stop" onClick={onStop} disabled={disabled} title="Stop">
          ⏹
        </button>
      </div>
      <div className="transport-info">
        <span className="transport-bar">
          Bar {barDisplay} / {totalBars || '—'}
        </span>
        <span className="transport-bpm">{bpm} BPM</span>
      </div>
      <div className="transport-progress">
        <div className="transport-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
