import type {
  Composition,
  GenerateOptions,
  GenreId,
  MidiNote,
  NoteName,
  ScaleMode,
  SectionType,
  SongSection,
  Track,
  TrackRole,
} from '../types'
import {
  beatsPerBar,
  degreeToChord,
  snapToScale,
  voiceChord,
  type Chord,
} from './musicTheory'
import { getGenreById, parseRomanNumeral } from './genres'
import { generateDrums } from './drumPatterns'
import { SeededRandom } from './random'

const TRACK_COLORS: Record<TrackRole, string> = {
  drums: '#e74c3c',
  bass: '#3498db',
  chords: '#9b59b6',
  melody: '#2ecc71',
  'counter-melody': '#1abc9c',
  arpeggio: '#f39c12',
  pad: '#636e72',
  strings: '#d4a574',
  brass: '#e67e22',
  lead: '#00cec9',
  fx: '#fd79a8',
}

const ROLE_LABELS: Record<TrackRole, string> = {
  drums: 'Drums',
  bass: 'Bass',
  chords: 'Chords',
  melody: 'Melody',
  'counter-melody': 'Counter Melody',
  arpeggio: 'Arpeggio',
  pad: 'Pad',
  strings: 'Strings',
  brass: 'Brass',
  lead: 'Lead',
  fx: 'FX',
}

const CHORD_STYLE: Record<string, string> = {
  pop: 'pop-strum',
  rock: 'rock-power',
  'hip-hop': 'hiphop-stab',
  house: 'house-offbeat',
  techno: 'techno-stab',
  industrial: 'industrial-pulse',
  jazz: 'jazz-comp',
  metal: 'metal-chug',
  'r-and-b': 'rnb-keys',
  cinematic: 'cinematic-sustain',
  trance: 'trance-sustain',
  dubstep: 'dubstep-halftime',
  'drum-and-bass': 'dnb-stab',
  country: 'country-boomchick',
  classical: 'classical-sustain',
  ambient: 'ambient-drone',
  reggae: 'reggae-skank',
  latin: 'latin-montuno',
  funk: 'funk-chop',
  soul: 'soul-keys',
}

const ROLE_VOLUME: Record<TrackRole, number> = {
  drums: 0.92,
  bass: 0.9,
  chords: 0.78,
  melody: 0.86,
  'counter-melody': 0.7,
  arpeggio: 0.64,
  pad: 0.55,
  strings: 0.7,
  brass: 0.74,
  lead: 0.72,
  fx: 0.5,
}

function resolveProgression(romanProgression: string[], key: NoteName, scale: ScaleMode): Chord[] {
  return romanProgression.map((roman) => {
    const { degree, quality, flat } = parseRomanNumeral(roman)
    return degreeToChord(key, scale, degree, quality, flat)
  })
}

function getChordAtBar(chords: Chord[], bar: number, hold = 1): Chord {
  return chords[Math.floor(bar / hold) % chords.length]!
}

function vel(base: number, rng?: SeededRandom, spread = 6): number {
  const jitter = rng ? rng.int(-spread, spread) : 0
  return Math.max(1, Math.min(127, Math.round(base + jitter)))
}

function inRange(pitch: number, low: number, high: number): number {
  let p = pitch
  while (p < low) p += 12
  while (p > high) p -= 12
  return p
}

function bassPitch(root: number, low = 31, high = 48): number {
  return inRange(root, low, high)
}

function swingTime(time: number, swing: number): number {
  if (swing <= 0) return time
  const frac = time - Math.floor(time)
  if (Math.abs(frac - 0.5) < 0.02) return time + (swing / 0.33) * (1 / 6)
  return time
}

function addNote(notes: MidiNote[], pitch: number, time: number, duration: number, velocity: number, swing = 0): void {
  notes.push({
    pitch,
    time: swingTime(time, swing),
    duration: Math.max(0.05, duration),
    velocity: Math.max(1, Math.min(127, velocity)),
  })
}

function addVoicing(
  notes: MidiNote[],
  pitches: number[],
  time: number,
  duration: number,
  velocity: number,
  strum = 0,
  swing = 0,
): void {
  pitches.forEach((pitch, i) => {
    addNote(notes, pitch, time + i * strum, duration, velocity - i * 4, swing)
  })
}

