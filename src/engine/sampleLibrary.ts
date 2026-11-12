/** MusyngKite GM samples (midi-js-soundfonts), bundled for offline playback. */

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export interface SampleProgram {
  folder: string
  low: number
  high: number
  step: number
  attack: number
  release: number
}

export const PROGRAM_SAMPLES: Record<number, SampleProgram> = {
  0: { folder: 'acoustic_grand_piano', low: 21, high: 96, step: 4, attack: 0.005, release: 0.5 },
  4: { folder: 'electric_piano_1', low: 36, high: 84, step: 3, attack: 0.004, release: 0.4 },
  5: { folder: 'electric_piano_2', low: 36, high: 84, step: 3, attack: 0.004, release: 0.45 },
  16: { folder: 'drawbar_organ', low: 36, high: 84, step: 3, attack: 0.008, release: 0.12 },
  24: { folder: 'acoustic_guitar_nylon', low: 40, high: 84, step: 3, attack: 0.004, release: 0.35 },
  25: { folder: 'acoustic_guitar_steel', low: 40, high: 84, step: 3, attack: 0.004, release: 0.28 },
  27: { folder: 'electric_guitar_clean', low: 40, high: 86, step: 3, attack: 0.004, release: 0.22 },
  29: { folder: 'overdriven_guitar', low: 40, high: 86, step: 3, attack: 0.003, release: 0.18 },
  30: { folder: 'distortion_guitar', low: 40, high: 86, step: 3, attack: 0.002, release: 0.16 },
  33: { folder: 'electric_bass_finger', low: 28, high: 60, step: 3, attack: 0.004, release: 0.14 },
  34: { folder: 'electric_bass_pick', low: 28, high: 60, step: 3, attack: 0.002, release: 0.1 },
  38: { folder: 'synth_bass_1', low: 24, high: 60, step: 3, attack: 0.004, release: 0.12 },
  40: { folder: 'violin', low: 55, high: 96, step: 3, attack: 0.04, release: 0.45 },
  43: { folder: 'contrabass', low: 28, high: 60, step: 3, attack: 0.02, release: 0.25 },
  48: { folder: 'string_ensemble_1', low: 36, high: 84, step: 3, attack: 0.06, release: 0.7 },
  54: { folder: 'voice_oohs', low: 48, high: 79, step: 3, attack: 0.08, release: 0.6 },
  56: { folder: 'trumpet', low: 52, high: 82, step: 3, attack: 0.02, release: 0.18 },
  61: { folder: 'brass_section', low: 36, high: 79, step: 3, attack: 0.02, release: 0.25 },
  62: { folder: 'synth_brass_1', low: 36, high: 84, step: 3, attack: 0.01, release: 0.2 },
  66: { folder: 'tenor_sax', low: 46, high: 79, step: 3, attack: 0.02, release: 0.2 },
  73: { folder: 'flute', low: 60, high: 96, step: 3, attack: 0.03, release: 0.18 },
  80: { folder: 'lead_2_sawtooth', low: 48, high: 86, step: 3, attack: 0.008, release: 0.16 },
  81: { folder: 'lead_1_square', low: 48, high: 86, step: 3, attack: 0.006, release: 0.14 },
  82: { folder: 'lead_3_calliope', low: 48, high: 86, step: 3, attack: 0.01, release: 0.2 },
  88: { folder: 'pad_1_new_age', low: 36, high: 84, step: 4, attack: 0.18, release: 1.2 },
  89: { folder: 'pad_2_warm', low: 36, high: 84, step: 4, attack: 0.22, release: 1.4 },
}

export const DRUM_PITCHES = [36, 37, 38, 39, 41, 42, 45, 46, 48, 49, 51, 56]

export function midiToSampleName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

export function midiRange(low: number, high: number, step: number): number[] {
  const notes: number[] = []
  for (let n = low; n <= high; n += step) notes.push(n)
  if (notes[notes.length - 1] !== high) notes.push(high)
  return notes
}

export function sampleBaseUrl(folder: string): string {
  const packaged = window.location.protocol === 'file:'
  const root = packaged ? 'mms-sample://bundle' : './samples'
  return `${root}/${folder}/`
}

export function urlsForProgram(program: number): Record<string, string> {
  const spec = PROGRAM_SAMPLES[program] ?? PROGRAM_SAMPLES[0]!
  const urls: Record<string, string> = {}
  for (const midi of midiRange(spec.low, spec.high, spec.step)) {
    urls[midiToSampleName(midi)] = `${midiToSampleName(midi)}.mp3`
  }
  return urls
}

export function drumUrls(): Record<string, string> {
  const urls: Record<string, string> = {}
  for (const midi of DRUM_PITCHES) {
    urls[midiToSampleName(midi)] = `${midiToSampleName(midi)}.mp3`
  }
  return urls
}
