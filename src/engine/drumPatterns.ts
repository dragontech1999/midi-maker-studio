import type { MidiNote } from '../types'
import { SeededRandom } from './random'

const GM_DRUM_MAP = {
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
} as const

type Drum = keyof typeof GM_DRUM_MAP

interface DrumHit {
  beat: number
  drum: Drum
  velocity: number
}

function swingBeat(beat: number, swing: number): number {
  if (swing <= 0) return beat
  const frac = beat - Math.floor(beat)
  if (Math.abs(frac - 0.5) < 0.02) return beat + (swing / 0.33) * (1 / 6)
  return beat
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
  const hits: DrumHit[] = []
  const baseVel = Math.round(58 + energy * 48)

  const add = (beat: number, drum: Drum, velMod = 0) => {
    hits.push({
      beat: swingBeat(beat, swing),
      drum,
      velocity: Math.min(127, Math.max(24, baseVel + velMod + rng.int(-6, 6))),
    })
  }

  for (let bar = 0; bar < bars; bar++) {
    const b = bar * beatsPerBar

    switch (style) {
      case 'four-on-floor':
        for (let beat = 0; beat < beatsPerBar; beat++) add(b + beat, 'kick', beat === 0 ? 8 : 0)
        add(b + 1, 'clap', 6)
        add(b + 3, 'clap', 4)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, i % 2 === 1 ? 'openHat' : 'closedHat', i % 2 === 1 ? -6 : -14)
        if (energy > 0.85 && bar % 8 === 0) add(b, 'crash', 10)
        break

      case 'four-on-floor-lite':
        add(b, 'kick', 8)
        add(b + 2, 'kick', 2)
        add(b + 1, 'snare', 8)
        add(b + 3, 'snare', 6)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -16)
        if (energy > 0.7 && rng.bool(0.4)) add(b + 3.5, 'openHat', -4)
        break

      case 'rock-backbeat':
        add(b, 'kick', 10)
        add(b + 2, 'kick', 4)
        if (energy > 0.75) add(b + 2.5, 'kick', -2)
        add(b + 1, 'snare', 14)
        add(b + 3, 'snare', 12)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -12)
        if (energy > 0.65 && (bar % 4 === 0 || rng.bool(0.35))) add(b, 'crash', 8)
        break

      case 'boom-bap':
        add(b, 'kick', 12)
        if (rng.bool(0.55)) add(b + 2.5, 'kick', 2)
        else add(b + 1.75, 'kick', -4)
        add(b + 1, 'snare', 14)
        add(b + 3, 'snare', 10)
        if (rng.bool(0.4)) add(b + 2.75, 'snare', -18)
        for (let i = 0; i < beatsPerBar * 2; i++) {
          if (density > 0.45 || i % 2 === 0) add(b + i * 0.5, 'closedHat', -14)
        }
        break

      case 'techno-driving':
        for (let beat = 0; beat < beatsPerBar; beat++) add(b + beat, 'kick', 6)
        add(b + 1, 'clap', 2)
        add(b + 3, 'clap', 2)
        for (let i = 0; i < beatsPerBar * 4; i++) {
          if (i % 2 === 0) add(b + i * 0.25, 'closedHat', -12)
        }
        if (energy > 0.55) {
          add(b + 0.5, 'rim', -8)
          add(b + 2.5, 'rim', -8)
        }
        break

      case 'industrial-metallic':
        add(b, 'kick', 16)
        add(b + 0.75, 'kick', 4)
        add(b + 2, 'kick', 8)
        add(b + 1.5, 'snare', 12)
        add(b + 3.5, 'snare', 10)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, rng.bool(0.45) ? 'rim' : 'closedHat', -6)
        if (rng.bool(0.5)) add(b + 2.75, 'perc', 0)
        if (bar % 4 === 0) add(b, 'crash', 4)
        break

      case 'double-kick': {
        const sixteenths = energy > 0.7
        const step = sixteenths ? 0.25 : 0.5
        for (let t = 0; t < beatsPerBar; t += step) {
          add(b + t, 'kick', t % 1 === 0 ? 8 : -6)
        }
        add(b + 1, 'snare', 16)
        add(b + 3, 'snare', 16)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -10)
        if (bar % 4 === 0) add(b, 'crash', 12)
        break
      }

      case 'swing-ride':
        add(b, 'kick', -6)
        add(b + 2, 'kick', -10)
        add(b + 1, 'rim', 2)
        add(b + 3, 'rim', 0)
        for (let beat = 0; beat < beatsPerBar; beat++) {
          add(b + beat, 'ride', -4)
          add(b + beat + 2 / 3, 'ride', -12)
        }
        if (rng.bool(0.25)) add(b + rng.pick([1.5, 2.5, 3.25]), 'snare', -16)
        break

      case 'rnb-groove':
        add(b, 'kick', 6)
        add(b + 1.5, 'kick', 0)
        add(b + 2.75, 'kick', -4)
        add(b + 1, 'snare', 8)
        add(b + 3, 'snare', 6)
        if (rng.bool(0.5)) add(b + 2.5, 'snare', -16)
        for (let i = 0; i < beatsPerBar * 2; i++) {
          if (rng.bool(0.75)) add(b + i * 0.5, 'closedHat', -14)
        }
        break

      case 'half-time-heavy':
        add(b, 'kick', 16)
        add(b + 2, 'snare', 20)
        if (energy > 0.65) add(b + 3.5, 'kick', 4)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -8)
        if (bar % 8 === 0 && energy > 0.5) add(b, 'crash', 6)
        break

      case 'breakbeat-dnb':
        add(b, 'kick', 12)
        add(b + 1.5, 'kick', 6)
        add(b + 2.5, 'kick', 4)
        add(b + 1, 'snare', 14)
        add(b + 2.75, 'snare', -8)
        add(b + 3, 'snare', 10)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -12)
        if (energy > 0.8 && bar % 8 === 0) add(b, 'crash', 4)
        break

      case 'one-drop':
        add(b + 2, 'kick', 14)
        add(b + 2, 'snare', 8)
        for (let i = 0; i < beatsPerBar; i++) add(b + i + 0.5, 'closedHat', -8)
        if (rng.bool(0.3)) add(b + 3.5, 'rim', -6)
        break

      case 'funk-groove':
        add(b, 'kick', 10)
        add(b + 1.5, 'kick', 4)
        add(b + 2.5, 'kick', 6)
        add(b + 1, 'snare', 14)
        add(b + 3, 'snare', 10)
        add(b + 0.75, 'snare', -18)
        add(b + 2.75, 'snare', -16)
        for (let i = 0; i < beatsPerBar * 4; i++) {
          if (rng.bool(0.7)) add(b + i * 0.25, 'closedHat', i % 4 === 0 ? -6 : -16)
        }
        break

      case 'country-shuffle':
        add(b, 'kick', 8)
        add(b + 2, 'kick', 2)
        add(b + 1, 'snare', 10)
        add(b + 3, 'snare', 8)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -12)
        break

      case 'latin-clave': {
        const threeSide = bar % 2 === 0
        const clave = threeSide ? [0, 1.5, 3] : [1, 2]
        for (const hit of clave) add(b + hit, 'rim', 8)
        add(b, 'kick', 6)
        add(b + 2, 'kick', 2)
        add(b + 1, 'snare', -4)
        add(b + 3, 'snare', -6)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -12)
        break
      }

      case 'orchestral-perc':
        if (energy > 0.35) add(b, 'kick', energy > 0.75 ? 10 : -4)
        if (energy > 0.6) add(b + 2, 'kick', -2)
        if (energy > 0.8) {
          add(b, 'crash', 8)
          if (bar % 2 === 1) add(b + 2, 'perc', 0)
        } else if (energy > 0.5 && bar % 2 === 0) {
          add(b + 3, 'perc', -8)
        }
        break

      case 'minimal-perc':
        if (rng.bool(Math.max(0.15, density * 0.45))) add(b + rng.pick([0, 2, 3.5]), 'perc', -12)
        break

      default:
        add(b, 'kick', 8)
        add(b + 2, 'kick', 4)
        add(b + 1, 'snare', 10)
        add(b + 3, 'snare', 8)
        for (let i = 0; i < beatsPerBar * 2; i++) add(b + i * 0.5, 'closedHat', -14)
    }
  }

  return hits.map((h) => ({
    pitch: GM_DRUM_MAP[h.drum],
    time: h.beat,
    duration: h.drum === 'crash' || h.drum === 'ride' ? 0.8 : 0.2,
    velocity: h.velocity,
  }))
}