function powerPitches(root: number): number[] {
  const r = inRange(root, 40, 52)
  return [r, r + 7, r + 12]
}

function triad(chord: Chord, low: number, high: number): number[] {
  return voiceChord(chord.pitches, low, high)
}

function generateBassLine(
  style: string,
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  density: number,
  swing: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const hold = style === 'drone-low' ? 2 : 1

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, hold)
    const next = getChordAtBar(chords, bar + 1, hold)
    const root = bassPitch(chord.root, style === 'sub-808' || style === 'wobble-sub' || style === 'reese-sub' ? 26 : 31, style === 'sub-808' ? 40 : 50)
    const fifth = bassPitch(chord.root + 7, 31, 55)
    const barTime = (startBar + bar) * bpb
    const v = 70 + energy * 35

    switch (style) {
      case 'sub-808':
        addNote(notes, root, barTime, 2.6, vel(v + 12, rng))
        if (density > 0.45 && rng.bool(0.45)) addNote(notes, root, barTime + 2.5, 1.1, vel(v - 6, rng))
        break

      case 'walking': {
        const tones = chord.pitches.map((p) => bassPitch(p, 33, 52))
        for (let beat = 0; beat < bpb; beat++) {
          const pitch = beat === bpb - 1
            ? bassPitch(next.root + rng.pick([-1, 1, -2]), 33, 52)
            : tones[beat % tones.length]!
          addNote(notes, pitch, barTime + beat, 0.9, vel(v, rng, 4), swing)
        }
        break
      }

      case 'syncopated-funk': {
        const pattern: Array<[number, number]> = [[0, 0], [0.75, 0], [1.5, 7], [2.25, 0], [3.25, 12]]
        for (const [beat, interval] of pattern) {
          if (beat > 3 && density < 0.55) continue
          addNote(notes, bassPitch(chord.root + interval, 32, 55), barTime + beat, 0.28, vel(v, rng), swing)
        }
        break
      }

      case 'driving-eighths':
        for (let i = 0; i < bpb * 2; i++) {
          const pitch = i % 4 === 2 ? fifth : root
          addNote(notes, pitch, barTime + i * 0.5, 0.32, vel(v + (i % 2 === 0 ? 8 : -6), rng, 3))
        }
        break

      case 'sidechain-groove':
        for (let i = 0; i < bpb; i++) {
          addNote(notes, root, barTime + i + 0.5, 0.38, vel(v, rng, 3))
        }
        break

      case 'rolling-sub':
        for (let i = 0; i < bpb * 4; i++) {
          if (i % 4 === 0) continue
          if (i % 2 === 1 && !rng.bool(0.55 + density * 0.3)) continue
          addNote(notes, root, barTime + i * 0.25, 0.18, vel(v - (i % 2 ? 8 : 0), rng, 3))
        }
        break

      case 'reese-sub':
        addNote(notes, root, barTime, 1.35, vel(v + 6, rng))
        addNote(notes, bassPitch(root + 12, 38, 58), barTime + 1.5, 0.35, vel(v - 4, rng))
        addNote(notes, root, barTime + 2, 1.7, vel(v + 4, rng))
        break

      case 'distorted-pulse':
        for (let i = 0; i < bpb * 2; i++) {
          const pitch = i === bpb * 2 - 1 && bar % 2 === 1 ? bassPitch(chord.root + 6, 31, 52) : root
          addNote(notes, pitch, barTime + i * 0.5, 0.18, vel(v + 12, rng, 4))
        }
        break

      case 'wobble-sub':
        addNote(notes, root, barTime, 1.6, vel(v + 8, rng))
        for (let i = 8; i < 16; i++) {
          addNote(notes, root, barTime + i * 0.25, 0.16, vel(v + (i % 2 === 0 ? 10 : -8), rng, 2))
        }
        break

      case 'palm-muted-roots':
        for (let i = 0; i < bpb * 4; i++) {
          const accent = i % 4 === 0
          addNote(notes, root, barTime + i * 0.25, accent ? 0.2 : 0.09, vel(accent ? v + 8 : v - 16, rng, 3))
        }
        break

      case 'one-drop':
        addNote(notes, fifth, barTime + 1.5, 0.35, vel(v - 4, rng), swing)
        addNote(notes, root, barTime + 2, 1.55, vel(v + 10, rng), swing)
        break

      case 'tumbao':
        addNote(notes, root, barTime, 0.4, vel(v + 4, rng))
        addNote(notes, fifth, barTime + 1.5, 0.3, vel(v, rng))
        addNote(notes, root, barTime + 2.5, 0.45, vel(v + 2, rng))
        addNote(notes, root, barTime + 3.5, 0.25, vel(v - 4, rng))
        break

      case 'drone-low':
        if (bar % 2 === 0) addNote(notes, root, barTime, bpb * 2 * 0.98, vel(v - 8, rng, 2))
        break

      case 'contrabass':
        addNote(notes, bassPitch(chord.root, 28, 45), barTime, 1.9, vel(v - 4, rng, 3))
        addNote(notes, bassPitch(chord.root + 7, 28, 48), barTime + 2, 1.85, vel(v - 6, rng, 3))
        break

      case 'timpani-low':
        addNote(notes, bassPitch(chord.root, 31, 46), barTime, 1.3, vel(v + 6, rng))
        if (energy > 0.65) addNote(notes, bassPitch(chord.root + 7, 31, 50), barTime + 2, 1.1, vel(v, rng))
        break

      case 'root-fifth':
      default:
        addNote(notes, bassPitch(chord.root, 33, 50), barTime, 1.7, vel(v + 4, rng), swing)
        addNote(notes, fifth, barTime + 2, 1.55, vel(v, rng), swing)
        if (density > 0.72) addNote(notes, root, barTime + 3, 0.7, vel(v - 6, rng), swing)
    }
  }

  return notes
}

