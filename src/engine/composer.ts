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
  getScaleNotes,
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

function resolveProgression(
  romanProgression: string[],
  key: NoteName,
  scale: ScaleMode,
): Chord[] {
  return romanProgression.map((roman) => {
    const { degree, quality } = parseRomanNumeral(roman)
    return degreeToChord(key, scale, degree, quality)
  })
}

function getChordAtBar(
  chords: Chord[],
  barInSection: number,
  sectionBars: number,
): Chord {
  const chordIndex = Math.floor((barInSection / sectionBars) * chords.length) % chords.length
  return chords[chordIndex]!
}

function generateBassLine(
  style: string,
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  beatsPerBarCount: number,
  energy: number,
  density: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatDur = 1 / beatsPerBarCount

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, sectionBars)
    const root = chord.root - 12
    const fifth = root + 7
    const barTime = (startBar + bar) * beatsPerBarCount * beatDur
    const vel = Math.round(60 + energy * 40)

    switch (style) {
      case 'sub-808':
        notes.push({ pitch: root - 12, time: barTime, duration: beatsPerBarCount * beatDur * 0.9, velocity: vel + 10 })
        if (density > 0.5 && rng.bool(0.4)) {
          notes.push({ pitch: root - 12, time: barTime + beatDur * 2, duration: beatDur * 1.5, velocity: vel - 10 })
        }
        break

      case 'walking':
        for (let beat = 0; beat < beatsPerBarCount; beat++) {
          const pitch = beat % 2 === 0 ? root : (rng.bool(0.5) ? fifth : root + rng.pick([2, 4, 5]))
          notes.push({
            pitch: pitch,
            time: barTime + beat * beatDur,
            duration: beatDur * 0.85,
            velocity: vel + rng.int(-5, 5),
          })
        }
        break

      case 'syncopated-funk':
        notes.push({ pitch: root, time: barTime, duration: beatDur * 0.7, velocity: vel + 8 })
        notes.push({ pitch: root, time: barTime + beatDur * 1.5, duration: beatDur * 0.5, velocity: vel })
        notes.push({ pitch: fifth, time: barTime + beatDur * 2.5, duration: beatDur * 0.5, velocity: vel - 5 })
        if (density > 0.6) {
          notes.push({ pitch: root, time: barTime + beatDur * 3.5, duration: beatDur * 0.4, velocity: vel - 8 })
        }
        break

      case 'driving-eighths':
        for (let beat = 0; beat < beatsPerBarCount * 2; beat++) {
          notes.push({
            pitch: beat % 4 === 2 ? fifth : root,
            time: barTime + beat * beatDur * 0.5,
            duration: beatDur * 0.4,
            velocity: vel + (beat === 0 ? 10 : 0),
          })
        }
        break

      case 'sidechain-groove':
        notes.push({ pitch: root - 12, time: barTime, duration: beatDur * 0.9, velocity: vel + 5 })
        notes.push({ pitch: root - 12, time: barTime + beatDur, duration: beatDur * 0.9, velocity: vel })
        notes.push({ pitch: root - 12, time: barTime + beatDur * 2, duration: beatDur * 0.9, velocity: vel + 3 })
        notes.push({ pitch: root - 12, time: barTime + beatDur * 3, duration: beatDur * 0.9, velocity: vel })
        break

      case 'rolling-sub':
      case 'reese-sub':
        for (let beat = 0; beat < beatsPerBarCount; beat++) {
          notes.push({
            pitch: root - 12,
            time: barTime + beat * beatDur,
            duration: beatDur * 0.95,
            velocity: vel + rng.int(-3, 3),
          })
        }
        break

      case 'distorted-pulse':
        for (let beat = 0; beat < beatsPerBarCount; beat++) {
          notes.push({
            pitch: root - 12,
            time: barTime + beat * beatDur,
            duration: beatDur * 0.3,
            velocity: Math.min(127, vel + 15),
          })
        }
        break

      case 'wobble-sub':
        notes.push({ pitch: root - 12, time: barTime, duration: beatsPerBarCount * beatDur, velocity: vel + 10 })
        break

      case 'root-fifth':
      default:
        notes.push({ pitch: root, time: barTime, duration: beatDur * 1.8, velocity: vel + 5 })
        notes.push({ pitch: fifth, time: barTime + beatDur * 2, duration: beatDur * 1.5, velocity: vel })
        if (density > 0.7) {
          notes.push({ pitch: root, time: barTime + beatDur * 3, duration: beatDur, velocity: vel - 5 })
        }
    }
  }

  return notes
}

