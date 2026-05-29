import type { INoteSequence } from '@magenta/music/esm/protobuf/index'

type SequenceNote = NonNullable<INoteSequence['notes']>[number]
import type { Chord } from './musicTheory'
import type { MidiNote } from '../types'
import { midiToNoteName, noteToMidi } from './musicTheory'
import type { NoteName } from '../types'

function normalizeVelocity(v: number | undefined | null): number {
  if (v == null) return 80
  if (v <= 1) return Math.round(v * 127)
  return Math.round(Math.min(127, v))
}

export function chordToSymbol(chord: Chord): string {
  const name = midiToNoteName(chord.root).note
  switch (chord.quality) {
    case 'minor':
    case 'min7':
      return `${name}m`
    case 'dim':
      return `${name}dim`
    case 'maj7':
      return `${name}maj7`
    case 'dom7':
      return `${name}7`
    case 'aug':
      return `${name}aug`
    case 'sus2':
      return `${name}sus2`
    case 'sus4':
      return `${name}sus4`
    default:
      return name
  }
}

export function sequenceToMidiNotes(
  sequence: INoteSequence,
  bpm: number,
  startBeat = 0,
  filter?: (note: SequenceNote) => boolean,
): MidiNote[] {
  const secondsPerBeat = 60 / bpm
  const notes: MidiNote[] = []

  for (const note of sequence.notes ?? []) {
    if (filter && !filter(note)) continue
    if (note.pitch == null || note.startTime == null || note.endTime == null) continue

    notes.push({
      pitch: note.pitch,
      time: startBeat + note.startTime / secondsPerBeat,
      duration: Math.max(0.05, (note.endTime - note.startTime) / secondsPerBeat),
      velocity: normalizeVelocity(note.velocity),
    })
  }

  return notes
}

export function splitTrioSequence(sequence: INoteSequence, bpm: number, startBeat = 0): {
  drums: MidiNote[]
  bass: MidiNote[]
  melody: MidiNote[]
} {
  const drums: MidiNote[] = []
  const bass: MidiNote[] = []
  const melody: MidiNote[] = []
  const secondsPerBeat = 60 / bpm

  for (const note of sequence.notes ?? []) {
    if (note.pitch == null || note.startTime == null || note.endTime == null) continue

    const midiNote: MidiNote = {
      pitch: note.pitch,
      time: startBeat + note.startTime / secondsPerBeat,
      duration: Math.max(0.05, (note.endTime - note.startTime) / secondsPerBeat),
      velocity: normalizeVelocity(note.velocity),
    }

    if (note.isDrum) {
      drums.push(midiNote)
    } else if (note.instrument === 1 || note.pitch < 48) {
      bass.push(midiNote)
    } else {
      melody.push(midiNote)
    }
  }

  return { drums, bass, melody }
}

export function tileNotes(notes: MidiNote[], loopBeats: number, totalBeats: number): MidiNote[] {
  const result: MidiNote[] = []
  const loops = Math.ceil(totalBeats / loopBeats)

  for (let i = 0; i < loops; i++) {
    const offset = i * loopBeats
    for (const note of notes) {
      if (note.time + offset >= totalBeats) continue
      result.push({
        ...note,
        time: note.time + offset,
        velocity: note.velocity,
      })
    }
  }

  return result
}

export function transposeNotes(notes: MidiNote[], semitones: number): MidiNote[] {
  if (semitones === 0) return notes
  return notes.map((n) => ({
    ...n,
    pitch: n.pitch + semitones,
  }))
}

export function detectRootPitch(notes: MidiNote[]): number {
  if (notes.length === 0) return 60
  const pitches = notes.filter((n) => n.pitch >= 36 && n.pitch <= 84).map((n) => n.pitch % 12)
  if (pitches.length === 0) return 60

  const counts = new Array(12).fill(0)
  for (const p of pitches) counts[p]!++
  const rootPc = counts.indexOf(Math.max(...counts))
  return rootPc + 60
}

export function computeTransposeToKey(notes: MidiNote[], targetKey: NoteName): number {
  const root = detectRootPitch(notes)
  const targetPc = noteToMidi(targetKey, 4) % 12
  const currentPc = root % 12
  let semitones = targetPc - currentPc
  if (semitones > 6) semitones -= 12
  if (semitones < -6) semitones += 12
  return semitones
}

export function applyVelocityCurve(notes: MidiNote[], multiplier: number, humanize = true): MidiNote[] {
  return notes.map((n, i) => {
    let vel = Math.round(n.velocity * multiplier)
    if (humanize) {
      vel += ((i * 7 + 3) % 11) - 5
    }
    return { ...n, velocity: Math.min(127, Math.max(1, vel)) }
  })
}

export function applySectionDynamics(
  notes: MidiNote[],
  sectionStartBeat: number,
  sectionBeats: number,
  energy: number,
): MidiNote[] {
  const fadeInBeats = Math.min(2, sectionBeats * 0.15)
  const fadeOutStart = sectionStartBeat + sectionBeats - Math.min(2, sectionBeats * 0.1)

  return notes.map((n) => {
    let mult = 0.5 + energy * 0.5
    if (n.time < sectionStartBeat + fadeInBeats) {
      const t = (n.time - sectionStartBeat) / fadeInBeats
      mult *= 0.4 + t * 0.6
    }
    if (n.time >= fadeOutStart) {
      const t = (n.time - fadeOutStart) / (sectionBeats * 0.1)
      mult *= 1 - t * 0.3
    }
    return {
      ...n,
      velocity: Math.min(127, Math.max(1, Math.round(n.velocity * mult))),
    }
  })
}

export function mergeNotes(...groups: MidiNote[][]): MidiNote[] {
  return groups.flat().sort((a, b) => a.time - b.time || a.pitch - b.pitch)
}

export function trimNotesToRange(notes: MidiNote[], startBeat: number, endBeat: number): MidiNote[] {
  return notes.filter((n) => n.time >= startBeat && n.time < endBeat)
}

export function offsetNotes(notes: MidiNote[], beatOffset: number): MidiNote[] {
  return notes.map((n) => ({ ...n, time: n.time + beatOffset }))
}

export function sequenceTotalBeats(sequence: INoteSequence, bpm: number): number {
  const secondsPerBeat = 60 / bpm
  return (sequence.totalTime ?? 0) / secondsPerBeat
}

export function stripDrumsFromSequence(sequence: INoteSequence): INoteSequence {
  return {
    ...sequence,
    notes: (sequence.notes ?? []).filter((n) => !n.isDrum),
  }
}

export function stripMelodyFromSequence(sequence: INoteSequence): INoteSequence {
  return {
    ...sequence,
    notes: (sequence.notes ?? []).filter((n) => n.isDrum || (n.instrument === 1 || (n.pitch != null && n.pitch < 48))),
  }
}

export function notesToSequence(notes: MidiNote[], bpm: number, isDrum = false): INoteSequence {
  const secondsPerBeat = 60 / bpm
  const totalTime = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0) * secondsPerBeat

  return {
    totalTime,
    tempos: [{ time: 0, qpm: bpm }],
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    notes: notes.map((n) => ({
      pitch: n.pitch,
      startTime: n.time * secondsPerBeat,
      endTime: (n.time + n.duration) * secondsPerBeat,
      velocity: n.velocity / 127,
      instrument: isDrum ? 9 : 0,
      isDrum,
    })),
  } as INoteSequence
}
