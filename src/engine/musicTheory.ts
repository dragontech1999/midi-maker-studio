import type { NoteName, ScaleMode } from '../types'

const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'pentatonic-major': [0, 2, 4, 7, 9],
  'pentatonic-minor': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
}

export const CHORD_QUALITIES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
} as const

export type ChordQuality = keyof typeof CHORD_QUALITIES

export interface Chord {
  root: number
  quality: ChordQuality
  pitches: number[]
  roman: string
}

export function noteToMidi(note: NoteName, octave = 4): number {
  const idx = NOTE_NAMES.indexOf(note)
  return (octave + 1) * 12 + idx
}

export function midiToNoteName(midi: number): { note: NoteName; octave: number } {
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[midi % 12]!
  return { note, octave }
}

export function getScaleNotes(root: NoteName, mode: ScaleMode, octave = 4): number[] {
  const rootMidi = noteToMidi(root, octave)
  const intervals = SCALE_INTERVALS[mode]
  return intervals.map((i) => rootMidi + i)
}

export function getScalePitchClasses(root: NoteName, mode: ScaleMode): number[] {
  const rootIdx = NOTE_NAMES.indexOf(root)
  return SCALE_INTERVALS[mode].map((i) => (rootIdx + i) % 12)
}

export function transpose(midi: number, semitones: number): number {
  return midi + semitones
}

export function isInScale(pitch: number, root: NoteName, mode: ScaleMode): boolean {
  const pc = pitch % 12
  return getScalePitchClasses(root, mode).includes(pc)
}

export function snapToScale(pitch: number, root: NoteName, mode: ScaleMode): number {
  if (isInScale(pitch, root, mode)) return pitch
  const scalePcs = getScalePitchClasses(root, mode)
  const pc = pitch % 12
  let best = scalePcs[0]!
  let minDist = 12
  for (const sp of scalePcs) {
    const dist = Math.min(Math.abs(pc - sp), 12 - Math.abs(pc - sp))
    if (dist < minDist) {
      minDist = dist
      best = sp
    }
  }
  const octave = Math.floor(pitch / 12)
  return octave * 12 + best
}

export function buildChord(rootMidi: number, quality: ChordQuality): Chord {
  const intervals = CHORD_QUALITIES[quality]
  return {
    root: rootMidi,
    quality,
    pitches: intervals.map((i) => rootMidi + i),
    roman: '',
  }
}

export function voiceChord(
  pitches: number[],
  minPitch = 48,
  maxPitch = 72,
): number[] {
  const voiced: number[] = []
  for (let i = 0; i < pitches.length; i++) {
    let p = pitches[i]!
    while (p < minPitch) p += 12
    while (p > maxPitch) p -= 12
    if (i > 0 && p <= voiced[i - 1]!) p += 12
    voiced.push(p)
  }
  return voiced
}

export function getDiatonicChords(root: NoteName, mode: ScaleMode): Chord[] {
  const scaleNotes = getScaleNotes(root, mode, 4)
  const qualities: ChordQuality[] =
    mode === 'major' || mode === 'lydian' || mode === 'mixolydian'
      ? ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim']
      : mode === 'harmonic-minor'
        ? ['minor', 'dim', 'aug', 'minor', 'major', 'major', 'dim']
        : ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major']

  const romans =
    mode === 'major'
      ? ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
      : ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']

  return scaleNotes.map((note, i) => {
    const chord = buildChord(note, qualities[i % qualities.length]!)
    chord.roman = romans[i % romans.length]!
    return chord
  })
}

export function degreeToChord(
  root: NoteName,
  mode: ScaleMode,
  degree: number,
  qualityOverride?: ChordQuality,
): Chord {
  const diatonic = getDiatonicChords(root, mode)
  const idx = ((degree - 1) % 7 + 7) % 7
  const chord = { ...diatonic[idx]! }
  if (qualityOverride) {
    const rebuilt = buildChord(chord.root, qualityOverride)
    rebuilt.roman = chord.roman
    return rebuilt
  }
  return chord
}

export function beatsPerBar(timeSignature: [number, number]): number {
  return timeSignature[0]!
}

export function barToSeconds(bar: number, bpm: number, timeSignature: [number, number]): number {
  const beats = bar * beatsPerBar(timeSignature)
  return (beats * 60) / bpm
}

export function tickToBar(tick: number, ppq: number, timeSignature: [number, number]): number {
  const beats = tick / ppq
  return beats / beatsPerBar(timeSignature)
}

export { NOTE_NAMES, SCALE_INTERVALS }
