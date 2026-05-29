export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export type ScaleMode =
  | 'major'
  | 'minor'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'dorian'
  | 'mixolydian'
  | 'phrygian'
  | 'lydian'
  | 'locrian'
  | 'pentatonic-major'
  | 'pentatonic-minor'
  | 'blues'

export type SectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'breakdown'
  | 'build-up'
  | 'drop'
  | 'outro'

export type GenreId =
  | 'pop'
  | 'rock'
  | 'hip-hop'
  | 'r-and-b'
  | 'country'
  | 'jazz'
  | 'classical'
  | 'house'
  | 'techno'
  | 'trance'
  | 'dubstep'
  | 'drum-and-bass'
  | 'ambient'
  | 'metal'
  | 'industrial'
  | 'reggae'
  | 'latin'
  | 'funk'
  | 'soul'
  | 'cinematic'

export type TrackRole =
  | 'drums'
  | 'bass'
  | 'chords'
  | 'melody'
  | 'counter-melody'
  | 'arpeggio'
  | 'pad'
  | 'strings'
  | 'brass'
  | 'lead'
  | 'fx'

export interface MidiNote {
  pitch: number
  time: number
  duration: number
  velocity: number
}

export interface Track {
  id: string
  name: string
  role: TrackRole
  instrument: number
  channel: number
  muted: boolean
  solo: boolean
  volume: number
  notes: MidiNote[]
  color: string
}

export interface SongSection {
  type: SectionType
  name: string
  bars: number
  startBar: number
  energy: number
  density: number
}

export interface Composition {
  title: string
  genre: GenreId
  key: NoteName
  scale: ScaleMode
  bpm: number
  timeSignature: [number, number]
  sections: SongSection[]
  tracks: Track[]
  totalBars: number
  seed: number
}

export interface GenerateOptions {
  genre: GenreId
  key: NoteName
  scale: ScaleMode
  bpm: number
  timeSignature: [number, number]
  complexity: number
  energy: number
  length: 'short' | 'medium' | 'long'
  seed?: number
  modelMode?: ModelMode
}

export type ModelMode = 'auto' | 'online' | 'offline'

export interface ConnectionStatus {
  online: boolean
  latencyMs: number | null
  message: string
}

export interface ModelCacheInfo {
  id: string
  cached: boolean
  fileCount: number
  sizeMb: number
}

export interface DownloadProgress {
  modelId: string
  modelIndex: number
  modelTotal: number
  fileName: string
  fileIndex: number
  fileTotal: number
  bytesDownloaded: number
  overallProgress: number
  message: string
}

export type TransportState = 'stopped' | 'playing' | 'paused'

export interface StudioState {
  composition: Composition | null
  transport: TransportState
  currentBar: number
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
  selectedTrackId: string | null
  zoom: number
}