function generateChords(
  style: string,
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  density: number,
  swing: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const hold = style === 'ambient-drone' || style === 'cinematic-sustain' ? 2 : 1
  const v = 52 + energy * 32

  for (let bar = 0; bar < sectionBars; bar++) {
    if (hold === 2 && bar % 2 === 1) continue
    const chord = getChordAtBar(chords, bar, hold)
    const barTime = (startBar + bar) * bpb
    const voiced = triad(chord, 52, 74)
    const high = triad(chord, 62, 81)

    switch (style) {
      case 'pop-strum':
        for (const beat of density > 0.65 ? [0, 1.5, 2, 3.5] : [0, 2]) {
          addVoicing(notes, voiced, barTime + beat, 1.15, vel(v, rng), 0.018, swing)
        }
        break

      case 'rock-power':
        for (let i = 0; i < bpb * 2; i++) {
          const accent = i % 2 === 0
          addVoicing(notes, powerPitches(chord.root), barTime + i * 0.5, 0.32, vel(accent ? v + 10 : v - 16, rng, 3), 0.01)
        }
        break

      case 'metal-chug':
        for (let i = 0; i < bpb * 4; i++) {
          const accent = i % 4 === 0
          addVoicing(notes, powerPitches(chord.root), barTime + i * 0.25, accent ? 0.18 : 0.08, vel(accent ? v + 12 : v - 18, rng, 2), 0.006)
        }
        break

      case 'hiphop-stab':
        addVoicing(notes, voiced, barTime + 0.5, 0.22, vel(v, rng), 0, swing)
        if (density > 0.5) addVoicing(notes, voiced, barTime + 2.5, 0.28, vel(v - 4, rng), 0, swing)
        break

      case 'house-offbeat':
        for (let i = 0; i < bpb; i++) {
          addVoicing(notes, high, barTime + i + 0.5, 0.16, vel(v + 4, rng, 3), 0.004)
        }
        break

      case 'techno-stab':
        if (bar % 2 === 0 || density > 0.7) {
          addVoicing(notes, high.slice(0, 2), barTime + 1.5, 0.14, vel(v, rng), 0)
        }
        break

      case 'jazz-comp':
        addVoicing(notes, triad(chord, 52, 76), barTime, 0.42, vel(v, rng), 0, swing)
        addVoicing(notes, triad(chord, 52, 76), barTime + 1.5, 0.32, vel(v - 4, rng), 0, swing)
        addVoicing(notes, triad(chord, 52, 76), barTime + 3, 0.4, vel(v + 2, rng), 0, swing)
        break

      case 'reggae-skank':
        for (let i = 0; i < bpb; i++) {
          addVoicing(notes, high, barTime + i + 0.5, 0.12, vel(v + 6, rng, 3), 0.008, swing)
        }
        break

      case 'funk-chop':
        for (const beat of [0, 0.75, 1.5, 2.5, 3.25]) {
          addVoicing(notes, voiced, barTime + beat, 0.12, vel(v + 4, rng), 0.006, swing)
        }
        break

      case 'country-boomchick':
        addVoicing(notes, voiced, barTime + 1, 0.32, vel(v + 4, rng), 0.02, swing)
        addVoicing(notes, voiced, barTime + 3, 0.32, vel(v, rng), 0.02, swing)
        break

      case 'classical-sustain':
        addVoicing(notes, triad(chord, 48, 72), barTime, hold * bpb * 0.96, vel(v - 6, rng, 2))
        break

      case 'cinematic-sustain':
        addVoicing(notes, voiceChord(chord.pitches, 46, 78), barTime, hold * bpb * 0.98, vel(v - 4, rng, 2))
        break

      case 'trance-sustain':
        addVoicing(notes, voiceChord(chord.pitches.map((p) => p + 12), 60, 84), barTime, bpb * 0.98, vel(v, rng, 2))
        break

      case 'dubstep-halftime':
        addVoicing(notes, high, barTime + 2, 0.45, vel(v + 8, rng), 0.01)
        if (energy > 0.6) addVoicing(notes, high, barTime + 3.5, 0.2, vel(v, rng))
        break

      case 'dnb-stab':
        for (const beat of [0.5, 1.5, 2.75]) {
          addVoicing(notes, high, barTime + beat, 0.14, vel(v, rng), 0.004)
        }
        break

      case 'ambient-drone':
        addVoicing(notes, voiceChord(chord.pitches, 52, 79), barTime, hold * bpb * 0.99, vel(36 + energy * 18, rng, 2))
        break

      case 'latin-montuno':
        for (const beat of [0, 0.75, 1.5, 2, 3, 3.5]) {
          addVoicing(notes, high, barTime + beat, 0.18, vel(v, rng), 0.01)
        }
        break

      case 'industrial-pulse': {
        const cluster = [...powerPitches(chord.root), inRange(chord.root + 1, 40, 54)]
        for (let i = 0; i < bpb * 2; i++) {
          addVoicing(notes, cluster, barTime + i * 0.5, 0.14, vel(v + 8, rng, 4), 0.004)
        }
        break
      }

      case 'rnb-keys':
      case 'soul-keys':
        addVoicing(notes, triad(chord, 52, 76), barTime, 1.2, vel(v, rng), 0, swing)
        addVoicing(notes, triad(chord, 55, 78), barTime + 2.5, 0.7, vel(v - 4, rng), 0, swing)
        break

      default:
        addVoicing(notes, voiced, barTime, bpb * 0.9, vel(v, rng))
    }
  }

  return notes
}

