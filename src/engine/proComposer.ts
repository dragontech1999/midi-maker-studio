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
  voiceChord,
  type Chord,
} from './musicTheory'
import { getGenreById, parseRomanNumeral } from './genres'
import { SeededRandom } from './random'
import {
  getMagentaEngine,
  createSeedSequence,
  type ProgressCallback,
} from './magentaEngine'
import {
  applySectionDynamics,
  applyVelocityCurve,
  chordToSymbol,
  computeTransposeToKey,
  mergeNotes,
  offsetNotes,
  sequenceToMidiNotes,
  splitTrioSequence,
  tileNotes,
  transposeNotes,
} from './noteSequenceUtils'
import { generateDrums } from './drumPatterns'
import { generateComposition } from './composer'

export type { ProgressCallback }

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

function resolveProgression(romanProgression: string[], key: NoteName, scale: ScaleMode): Chord[] {
  return romanProgression.map((roman) => {
    const { degree, quality } = parseRomanNumeral(roman)
    return degreeToChord(key, scale, degree, quality)
  })
}

function buildSections(
  template: ReturnType<typeof getGenreById>['sectionTemplate'],
  length: GenerateOptions['length'],
  rng: SeededRandom,
): SongSection[] {
  let sections = template.map((s) => ({
    ...s,
    type: s.type as SectionType,
    name: capitalize(s.type),
    startBar: 0,
  }))

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
    volume: 0.8,
    notes: [],
    color: TRACK_COLORS[role],
  }
}

function getChordAtBar(chords: Chord[], barInSection: number, sectionBars: number): Chord {
  const perBar = sectionBars / chords.length
  const idx = Math.min(Math.floor(barInSection / perBar), chords.length - 1)
  return chords[idx]!
}

function generateHarmony(
  chords: Chord[],
  sectionBars: number,
  startBar: number,
  bpb: number,
  energy: number,
  role: 'chords' | 'pad' | 'strings' | 'arpeggio',
  rng: SeededRandom,
): MidiNote[] {
  const notes: MidiNote[] = []
  const beatDur = 1 / bpb

  for (let bar = 0; bar < sectionBars; bar++) {
    const chord = getChordAtBar(chords, bar, sectionBars)
    const barTime = (startBar + bar) * bpb
    const vel = Math.round((role === 'pad' ? 35 : role === 'strings' ? 50 : 55) + energy * 35)

    if (role === 'arpeggio') {
      const arpPitches = [...chord.pitches, chord.pitches[0]! + 12].map((p) => p + 12)
      for (let step = 0; step < bpb * 4; step++) {
        notes.push({
          pitch: arpPitches[step % arpPitches.length]!,
          time: barTime + step * (beatDur / 4),
          duration: beatDur * 0.25,
          velocity: vel + rng.int(-5, 5),
        })
      }
    } else {
      const octaveShift = role === 'strings' ? 12 : role === 'pad' ? 12 : 0
      const range = role === 'pad' ? [60, 84] as const : [52, 72] as const
      const voiced = voiceChord(chord.pitches.map((p) => p + octaveShift), range[0], range[1])
      const duration = bpb * (role === 'pad' ? 0.98 : 0.85)

      for (const pitch of voiced) {
        notes.push({
          pitch,
          time: barTime,
          duration,
          velocity: vel + rng.int(-4, 4),
        })
      }
    }
  }

  return notes
}

function sectionTemperature(section: SongSection, complexity: number): number {
  const base = 0.85 + complexity * 0.35
  switch (section.type) {
    case 'intro':
    case 'outro':
    case 'breakdown':
      return base * 0.85
    case 'chorus':
    case 'drop':
      return base * 1.15
    case 'build-up':
      return base * 1.05
    default:
      return base
  }
}

function addTransitionFill(
  drums: MidiNote[],
  sectionStartBeat: number,
  bpb: number,
  type: SectionType,
  rng: SeededRandom,
): MidiNote[] {
  if (type !== 'build-up' && type !== 'pre-chorus' && type !== 'drop') return drums

  const fill: MidiNote[] = []
  const start = sectionStartBeat - bpb
  if (start < 0) return drums

  for (let i = 0; i < 8; i++) {
    fill.push({
      pitch: i % 2 === 0 ? 42 : 46,
      time: start + (i * bpb) / 8,
      duration: 0.05,
      velocity: 70 + rng.int(0, 20),
    })
  }
  if (type === 'drop') {
    fill.push({ pitch: 49, time: sectionStartBeat - 0.01, duration: 0.3, velocity: 110 })
  }

  return mergeNotes(drums, fill)
}

