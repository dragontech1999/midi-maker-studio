import type { GenerateOptions, GenreId, ScaleMode } from '../types'
import { generateComposition } from './composer'
import { getGenreById } from './genres'

export type ProgressCallback = (message: string, progress: number) => void

export async function generateCompositionAsync(
  options: GenerateOptions,
  onProgress?: ProgressCallback,
): Promise<ReturnType<typeof generateComposition>> {
  const genre = getGenreById(options.genre)
  const groove = genre.drumStyle.replace(/-/g, ' ')
  const bass = genre.bassStyle.replace(/-/g, ' ')
  onProgress?.(`Writing ${genre.name}: ${groove} drums and ${bass} bass…`, 0.25)
  const song = generateComposition({ ...options, seed: options.seed ?? Date.now() })
  onProgress?.(`${genre.name} arrangement ready`, 1)
  return song
}

export function getDefaultBpm(genreId: GenreId): number {
  const genre = getGenreById(genreId)
  return Math.round((genre.defaultBpm[0]! + genre.defaultBpm[1]!) / 2)
}

export function getDefaultScale(genreId: GenreId): ScaleMode {
  return getGenreById(genreId).defaultScale as ScaleMode
}

export { generateComposition } from './composer'
