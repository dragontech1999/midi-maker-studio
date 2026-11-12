import * as Tone from 'tone'
import type { Composition, TransportState } from '../types'
import { beatsPerBar } from './musicTheory'
import {
  drumUrls,
  PROGRAM_SAMPLES,
  sampleBaseUrl,
  urlsForProgram,
} from './sampleLibrary'

const ROLE_GAIN: Record<string, number> = {
  drums: 1.15,
  bass: 1.05,
  chords: 0.82,
  melody: 0.9,
  arpeggio: 0.62,
  pad: 0.5,
  strings: 0.68,
  brass: 0.72,
  lead: 0.74,
}

export class PlaybackEngine {
  private pitched = new Map<number, Promise<Tone.Sampler>>()
  private drums: Promise<Tone.Sampler> | null = null
  private composition: Composition | null = null
  private _state: TransportState = 'stopped'
  private onStateChange?: (state: TransportState) => void
  private onPositionChange?: (bar: number) => void
  private positionInterval: ReturnType<typeof setInterval> | null = null
  private audioReady: Promise<void> | null = null
  private limiter: Tone.Limiter | null = null
  private reverb: Tone.Reverb | null = null
  private musicBus: Tone.Gain | null = null
  private drumBus: Tone.Gain | null = null

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

  private async init(): Promise<void> {
    if (!this.audioReady) {
      this.audioReady = (async () => {
        await Tone.start()
        this.limiter = new Tone.Limiter(-1.5).toDestination()
        this.reverb = new Tone.Reverb({ decay: 1.5, wet: 0.14, preDelay: 0.01 })
        await this.reverb.generate()
        this.reverb.connect(this.limiter)
        this.musicBus = new Tone.Gain(0.9).connect(this.reverb)
        this.drumBus = new Tone.Gain(1).connect(this.limiter)
      })()
    }
    await this.audioReady
  }

  private loadSampler(
    folder: string,
    urls: Record<string, string>,
    attack: number,
    release: number,
    destination: Tone.ToneAudioNode,
  ): Promise<Tone.Sampler> {
    return new Promise((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls,
        baseUrl: sampleBaseUrl(folder),
        attack,
        release,
        curve: 'exponential',
        onload: () => resolve(sampler),
        onerror: (error) => reject(error),
      })
      sampler.connect(destination)
    })
  }

  private pitchedSampler(program: number): Promise<Tone.Sampler> {
    const existing = this.pitched.get(program)
    if (existing) return existing
    const known = PROGRAM_SAMPLES[program] ? program : 0
    const spec = PROGRAM_SAMPLES[known]!
    const created = this.loadSampler(
      spec.folder,
      urlsForProgram(known),
      spec.attack,
      spec.release,
      this.musicBus!,
    ).catch((error) => {
      this.pitched.delete(program)
      throw error
    })
    this.pitched.set(program, created)
    return created
  }

  private drumSampler(): Promise<Tone.Sampler> {
    if (!this.drums) {
      this.drums = this.loadSampler('synth_drum', drumUrls(), 0.001, 0.55, this.drumBus!)
    }
    return this.drums
  }

  private async prepare(composition: Composition): Promise<void> {
    await this.init()
    const programs = new Set<number>()
    let needsDrums = false
    for (const track of composition.tracks) {
      if (track.notes.length === 0) continue
      if (track.role === 'drums') needsDrums = true
      else programs.add(track.instrument)
    }
    await Promise.all([
      ...[...programs].map((program) => this.pitchedSampler(program)),
      needsDrums ? this.drumSampler() : Promise.resolve(),
    ])
  }

  load(composition: Composition): void {
    this.stop()
    this.composition = composition
    Tone.getTransport().bpm.value = composition.bpm
  }

  private scheduleComposition(drums: Tone.Sampler, byProgram: Map<number, Tone.Sampler>): void {
    if (!this.composition) return

    const comp = this.composition
    const secondsPerBeat = 60 / comp.bpm
    const bpb = beatsPerBar(comp.timeSignature)
    const totalDuration = comp.totalBars * bpb * secondsPerBeat
    const soloed = comp.tracks.some((t) => t.solo)

    for (const track of comp.tracks) {
      if (track.muted || (soloed && !track.solo)) continue
      const gain = (ROLE_GAIN[track.role] ?? 0.8) * track.volume
      const sampler = track.role === 'drums' ? drums : byProgram.get(track.instrument)
      if (!sampler) continue

      for (const note of track.notes) {
        const startTime = note.time * secondsPerBeat
        const duration = Math.max(0.05, note.duration * secondsPerBeat)
        const vel = Math.max(0.05, Math.min(1, (note.velocity / 127) * gain))
        const name = Tone.Frequency(note.pitch, 'midi').toNote()
        Tone.getTransport().schedule((t) => {
          sampler.triggerAttackRelease(name, duration, t, vel)
        }, startTime)
      }
    }

    Tone.getTransport().schedule(() => {
      if (this._state === 'playing') this.stop()
    }, totalDuration)
  }

  async play(): Promise<void> {
    if (!this.composition) return
    await this.prepare(this.composition)

    if (this._state === 'paused') {
      Tone.getTransport().start()
      this.setState('playing')
      this.startPositionTracking()
      return
    }

    const programs = new Set(this.composition.tracks.filter((t) => t.role !== 'drums').map((t) => t.instrument))
    const byProgram = new Map<number, Tone.Sampler>()
    await Promise.all([...programs].map(async (program) => {
      byProgram.set(program, await this.pitchedSampler(program))
    }))
    const drums = await this.drumSampler()

    Tone.getTransport().cancel()
    Tone.getTransport().seconds = 0
    this.scheduleComposition(drums, byProgram)
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
    for (const pending of this.pitched.values()) {
      void pending.then((sampler) => sampler.dispose())
    }
    if (this.drums) void this.drums.then((sampler) => sampler.dispose())
    this.pitched.clear()
    this.drums = null
    this.reverb?.dispose()
    this.limiter?.dispose()
    this.musicBus?.dispose()
    this.drumBus?.dispose()
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