interface MotifNote {
  beat: number
  duration: number
  degree: number
}

function motifFor(style: string, energy: number): { notes: MotifNote[]; low: number; high: number } {
  switch (style) {
    case 'power-intervals':
      return {
        low: 52,
        high: 76,
        notes: [
          { beat: 0, duration: 0.45, degree: 0 },
          { beat: 0.5, duration: 0.4, degree: 0 },
          { beat: 1, duration: 0.45, degree: 7 },
          { beat: 1.5, duration: 0.4, degree: 0 },
          { beat: 2, duration: 0.45, degree: 3 },
          { beat: 2.5, duration: 0.2, degree: 3 },
          { beat: 3, duration: 0.45, degree: 0 },
          { beat: 3.5, duration: 0.4, degree: 7 },
        ],
      }
    case 'sparse-motif':
      return {
        low: 60,
        high: 81,
        notes: [
          { beat: 0.5, duration: 0.4, degree: 0 },
          { beat: 2.5, duration: 0.7, degree: 7 },
        ],
      }
    case 'minimal-motif':
      return {
        low: 64,
        high: 84,
        notes: energy > 0.7
          ? [
              { beat: 0, duration: 0.2, degree: 0 },
              { beat: 0.5, duration: 0.2, degree: 0 },
              { beat: 1.5, duration: 0.2, degree: 0 },
              { beat: 2, duration: 0.2, degree: 7 },
              { beat: 3, duration: 0.2, degree: 0 },
            ]
          : [
              { beat: 0, duration: 0.35, degree: 0 },
              { beat: 2, duration: 0.35, degree: 0 },
            ],
      }
    case 'bebop-lines':
      return { low: 58, high: 81, notes: [] }
    case 'soulful-phrase':
      return {
        low: 60,
        high: 79,
        notes: [
          { beat: 0, duration: 1.4, degree: 0 },
          { beat: 1.5, duration: 0.4, degree: 2 },
          { beat: 2.5, duration: 1.2, degree: 4 },
        ],
      }
    case 'dissonant-motif':
      return {
        low: 58,
        high: 82,
        notes: [
          { beat: 0, duration: 0.3, degree: 0 },
          { beat: 0.5, duration: 0.3, degree: 1 },
          { beat: 1, duration: 0.45, degree: 6 },
          { beat: 2, duration: 0.3, degree: 0 },
          { beat: 2.5, duration: 0.3, degree: 1 },
          { beat: 3, duration: 0.5, degree: 6 },
        ],
      }
    case 'uplifting-lead':
      return {
        low: 67,
        high: 91,
        notes: [
          { beat: 0, duration: 0.9, degree: 0 },
          { beat: 1, duration: 0.9, degree: 4 },
          { beat: 2, duration: 0.9, degree: 7 },
          { beat: 3, duration: 0.9, degree: 12 },
        ],
      }
    case 'epic-theme':
      return {
        low: 60,
        high: 86,
        notes: [
          { beat: 0, duration: 1.8, degree: 0 },
          { beat: 2, duration: 1.8, degree: 7 },
        ],
      }
    case 'atmospheric':
      return {
        low: 67,
        high: 91,
        notes: [{ beat: 0, duration: 3.8, degree: 0 }],
      }
    case 'classical-theme':
      return {
        low: 64,
        high: 88,
        notes: [
          { beat: 0, duration: 0.5, degree: 0 },
          { beat: 0.5, duration: 0.5, degree: 2 },
          { beat: 1, duration: 0.5, degree: 4 },
          { beat: 1.5, duration: 0.5, degree: 2 },
          { beat: 2, duration: 1, degree: 0 },
          { beat: 3, duration: 0.5, degree: 4 },
          { beat: 3.5, duration: 0.5, degree: 7 },
        ],
      }
    case 'arpeggiated':
      return { low: 64, high: 88, notes: [] }
    case 'hook-focused':
    default:
      return {
        low: 64,
        high: 86,
        notes: [
          { beat: 0, duration: 0.9, degree: 0 },
          { beat: 1, duration: 0.45, degree: 2 },
          { beat: 1.5, duration: 0.45, degree: 4 },
          { beat: 2, duration: 1, degree: 7 },
          { beat: 3, duration: 0.9, degree: 4 },
        ],
      }
  }
}

