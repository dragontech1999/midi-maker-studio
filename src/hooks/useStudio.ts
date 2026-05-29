import { useCallback, useEffect, useRef, useState } from 'react'
import type { Composition, GenerateOptions, TransportState } from '../types'
import { generateCompositionAsync, type ProgressCallback } from '../engine/proComposer'
import { getPlaybackEngine } from '../engine/playback'

export function useStudio() {
  const [composition, setComposition] = useState<Composition | null>(null)
  const [transport, setTransport] = useState<TransportState>('stopped')
  const [currentBar, setCurrentBar] = useState(0)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(48)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const engineRef = useRef(getPlaybackEngine({
    onStateChange: setTransport,
    onPositionChange: setCurrentBar,
  }))

  useEffect(() => {
    return () => engineRef.current.dispose()
  }, [])

  const generate = useCallback(async (options: GenerateOptions) => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStatus('Starting…')

    const onProgress: ProgressCallback = (message, progress) => {
      setGenerationStatus(message)
      setGenerationProgress(progress)
    }

    try {
      const comp = await generateCompositionAsync(options, onProgress)
      setComposition(comp)
      setSelectedTrackId(comp.tracks.find((t) => t.notes.length > 0)?.id ?? null)
      engineRef.current.load(comp)
      setCurrentBar(0)
      setGenerationStatus('Done!')
      setGenerationProgress(1)
    } catch (err) {
      console.error('Generation failed:', err)
      setGenerationStatus(`Error: ${err instanceof Error ? err.message : 'Generation failed'}`)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const play = useCallback(async () => {
    if (!composition) return
    engineRef.current.load(composition)
    await engineRef.current.play()
  }, [composition])

  const pause = useCallback(() => {
    engineRef.current.pause()
  }, [])

  const stop = useCallback(() => {
    engineRef.current.stop()
    setCurrentBar(0)
  }, [])

  const toggleTrackMute = useCallback((trackId: string) => {
    setComposition((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, muted: !t.muted } : t,
        ),
      }
    })
  }, [])

  const toggleTrackSolo = useCallback((trackId: string) => {
    setComposition((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, solo: !t.solo } : t,
        ),
      }
    })
  }, [])

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    setComposition((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId ? { ...t, volume } : t,
        ),
      }
    })
  }, [])

  return {
    composition,
    transport,
    currentBar,
    selectedTrackId,
    setSelectedTrackId,
    zoom,
    setZoom,
    isGenerating,
    generationStatus,
    generationProgress,
    generate,
    play,
    pause,
    stop,
    toggleTrackMute,
    toggleTrackSolo,
    setTrackVolume,
  }
}
