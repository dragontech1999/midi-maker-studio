import * as mm from '@magenta/music'
import type { INoteSequence } from '@magenta/music/esm/protobuf/index'
import { MODEL_IDS, type ModelId } from '../constants/models'
import type { ModelMode } from '../types'
import {
  checkMagentaConnection,
  resolveCheckpointUrls,
} from './modelService'

export type ProgressCallback = (message: string, progress: number) => void

export interface MagentaInitOptions {
  modelMode: ModelMode
  onProgress?: ProgressCallback
}

class MagentaEngine {
  private models = new Map<ModelId, mm.MusicVAE | mm.MusicRNN>()
  private initPromises = new Map<ModelId, Promise<void>>()
  private initialized = false
  private checkpointUrls: Record<ModelId, string> | null = null
  private tfReady = false

  private async ensureTfReady(): Promise<void> {
    if (this.tfReady) return
    await mm.tf.setBackend('webgl')
    await mm.tf.ready()
    this.tfReady = true
  }

  async ensureReady(options: MagentaInitOptions): Promise<{ usedOffline: boolean; connectionOnline: boolean }> {
    if (this.initialized) {
      return { usedOffline: false, connectionOnline: true }
    }

    const { modelMode, onProgress } = options
    onProgress?.('Checking Magenta AI connection…', 0.02)

    const connection = await checkMagentaConnection()
    if (!connection.online && modelMode === 'online') {
      throw new Error(`${connection.message}. Switch to Auto or Offline mode, or download models for offline use.`)
    }

    onProgress?.(
      connection.online
        ? `Connected (${connection.latencyMs}ms) — resolving models…`
        : 'Offline — using cached models…',
      0.05,
    )

    this.checkpointUrls = await resolveCheckpointUrls(modelMode, connection.online)

    await this.ensureTfReady()
    onProgress?.('TensorFlow.js ready', 0.08)

    const coreModels: ModelId[] = ['trio', 'improv', 'melody', 'drums', 'drumRnn', 'multitrackChords']
    let done = 0
    const total = coreModels.length

    for (const id of coreModels) {
      onProgress?.(`Loading model: ${id}…`, 0.08 + (done / total) * 0.22)
      try {
        await this.loadModel(id)
        done++
        onProgress?.(`Loaded ${id}`, 0.08 + (done / total) * 0.22)
      } catch (err) {
        throw new Error(`Failed to load model "${id}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    this.initialized = true
    onProgress?.('AI models ready', 0.32)

    const usedOffline = !connection.online || modelMode === 'offline'
    return { usedOffline, connectionOnline: connection.online }
  }

  private async loadModel(id: ModelId): Promise<void> {
    if (this.initPromises.has(id)) {
      await this.initPromises.get(id)
      return
    }

    const promise = (async () => {
      const url = this.checkpointUrls?.[id]
      if (!url) throw new Error(`No checkpoint URL for ${id}`)

      let model: mm.MusicVAE | mm.MusicRNN
      if (id === 'improv' || id === 'drumRnn') {
        model = new mm.MusicRNN(url)
      } else {
        model = new mm.MusicVAE(url)
      }

      await model.initialize()
      this.models.set(id, model)
    })()

    this.initPromises.set(id, promise)
    await promise
  }

  reset(): void {
    for (const model of this.models.values()) model.dispose()
    this.models.clear()
    this.initPromises.clear()
    this.initialized = false
    this.checkpointUrls = null
  }

  getVAE(id: Exclude<ModelId, 'improv' | 'drumRnn'>): mm.MusicVAE {
    const model = this.models.get(id)
    if (!model || !(model instanceof mm.MusicVAE)) {
      throw new Error(`MusicVAE model ${id} not loaded`)
    }
    return model
  }

  getRNN(id: 'improv' | 'drumRnn'): mm.MusicRNN {
    const model = this.models.get(id)
    if (!model || !(model instanceof mm.MusicRNN)) {
      throw new Error(`MusicRNN model ${id} not loaded`)
    }
    return model
  }

  async sampleTrio(temperature: number, bpm: number, chordProgression?: string[]): Promise<INoteSequence> {
    const vae = this.getVAE('trio')
    const controlArgs = chordProgression?.length ? { chordProgression } : undefined
    const samples = await vae.sample(1, temperature, controlArgs, 4, bpm)
    if (!samples[0]?.notes?.length) throw new Error('Trio model returned empty sequence')
    return samples[0]
  }

  async sampleMelody(temperature: number, bpm: number, chordProgression?: string[]): Promise<INoteSequence> {
    const vae = this.getVAE('melody')
    const controlArgs = chordProgression?.length ? { chordProgression } : undefined
    const samples = await vae.sample(1, temperature, controlArgs, 4, bpm)
    return samples[0]!
  }

  async sampleDrums(temperature: number, bpm: number): Promise<INoteSequence> {
    const vae = this.getVAE('drums')
    const samples = await vae.sample(1, temperature, undefined, 4, bpm)
    return samples[0]!
  }

  async continueImprovMelody(
    seed: INoteSequence,
    steps: number,
    temperature: number,
    chordProgression: string[],
  ): Promise<INoteSequence> {
    const rnn = this.getRNN('improv')
    return rnn.continueSequence(seed, steps, temperature, chordProgression)
  }

  dispose(): void {
    this.reset()
    this.tfReady = false
  }
}

let instance: MagentaEngine | null = null

export function getMagentaEngine(): MagentaEngine {
  if (!instance) instance = new MagentaEngine()
  return instance
}

export function createSeedSequence(pitch: number, bpm: number): INoteSequence {
  return {
    totalTime: 0.5,
    tempos: [{ time: 0, qpm: bpm }],
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    notes: [{
      pitch,
      startTime: 0,
      endTime: 0.5,
      velocity: 80,
      instrument: 0,
    }],
  } as INoteSequence
}

export type { INoteSequence, ModelId }
export { MODEL_IDS }