function generateMelody(
  style: string,
  key: NoteName,
  scale: ScaleMode,
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  density: number,
  swing: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const motif = motifFor(style, energy)
  const v = 64 + energy * 40

  for (let bar = 0; bar < sectionBars; bar++) {
    if (density < 0.4 && bar % 2 === 1 && style !== 'bebop-lines' && style !== 'power-intervals' && style !== 'minimal-motif') {
      continue
    }
    const chord = getChordAtBar(chords, bar)
    const barTime = (startBar + bar) * bpb
    const root = chord.root + (energy > 0.88 && style !== 'power-intervals' ? 12 : 0)

    if (style === 'bebop-lines') {
      let pitch = inRange(snapToScale(chord.root + 12, key, scale), 58, 79)
      for (let i = 0; i < bpb * 2; i++) {
        const step = rng.pick([-2, -1, 1, 2, 2, 3])
        pitch = inRange(snapToScale(pitch + step, key, scale), 58, 81)
        if (i % 7 === 6 && rng.bool(0.4)) continue
        addNote(notes, pitch, barTime + i * 0.5, 0.42, vel(v, rng), swing)
      }
      continue
    }

    if (style === 'arpeggiated') {
      const arp = [...chord.pitches, chord.pitches[0]! + 12]
      for (let i = 0; i < bpb * 4; i++) {
        const pitch = inRange(arp[i % arp.length]! + 12, 64, 91)
        addNote(notes, pitch, barTime + i * 0.25, 0.18, vel(v - 4, rng, 4))
      }
      continue
    }

    if (style === 'atmospheric' && bar % 2 === 1) continue

    for (const hit of motif.notes) {
      const varied = bar % 4 === 3 && hit.beat >= 3 ? hit.degree + rng.pick([-2, 2, 5]) : hit.degree
      const raw = hit.degree === 0 || hit.degree === 7 || hit.degree === 12
        ? root + varied
        : snapToScale(root + varied, key, scale)
      addNote(notes, inRange(raw, motif.low, motif.high), barTime + hit.beat, hit.duration, vel(v, rng), swing)
    }
  }

  return notes
}

