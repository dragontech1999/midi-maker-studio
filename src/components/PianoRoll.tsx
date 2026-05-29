import { useMemo } from 'react'
import type { Composition, Track } from '../types'
import { beatsPerBar } from '../engine/musicTheory'
import { midiToNoteName } from '../engine/musicTheory'

interface PianoRollProps {
  composition: Composition
  selectedTrack: Track | null
  currentBar: number
  zoom: number
  showAllTracks?: boolean
}

const NOTE_HEIGHT = 10
const LOW_NOTE = 36
const HIGH_NOTE = 84

export function PianoRoll({
  composition,
  selectedTrack,
  currentBar,
  zoom,
  showAllTracks = false,
}: PianoRollProps) {
  const bpb = beatsPerBar(composition.timeSignature)
  const totalBeats = composition.totalBars * bpb
  const rollWidth = totalBeats * zoom

  const noteRows = useMemo(() => {
    const rows: number[] = []
    for (let n = HIGH_NOTE; n >= LOW_NOTE; n--) rows.push(n)
    return rows
  }, [])

  const tracksToRender = showAllTracks
    ? composition.tracks.filter((t) => t.notes.length > 0)
    : selectedTrack ? [selectedTrack] : []

  const sectionMarkers = composition.sections.map((s) => ({
    name: s.name,
    left: s.startBar * bpb * zoom,
    width: s.bars * bpb * zoom,
    energy: s.energy,
  }))

  return (
    <div className="piano-roll-container">
      <div className="piano-roll-toolbar">
        <span className="roll-title">
          {showAllTracks ? 'Arrangement' : selectedTrack?.name ?? 'Piano Roll'}
        </span>
        <span className="roll-meta">
          {composition.key} {composition.scale} · {composition.timeSignature.join('/')} · {composition.totalBars} bars
        </span>
      </div>

      <div className="piano-roll-scroll">
        <div className="piano-roll" style={{ width: rollWidth + 60 }}>
          <div className="roll-sections" style={{ width: rollWidth, marginLeft: 60 }}>
            {sectionMarkers.map((s, i) => (
              <div
                key={i}
                className="section-marker"
                style={{ left: s.left, width: s.width, opacity: 0.15 + s.energy * 0.15 }}
                title={s.name}
              >
                <span className="section-label">{s.name}</span>
              </div>
            ))}
            <div
              className="playhead"
              style={{ left: currentBar * bpb * zoom }}
            />
          </div>

          <div className="roll-grid">
            <div className="roll-keys">
              {noteRows.map((midi) => {
                const { note, octave } = midiToNoteName(midi)
                const isBlack = note.includes('#')
                return (
                  <div
                    key={midi}
                    className={`roll-key ${isBlack ? 'black' : 'white'}`}
                    style={{ height: NOTE_HEIGHT }}
                  >
                    {midi % 12 === 0 ? `${note}${octave}` : ''}
                  </div>
                )
              })}
            </div>

            <div className="roll-notes-area" style={{ width: rollWidth }}>
              {Array.from({ length: composition.totalBars }).map((_, bar) => (
                <div
                  key={bar}
                  className={`bar-line ${bar % 4 === 0 ? 'major' : ''}`}
                  style={{ left: bar * bpb * zoom }}
                />
              ))}

              {tracksToRender.map((track) =>
                track.notes.map((note, i) => {
                  const top = (HIGH_NOTE - note.pitch) * NOTE_HEIGHT
                  const left = note.time * zoom
                  const width = Math.max(note.duration * zoom, 3)
                  return (
                    <div
                      key={`${track.id}-${i}`}
                      className="midi-note"
                      style={{
                        top,
                        left,
                        width,
                        height: NOTE_HEIGHT - 1,
                        backgroundColor: track.color,
                        opacity: showAllTracks ? 0.7 : 0.9,
                        boxShadow: `0 0 ${note.velocity / 40}px ${track.color}`,
                      }}
                      title={`${midiToNoteName(note.pitch).note}${midiToNoteName(note.pitch).octave} vel:${note.velocity}`}
                    />
                  )
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