function generateChords(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  beatsPerBarCount: number,
  energy: number,
  density: number,
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatDur = 1 / beatsPerBarCount

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, sectionBars)
    const voiced = voiceChord(chord.pitches, 52, 72)
    const barTime = (startBar + bar) * beatsPerBarCount * beatDur
    const duration = beatsPerBarCount * beatDur * (density > 0.6 ? 0.95 : 0.7)
    const vel = Math.round(45 + energy * 35)

    for (const pitch of voiced) {
      notes.push({ pitch, time: barTime, duration, velocity: vel + Math.floor(Math.random() * 8) })
    }
  }

  return notes
}

function generateMelody(
  style: string,
  key: NoteName,
  scale: ScaleMode,
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  beatsPerBarCount: number,
  energy: number,
  density: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatDur = 1 / beatsPerBarCount
  const scaleNotes = getScaleNotes(key, scale, 5)
  const restProb = 1 - density * 0.7

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, sectionBars)
    const barTime = (startBar + bar) * beatsPerBarCount * beatDur
    const vel = Math.round(55 + energy * 45)
    let cursor = 0

    const phraseLength =
      style === 'sparse-motif' ? 2 :
      style === 'minimal-motif' ? 1 :
      style === 'atmospheric' ? 4 :
      rng.int(2, 4)

    while (cursor < beatsPerBarCount) {
      if (rng.bool(restProb * 0.3)) {
        cursor += rng.pick([0.5, 1])
        continue
      }

      let pitch: number
      switch (style) {
        case 'hook-focused':
        case 'power-intervals':
          pitch = rng.bool(0.6) ? chord.pitches[0]! + 12 : scaleNotes[rng.int(0, scaleNotes.length - 1)]!
          break
        case 'bebop-lines':
          pitch = scaleNotes[rng.int(0, scaleNotes.length - 1)]! + (rng.bool(0.3) ? rng.pick([0, 1, -1]) : 0)
          break
        case 'soulful-phrase':
          pitch = snapToScale(chord.pitches[0]! + 12 + rng.pick([0, 2, 4, 7]), key, scale)
          break
        case 'dissonant-motif':
          pitch = snapToScale(chord.pitches[0]! + rng.pick([0, 1, 6, 7, 10]), key, scale)
          break
        case 'uplifting-lead':
        case 'epic-theme':
          pitch = scaleNotes[Math.min(rng.int(3, scaleNotes.length - 1), scaleNotes.length - 1)]!
          break
        default:
          pitch = scaleNotes[rng.int(0, scaleNotes.length - 1)]!
      }

      const noteDur = rng.pick([0.25, 0.5, 0.5, 1, 1]) * (phraseLength > 2 ? 1 : 0.5)
      notes.push({
        pitch,
        time: barTime + cursor * beatDur,
        duration: noteDur * beatDur * 0.9,
        velocity: vel + rng.int(-10, 10),
      })
      cursor += noteDur
    }
  }

  return notes
}

function generateArpeggio(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  beatsPerBarCount: number,
  energy: number,
  density: number,
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatDur = 1 / beatsPerBarCount
  const vel = Math.round(50 + energy * 40)

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, sectionBars)
    const barTime = (startBar + bar) * beatsPerBarCount * beatDur
    const arpNotes = [...chord.pitches, chord.pitches[0]! + 12]

    for (let step = 0; step < beatsPerBarCount * (density > 0.6 ? 4 : 2); step++) {
      const pitch = arpNotes[step % arpNotes.length]! + 12
      notes.push({
        pitch,
        time: barTime + step * (beatDur / (density > 0.6 ? 4 : 2)),
        duration: beatDur * 0.3,
        velocity: vel + rng.int(-5, 5),
      })
    }
  }

  return notes
}