function generateArpeggio(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  density: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const v = 48 + energy * 36
  const steps = density > 0.55 ? 4 : 2

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar)
    const barTime = (startBar + bar) * bpb
    const arp = [...chord.pitches, chord.pitches[0]! + 12, chord.pitches[1]! + 12]
    const up = bar % 2 === 0 ? arp : [...arp].reverse()
    for (let i = 0; i < bpb * steps; i++) {
      addNote(notes, inRange(up[i % up.length]! + 12, 64, 93), barTime + i / steps, 0.45 / steps, vel(v, rng, 4))
    }
  }

  return notes
}

function generatePad(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  hold = 1,
): MidiNote[] {
  const notes: MidiNote[] = []
  const v = 32 + energy * 22
  for (let bar = 0; bar < sectionBars; bar += hold) {
    const chord = getChordAtBar(chords, bar, hold)
    const voiced = voiceChord(chord.pitches.map((p) => p + 12), 58, 84)
    const bars = Math.min(hold, sectionBars - bar)
    for (const pitch of voiced) {
      addNote(notes, pitch, (startBar + bar) * bpb, bars * bpb * 0.98, v)
    }
  }
  return notes
}

function generateStrings(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
): MidiNote[] {
  const notes: MidiNote[] = []
  const v = 44 + energy * 24
  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar)
    const voiced = voiceChord(chord.pitches, 52, 76)
    for (const pitch of voiced) {
      addNote(notes, pitch, (startBar + bar) * bpb, bpb * 0.97, v)
    }
  }
  return notes
}

function generateBrassStabs(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const v = 70 + energy * 30
  const bars = Math.min(sectionBars, 8)
  for (let bar = 0; bar < bars; bar++) {
    const chord = getChordAtBar(chords, bar)
    const voiced = voiceChord(chord.pitches, 58, 79)
    const barTime = (startBar + bar) * bpb
    addVoicing(notes, voiced, barTime, 0.45, vel(v, rng), 0.008)
    addVoicing(notes, voiced, barTime + 2, 0.55, vel(v + 4, rng), 0.008)
  }
  return notes
}

function buildSections(
  template: { type: string; bars: number; energy: number; density: number; name?: string }[],
  length: GenerateOptions['length'],
  rng: SeededRandom,
): SongSection[] {
  let sections = template.map((s) => ({ ...s, type: s.type as SectionType, name: capitalize(s.type), startBar: 0 }))

  if (length === 'short') {
    sections = sections.filter((_, i) => i < Math.ceil(sections.length * 0.5))
  } else if (length === 'long') {
    const extra = sections.filter((s) => s.type === 'chorus' || s.type === 'drop')
    sections = [...sections, ...extra.slice(0, 2)]
  }

  let bar = 0
  return sections.map((s) => {
    const section: SongSection = {
      type: s.type as SectionType,
      name: s.name,
      bars: s.bars + (length === 'long' && rng.bool(0.3) ? 4 : 0),
      startBar: bar,
      energy: s.energy,
      density: s.density,
    }
    bar += section.bars
    return section
  })
}

