import type { MidiNote } from '../types'
import { SeededRandom } from './random'

const GM_DRUM_MAP: Record<string, number> = {
  kick: 36,
  snare: 38,
  clap: 39,
  rim: 37,
  closedHat: 42,
  openHat: 46,
  crash: 49,
  ride: 51,
  tomLow: 41,
  tomMid: 45,
  tomHigh: 48,
  perc: 56,
}

interface DrumHit {
  step: number
  drum: keyof typeof GM_DRUM_MAP
  velocity: number
}

export function generateDrums(
  style: string,
  bars: number,
  beatsPerBar: number,
  energy: number,
  density: number,
  rng: SeededRandom,
  swing = 0,
): MidiNote[] {
  const stepsPerBar = beatsPerBar * 4
  const totalSteps = bars * stepsPerBar
  const hits: DrumHit[] = []
  const baseVel = Math.round(50 + energy * 50)

  const addHit = (step: number, drum: keyof typeof GM_DRUM_MAP, velMod = 0) => {
    if (step >= totalSteps) return
    hits.push({ step, drum, velocity: Math.min(127, Math.max(20, baseVel + velMod + rng.int(-8, 8))) })
  }

  for (let bar = 0; bar < bars; bar++) {
    const barOffset = bar * stepsPerBar

    switch (style) {
      case 'four-on-floor':
      case 'four-on-floor-lite':
        for (let beat = 0; beat < beatsPerBar; beat++) {
          addHit(barOffset + beat * 4, 'kick', beat === 0 ? 10 : 0)
          if (style === 'four-on-floor-lite' && beat % 2 === 1) continue
        }
        addHit(barOffset + 4, 'snare', 5)
        addHit(barOffset + 12, 'snare', 5)
        for (let s = 0; s < stepsPerBar; s += 2) {
          if (density > 0.3) addHit(barOffset + s, s % 4 === 2 ? 'openHat' : 'closedHat', -10)
        }
        break

      case 'rock-backbeat':
        addHit(barOffset, 'kick', 8)
        addHit(barOffset + 8, 'kick', 5)
        addHit(barOffset + 4, 'snare', 10)
        addHit(barOffset + 12, 'snare', 10)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'closedHat', -15)
        }
        if (energy > 0.7 && rng.bool(0.6)) {
          addHit(barOffset + 14, 'crash', 15)
        }
        break

      case 'boom-bap':
        addHit(barOffset, 'kick', 10)
        addHit(barOffset + 8, 'kick', 5)
        addHit(barOffset + 4, 'snare', 12)
        addHit(barOffset + 12, 'snare', 8)
        for (let s = 1; s < stepsPerBar; s += 4) {
          if (rng.bool(density * 0.8)) addHit(barOffset + s, 'closedHat', -12)
        }
        if (rng.bool(0.3)) addHit(barOffset + 6, 'rim', -5)
        break

      case 'techno-driving':
        for (let beat = 0; beat < beatsPerBar; beat++) {
          addHit(barOffset + beat * 4, 'kick', 8)
        }
        addHit(barOffset + 4, 'clap', 5)
        addHit(barOffset + 12, 'clap', 5)
        for (let s = 0; s < stepsPerBar; s++) {
          if (s % 2 === 0) addHit(barOffset + s, 'closedHat', -8)
        }
        if (energy > 0.6) {
          addHit(barOffset + 2, 'rim', -10)
          addHit(barOffset + 10, 'rim', -10)
        }
        break

      case 'industrial-metallic':
        addHit(barOffset, 'kick', 15)
        addHit(barOffset + 4, 'kick', 8)
        addHit(barOffset + 8, 'kick', 10)
        addHit(barOffset + 6, 'snare', 12)
        addHit(barOffset + 14, 'snare', 12)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, rng.bool(0.5) ? 'closedHat' : 'rim', -5)
        }
        if (rng.bool(0.4)) addHit(barOffset + 3, 'perc', 0)
        break

      case 'double-kick':
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'kick', s % 4 === 0 ? 10 : 5)
        }
        addHit(barOffset + 4, 'snare', 15)
        addHit(barOffset + 12, 'snare', 15)
        for (let s = 0; s < stepsPerBar; s++) {
          addHit(barOffset + s, 'closedHat', -10)
        }
        break

      case 'swing-ride':
        addHit(barOffset, 'kick', 5)
        addHit(barOffset + 8, 'kick', 3)
        addHit(barOffset + 4, 'snare', 8)
        addHit(barOffset + 12, 'snare', 8)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'ride', -12)
        }
        break

      case 'rnb-groove':
        addHit(barOffset, 'kick', 8)
        addHit(barOffset + 6, 'kick', 5)
        addHit(barOffset + 10, 'kick', 3)
        addHit(barOffset + 4, 'snare', 10)
        addHit(barOffset + 12, 'snare', 8)
        for (let s = 0; s < stepsPerBar; s += 2) {
          if (rng.bool(0.7)) addHit(barOffset + s, 'closedHat', -12)
        }
        break

      case 'half-time-heavy':
        addHit(barOffset, 'kick', 15)
        addHit(barOffset + 8, 'snare', 20)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'closedHat', -8)
        }
        if (energy > 0.7) addHit(barOffset + 4, 'kick', 8)
        break

      case 'breakbeat-dnb':
        addHit(barOffset, 'kick', 10)
        addHit(barOffset + 10, 'kick', 8)
        addHit(barOffset + 4, 'snare', 12)
        addHit(barOffset + 12, 'snare', 10)
        addHit(barOffset + 7, 'snare', 5)
        for (let s = 0; s < stepsPerBar; s++) {
          if (s % 2 === 0) addHit(barOffset + s, 'closedHat', -10)
        }
        break

      case 'one-drop':
        addHit(barOffset + 4, 'kick', 12)
        addHit(barOffset + 12, 'snare', 10)
        for (let s = 0; s < stepsPerBar; s += 4) {
          addHit(barOffset + s + 2, 'closedHat', -10)
        }
        break

      case 'funk-groove':
        addHit(barOffset, 'kick', 8)
        addHit(barOffset + 6, 'kick', 5)
        addHit(barOffset + 10, 'kick', 6)
        addHit(barOffset + 4, 'snare', 12)
        addHit(barOffset + 12, 'snare', 10)
        for (let s = 0; s < stepsPerBar; s++) {
          if (rng.bool(0.6)) addHit(barOffset + s, 'closedHat', -10)
        }
        break

      case 'country-shuffle':
        addHit(barOffset, 'kick', 8)
        addHit(barOffset + 8, 'kick', 5)
        addHit(barOffset + 4, 'snare', 10)
        addHit(barOffset + 12, 'snare', 8)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'closedHat', -12)
        }
        break

      case 'latin-clave':
        addHit(barOffset + 0, 'kick', 8)
        addHit(barOffset + 6, 'kick', 5)
        addHit(barOffset + 4, 'rim', 8)
        addHit(barOffset + 10, 'rim', 6)
        addHit(barOffset + 12, 'snare', 10)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'closedHat', -10)
        }
        break

      case 'orchestral-perc':
        if (energy > 0.5) {
          addHit(barOffset, 'kick', -10)
          addHit(barOffset + 8, 'kick', -15)
        }
        if (energy > 0.7) {
          addHit(barOffset + 4, 'crash', 5)
          addHit(barOffset + 12, 'crash', 0)
        }
        break

      case 'minimal-perc':
        if (rng.bool(density * 0.4)) addHit(barOffset + rng.int(0, stepsPerBar - 1), 'perc', -15)
        break

      default:
        addHit(barOffset, 'kick', 8)
        addHit(barOffset + 8, 'kick', 5)
        addHit(barOffset + 4, 'snare', 10)
        addHit(barOffset + 12, 'snare', 8)
        for (let s = 0; s < stepsPerBar; s += 2) {
          addHit(barOffset + s, 'closedHat', -12)
        }
    }
  }

  const beatDuration = 1 / beatsPerBar
  const stepDuration = beatDuration / 4

  return hits.map((h) => {
    const swingOffset = swing > 0 && h.step % 2 === 1 ? stepDuration * swing * 0.5 : 0
    return {
      pitch: GM_DRUM_MAP[h.drum]!,
      time: h.step * stepDuration + swingOffset,
      duration: stepDuration * 0.8,
      velocity: h.velocity,
    }
  })
}