function generatePad(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  beatsPerBarCount: number,
  energy: number,
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatDur = 1 / beatsPerBarCount
  const vel = Math.round(35 + energy * 25)

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, sectionBars)
    const voiced = voiceChord(chord.pitches.map((p) => p + 12), 60, 84)
    const barTime = (startBar + bar) * beatsPerBarCount * beatDur

    for (const pitch of voiced) {
      notes.push({ pitch, time: barTime, duration: beatsPerBarCount * beatDur * 0.98, velocity: vel })
    }
  }

  return notes
}

function buildSections(
  template: GenreProfile['sectionTemplate'],
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

type GenreProfile = ReturnType<typeof getGenreById>

function createTrack(
  role: TrackRole,
  instrument: number,
  channel: number,
): Track {
  return {
    id: `${role}-${channel}`,
    name: ROLE_LABELS[role],
    role,
    instrument,
    channel,
    muted: false,
    solo: false,
    volume: 0.8,
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

  const trackMap = new Map<TrackRole, Track>()
  let channel = 0

  for (const role of genre.trackRoles as TrackRole[]) {
    const instKey = role as keyof typeof genre.instruments
    const instrument = genre.instruments[instKey] ?? 0
    trackMap.set(role, createTrack(role, instrument, channel++))
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
        ...generateBassLine(
          genre.bassStyle,
          chords,
          section.bars,
          section.startBar,
          bpb,
          energy,
          density,
          rng,
        ).map((n) => ({ ...n, time: n.time })),
      )
    }

    const chordTrack = trackMap.get('chords')
    if (chordTrack && density > 0.35) {
      chordTrack.notes.push(
        ...generateChords(chords, section.bars, section.startBar, bpb, energy, density),
      )
    }

    const melodyTrack = trackMap.get('melody')
    if (melodyTrack && density > 0.25) {
      melodyTrack.notes.push(
        ...generateMelody(
          genre.melodyStyle,
          options.key,
          options.scale,
          chords,
          section.bars,
          section.startBar,
          bpb,
          energy,
          density,
          rng,
        ),
      )
    }

    const arpTrack = trackMap.get('arpeggio')
    if (arpTrack && density > 0.45) {
      arpTrack.notes.push(
        ...generateArpeggio(chords, section.bars, section.startBar, bpb, energy, density, rng),
      )
    }

    const padTrack = trackMap.get('pad')
    if (padTrack && energy > 0.3) {
      padTrack.notes.push(
        ...generatePad(chords, section.bars, section.startBar, bpb, energy),
      )
    }

    const stringsTrack = trackMap.get('strings')
    if (stringsTrack && energy > 0.4) {
      stringsTrack.notes.push(
        ...generateChords(chords, section.bars, section.startBar, bpb, energy * 0.8, density * 0.7).map((n) => ({
          ...n,
          pitch: n.pitch + 12,
          velocity: Math.round(n.velocity * 0.85),
        })),
      )
    }

    const leadTrack = trackMap.get('lead')
    if (leadTrack && energy > 0.55) {
      leadTrack.notes.push(
        ...generateMelody(
          'uplifting-lead',
          options.key,
          options.scale,
          chords,
          section.bars,
          section.startBar,
          bpb,
          energy,
          density * 0.8,
          rng,
        ).map((n) => ({ ...n, pitch: n.pitch + 12, velocity: Math.min(127, n.velocity + 10) })),
      )
    }

    const brassTrack = trackMap.get('brass')
    if (brassTrack && energy > 0.6 && section.type === 'chorus') {
      brassTrack.notes.push(
        ...generateMelody(
          'power-intervals',
          options.key,
          options.scale,
          chords,
          Math.min(section.bars, 4),
          section.startBar,
          bpb,
          energy,
          density * 0.6,
          rng,
        ).map((n) => ({ ...n, velocity: n.velocity + 5 })),
      )
    }
  }

  const genreNames: Record<GenreId, string> = Object.fromEntries(
    genre.id ? [[genre.id, genre.name]] : [],
  ) as Record<GenreId, string>

  return {
    title: `${genreNames[options.genre as GenreId] ?? genre.name} in ${options.key} ${options.scale}`,
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
  const genre = getGenreById(genreId)
  return genre.defaultScale as ScaleMode
}