export async function generateCompositionAsync(
  options: GenerateOptions,
  onProgress?: ProgressCallback,
): Promise<Composition> {
  const modelMode = options.modelMode ?? 'auto'

  try {
    return await generateWithMagenta(options, onProgress, modelMode)
  } catch (aiErr) {
    console.warn('Magenta AI generation failed, using procedural fallback:', aiErr)
    onProgress?.('AI unavailable — using procedural engine…', 0.5)
    const fallback = generateComposition({ ...options, seed: options.seed ?? Date.now() })
    onProgress?.('Procedural song ready', 1)
    return fallback
  }
}

async function generateWithMagenta(
  options: GenerateOptions,
  onProgress: ProgressCallback | undefined,
  modelMode: import('../types').ModelMode,
): Promise<Composition> {
  const genre = getGenreById(options.genre)
  const seed = options.seed ?? Date.now()
  const rng = new SeededRandom(seed)
  const progression = rng.pick(genre.progressions)
  const chords = resolveProgression(progression, options.key, options.scale)
  const chordSymbols = chords.map(chordToSymbol)
  const sections = buildSections(genre.sectionTemplate, options.length, rng)
  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0)
  const bpb = beatsPerBar(options.timeSignature)

  onProgress?.('Initializing Google Magenta AI…', 0.02)

  const ai = getMagentaEngine()
  await ai.ensureReady({ modelMode, onProgress: (msg, p) => onProgress?.(msg, 0.02 + p * 0.3) })

  const trackMap = new Map<TrackRole, Track>()
  let channel = 0
  for (const role of genre.trackRoles as TrackRole[]) {
    const instKey = role as keyof typeof genre.instruments
    trackMap.set(role, createTrack(role, genre.instruments[instKey] ?? 0, channel++))
  }

  const loopBars = 4
  const loopBeats = loopBars * bpb
  const seedPitch = getScaleNotes(options.key, options.scale, 5)[rng.int(2, 5)]!

  let sectionIdx = 0
  for (const section of sections) {
    sectionIdx++
    const progressBase = 0.28 + (sectionIdx / sections.length) * 0.65
    onProgress?.(`Generating ${section.name} (Magenta AI)…`, progressBase)

    const energy = Math.min(1, section.energy * options.energy)
    const density = Math.min(1, section.density * (0.5 + options.complexity * 0.5))
    const sectionBeats = section.bars * bpb
    const sectionStartBeat = section.startBar * bpb
    const temp = sectionTemperature(section, options.complexity)

    const sectionChords = chordSymbols.slice(0, Math.max(2, Math.ceil(chordSymbols.length * density)))

    const [trioSeq, melodySeq, drumSeq] = await Promise.all([
      ai.sampleTrio(temp, options.bpm, sectionChords),
      density > 0.4 ? ai.sampleMelody(temp * 0.95, options.bpm, sectionChords) : null,
      energy > 0.35 ? ai.sampleDrums(temp, options.bpm) : null,
    ])

    let { drums: trioDrums, bass: trioBass, melody: trioMelody } = splitTrioSequence(
      trioSeq,
      options.bpm,
      0,
    )

    if (trioMelody.length > 0) {
      const transpose = computeTransposeToKey(trioMelody, options.key)
      trioMelody = transposeNotes(trioMelody, transpose)
      trioBass = transposeNotes(trioBass, transpose)
    }

    if (melodySeq) {
      let aiMelody = sequenceToMidiNotes(melodySeq, options.bpm, 0, (n) => !n.isDrum)
      aiMelody = transposeNotes(aiMelody, computeTransposeToKey(aiMelody, options.key))
      trioMelody = mergeNotes(trioMelody, aiMelody)
    }

    if (drumSeq && energy > 0.5) {
      const aiDrums = sequenceToMidiNotes(drumSeq, options.bpm, 0, (n) => !!n.isDrum)
      trioDrums = mergeNotes(trioDrums, aiDrums)
    }

    if (section.type === 'chorus' || section.type === 'drop') {
      try {
        const improvSteps = Math.min(64, section.bars * 16)
        const improvSeed = createSeedSequence(seedPitch, options.bpm)
        const improvSeq = await ai.continueImprovMelody(improvSeed, improvSteps, temp, sectionChords)
        let improvNotes = sequenceToMidiNotes(improvSeq, options.bpm, 0, (n) => !n.isDrum && (n.pitch ?? 0) > 55)
        improvNotes = transposeNotes(improvNotes, computeTransposeToKey(improvNotes, options.key))
        trioMelody = mergeNotes(trioMelody, improvNotes)
      } catch {
        // ImprovRNN optional enhancement
      }
    }

    trioDrums = tileNotes(trioDrums, loopBeats, sectionBeats)
    trioBass = tileNotes(trioBass, loopBeats, sectionBeats)
    trioMelody = tileNotes(trioMelody, loopBeats, sectionBeats)

    if (trioDrums.length < sectionBeats * 0.5) {
      const fallbackDrums = generateDrums(genre.drumStyle, section.bars, bpb, energy, density, rng, genre.swing)
      trioDrums = mergeNotes(trioDrums, fallbackDrums)
    }

    trioDrums = offsetNotes(trioDrums, sectionStartBeat)
    trioBass = offsetNotes(trioBass, sectionStartBeat)
    trioMelody = offsetNotes(trioMelody, sectionStartBeat)

    trioDrums = applySectionDynamics(trioDrums, sectionStartBeat, sectionBeats, energy)
    trioBass = applySectionDynamics(trioBass, sectionStartBeat, sectionBeats, energy)
    trioMelody = applySectionDynamics(trioMelody, sectionStartBeat, sectionBeats, energy)

    trioDrums = applyVelocityCurve(trioDrums, 0.9 + energy * 0.1)
    trioBass = applyVelocityCurve(trioBass, 0.85 + energy * 0.15)
    trioMelody = applyVelocityCurve(trioMelody, 0.8 + energy * 0.2)

    trioDrums = addTransitionFill(trioDrums, sectionStartBeat, bpb, section.type, rng)

    const drumTrack = trackMap.get('drums')
    if (drumTrack && energy > 0.2) drumTrack.notes.push(...trioDrums)

    const bassTrack = trackMap.get('bass')
    if (bassTrack && density > 0.25) bassTrack.notes.push(...trioBass)

    const melodyTrack = trackMap.get('melody')
    if (melodyTrack && density > 0.3) melodyTrack.notes.push(...trioMelody)

    const chordTrack = trackMap.get('chords')
    if (chordTrack && density > 0.35) {
      chordTrack.notes.push(
        ...offsetNotes(generateHarmony(chords, section.bars, section.startBar, bpb, energy, 'chords', rng), 0),
      )
    }

    const padTrack = trackMap.get('pad')
    if (padTrack && energy > 0.25) {
      padTrack.notes.push(
        ...offsetNotes(generateHarmony(chords, section.bars, section.startBar, bpb, energy * 0.7, 'pad', rng), 0),
      )
    }

    const arpTrack = trackMap.get('arpeggio')
    if (arpTrack && density > 0.5 && energy > 0.45) {
      arpTrack.notes.push(
        ...offsetNotes(generateHarmony(chords, section.bars, section.startBar, bpb, energy, 'arpeggio', rng), 0),
      )
    }

    const stringsTrack = trackMap.get('strings')
    if (stringsTrack && energy > 0.45) {
      stringsTrack.notes.push(
        ...offsetNotes(generateHarmony(chords, section.bars, section.startBar, bpb, energy * 0.85, 'strings', rng), 0),
      )
    }

    const leadTrack = trackMap.get('lead')
    if (leadTrack && energy > 0.6 && trioMelody.length > 0) {
      leadTrack.notes.push(
        ...trioMelody
          .filter((_, i) => i % 2 === 0)
          .map((n) => ({ ...n, pitch: n.pitch + 12, velocity: Math.min(127, n.velocity + 12) })),
      )
    }

    const brassTrack = trackMap.get('brass')
    if (brassTrack && section.type === 'chorus' && energy > 0.65) {
      brassTrack.notes.push(
        ...offsetNotes(generateHarmony(chords, Math.min(section.bars, 4), section.startBar, bpb, energy, 'chords', rng)
          .map((n) => ({ ...n, pitch: n.pitch + 7, velocity: n.velocity + 8 })), 0),
      )
    }
  }

  onProgress?.('Finalizing arrangement…', 0.98)

  return {
    title: `${genre.name} — ${options.key} ${options.scale.replace(/-/g, ' ')}`,
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

export { generateComposition } from './composer'
