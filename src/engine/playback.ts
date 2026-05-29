import * as Tone from 'tone'
import type { Composition, Track, TransportState } from '../types'
import { beatsPerBar } from './musicTheory'

export class PlaybackEngine {
  private synths = new Map<string, Tone.PolySynth>()
  private drumKit: Tone.MembraneSynth | null = null
  private noiseSynth: Tone.NoiseSynth | null = null
  private metalSynth: Tone.MetalSynth | null = null
  private composition: Composition | null = null
  private _state: TransportState = 'stopped'
  private onStateChange?: (state: TransportState) => void
  private onPositionChange?: (bar: number) => void
  private positionInterval: ReturnType<typeof setInterval> | null = null

  constructor(callbacks?: {
    onStateChange?: (state: TransportState) => void
    onPositionChange?: (bar: number) => void
  }) {
    this.onStateChange = callbacks?.onStateChange
    this.onPositionChange = callbacks?.onPositionChange
  }

  get state(): TransportState {
    return this._state
  }

  private setState(state: TransportState): void {
    this._state = state
    this.onStateChange?.(state)
  }

  async init(): Promise<void> {
    await Tone.start()
  }

  private getOrCreateSynth(track: Track): Tone.PolySynth {
    let synth = this.synths.get(track.id)
    if (!synth) {
      if (track.role === 'drums') {
        if (!this.drumKit) {
          this.drumKit = new Tone.MembraneSynth({
            envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
          }).toDestination()
          this.noiseSynth = new Tone.NoiseSynth({
            envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
          }).toDestination()
          this.metalSynth = new Tone.MetalSynth({
            envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5,
          }).toDestination()
        }
        synth = new Tone.PolySynth(Tone.Synth).toDestination()
        synth.volume.value = -Infinity
      } else {
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: track.role === 'bass' ? 'triangle' : 'sine' },
          envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.8 },
        }).toDestination()
        synth.volume.value = Tone.gainToDb(track.volume)
      }
      this.synths.set(track.id, synth)
    }
    return synth
  }

  load(composition: Composition): void {
    this.stop()
    this.composition = composition
    Tone.getTransport().bpm.value = composition.bpm
  }

  private playDrumNote(pitch: number, time: number, velocity: number): void {
    const vel = velocity / 127
    if (pitch <= 40) {
      this.drumKit?.triggerAttackRelease('C1', '8n', time, vel)
    } else if (pitch <= 45) {
      this.noiseSynth?.triggerAttackRelease('16n', time, vel * 0.8)
    } else {
      this.metalSynth?.triggerAttackRelease('32n', time, vel * 0.5)
    }
  }

  private scheduleComposition(): void {
    if (!this.composition) return

    const comp = this.composition
    const secondsPerBeat = 60 / comp.bpm
    const bpb = beatsPerBar(comp.timeSignature)
    const totalDuration = comp.totalBars * bpb * secondsPerBeat

    for (const track of comp.tracks) {
      if (track.muted) continue
      const hasSolo = comp.tracks.some((t) => t.solo)
      if (hasSolo && !track.solo) continue

      for (const note of track.notes) {
        const startTime = note.time * secondsPerBeat
        const duration = note.duration * secondsPerBeat
        const vel = note.velocity / 127

        if (track.role === 'drums') {
          Tone.getTransport().schedule((t) => {
            this.playDrumNote(note.pitch, t, note.velocity)
          }, startTime)
        } else {
          const synth = this.getOrCreateSynth(track)
          const freq = Tone.Frequency(note.pitch, 'midi').toFrequency()
          Tone.getTransport().schedule((t) => {
            synth.triggerAttackRelease(freq, duration, t, vel)
          }, startTime)
        }
      }
    }

    Tone.getTransport().schedule(() => {
      if (this._state === 'playing') {
        this.stop()
      }
    }, totalDuration)
  }

  async play(): Promise<void> {
    await this.init()
    if (!this.composition) return

    if (this._state === 'paused') {
      Tone.getTransport().start()
      this.setState('playing')
      this.startPositionTracking()
      return
    }

    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0
    this.scheduleComposition()
    Tone.getTransport().start()
    this.setState('playing')
    this.startPositionTracking()
  }

  pause(): void {
    if (this._state !== 'playing') return
    Tone.getTransport().pause()
    this.setState('paused')
    this.stopPositionTracking()
  }

  stop(): void {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0
    this.setState('stopped')
    this.stopPositionTracking()
    this.onPositionChange?.(0)
  }

  private startPositionTracking(): void {
    this.stopPositionTracking()
    this.positionInterval = setInterval(() => {
      if (!this.composition || this._state !== 'playing') return
      const secondsPerBeat = 60 / this.composition.bpm
      const bpb = beatsPerBar(this.composition.timeSignature)
      const bar = Tone.getTransport().seconds / (secondsPerBeat * bpb)
      this.onPositionChange?.(bar)
    }, 100)
  }

  private stopPositionTracking(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval)
      this.positionInterval = null
    }
  }

  seekToBar(bar: number): void {
    if (!this.composition) return
    const secondsPerBeat = 60 / this.composition.bpm
    const bpb = beatsPerBar(this.composition.timeSignature)
    Tone.getTransport().seconds = bar * bpb * secondsPerBeat
    this.onPositionChange?.(bar)
  }

  dispose(): void {
    this.stop()
    for (const synth of this.synths.values()) synth.dispose()
    this.drumKit?.dispose()
    this.noiseSynth?.dispose()
    this.metalSynth?.dispose()
    this.synths.clear()
  }
}

let engineInstance: PlaybackEngine | null = null

export function getPlaybackEngine(callbacks?: {
  onStateChange?: (state: TransportState) => void
  onPositionChange?: (bar: number) => void
}): PlaybackEngine {
  if (!engineInstance) {
    engineInstance = new PlaybackEngine(callbacks)
  }
  return engineInstance
}
