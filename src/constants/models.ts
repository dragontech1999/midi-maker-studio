export const MODEL_IDS = ['trio', 'improv', 'melody', 'drums', 'drumRnn', 'multitrackChords'] as const
export type ModelId = (typeof MODEL_IDS)[number]

export const MODEL_LABELS: Record<ModelId, string> = {
  trio: 'Trio (melody+bass+drums)',
  improv: 'ImprovRNN melodies',
  melody: 'Melody VAE',
  drums: 'Drums VAE',
  drumRnn: 'Drums RNN',
  multitrackChords: 'Multitrack chords',
}