function capitalize(s: string): string {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function createTrack(role: TrackRole, instrument: number, channel: number): Track {
  return {
    id: `${role}-${channel}`,
    name: ROLE_LABELS[role],
    role,
    instrument,
    channel,
    muted: false,
    solo: false,
    volume: ROLE_VOLUME[role],
    notes: [],
    color: TRACK_COLORS[role],
  }
}

export function generateComposition(options: GenerateOptions): Composition {
  const genre = getGenreById(options.genre)
  const seed = options.seed ?? Date.now()
  const rng = new SeededRandom(seed)
  const progression = rng.pick(genre.progressions)
  const chords = resolveProgression(progression, options.key, options.scale)
  const sections = buildSections(genre.sectionTemplate, options.length, rng)
  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0)
  const bpb = beatsPerBar(options.timeSignature)
  const chordStyle = CHORD_STYLE[genre.id] ?? 'pop-strum'

  const trackMap = new Map<TrackRole, Track>()
  let channel = 0
  for (const role of genre.trackRoles as TrackRole[]) {
    const instKey = role as keyof typeof genre.instruments
    const instrument = genre.instruments[instKey] ?? 0
    let assigned = channel
    if (role === 'drums') assigned = 9
    else {
      if (channel === 9) channel += 1
      assigned = channel
      channel += 1
    }
    trackMap.set(role, createTrack(role, instrument, assigned))
  }

  for (const section of sections) {
    const energy = Math.min(1, section.energy * options.energy)
    const density = Math.min(1, section.density * (0.5 + options.complexity * 0.5))

    const drumTrack = trackMap.get('drums')
    if (drumTrack) {
      drumTrack.notes.push(
        ...generateDrums(genre.drumStyle, section.bars, bpb, energy, density, rng, genre.swing).map((n) => ({
          ...n,
          time: n.time + section.startBar * bpb,
        })),
      )
    }

    const bassTrack = trackMap.get('bass')
    if (bassTrack) {
      bassTrack.notes.push(
        ...generateBassLine(genre.bassStyle, chords, section.bars, section.startBar, bpb, energy, density, genre.swing, rng),
      )
    }

    const chordTrack = trackMap.get('chords')
    if (chordTrack && density > 0.32) {
      chordTrack.notes.push(
        ...generateChords(chordStyle, chords, section.bars, section.startBar, bpb, energy, density, genre.swing, rng),
      )
    }

    const melodyTrack = trackMap.get('melody')
    if (melodyTrack && density > 0.22) {
      melodyTrack.notes.push(
        ...generateMelody(genre.melodyStyle, options.key, options.scale, chords, section.bars, section.startBar, bpb, energy, density, genre.swing, rng),
      )
    }

    const arpTrack = trackMap.get('arpeggio')
    if (arpTrack && density > 0.4) {
      arpTrack.notes.push(...generateArpeggio(chords, section.bars, section.startBar, bpb, energy, density, rng))
    }

    const padTrack = trackMap.get('pad')
    if (padTrack && energy > 0.25) {
      padTrack.notes.push(...generatePad(chords, section.bars, section.startBar, bpb, energy, genre.id === 'ambient' ? 2 : 1))
    }

    const stringsTrack = trackMap.get('strings')
    if (stringsTrack && energy > 0.35) {
      stringsTrack.notes.push(...generateStrings(chords, section.bars, section.startBar, bpb, energy))
    }

    const leadTrack = trackMap.get('lead')
    if (leadTrack && energy > 0.55) {
      const leadStyle = genre.melodyStyle === 'power-intervals' || genre.melodyStyle === 'dissonant-motif'
        ? genre.melodyStyle
        : 'uplifting-lead'
      leadTrack.notes.push(
        ...generateMelody(leadStyle, options.key, options.scale, chords, section.bars, section.startBar, bpb, energy, density * 0.85, genre.swing, rng)
          .map((n) => ({ ...n, pitch: leadStyle === 'power-intervals' ? n.pitch : Math.min(96, n.pitch + 12) })),
      )
    }

    const brassTrack = trackMap.get('brass')
    if (brassTrack && energy > 0.6 && (section.type === 'chorus' || section.type === 'drop')) {
      brassTrack.notes.push(...generateBrassStabs(chords, section.bars, section.startBar, bpb, energy, rng))
    }
  }

  return {
    title: `${genre.name} in ${options.key} ${options.scale}`,
    genre: options.genre,
    key: options.key,
    scale: options.scale,
    bpm: options.bpm,
    timeSignature: options.timeSignature,
    sections,
    tracks: [...trackMap.values()],
    totalBars,
    seed,
  }
}

export function getDefaultBpm(genreId: GenreId): number {
  const genre = getGenreById(genreId)
  return Math.round((genre.defaultBpm[0]! + genre.defaultBpm[1]!) / 2)
}

export function getDefaultScale(genreId: GenreId): ScaleMode {
  return getGenreById(genreId).defaultScale as ScaleMode
}
