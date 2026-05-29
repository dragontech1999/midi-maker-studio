import { Midi } from '@tonejs/midi'
import JSZip from 'jszip'
import type { Composition, Track } from '../types'

export function compositionToMidi(composition: Composition): Midi {
  const midi = new Midi()
  midi.header.setTempo(composition.bpm)
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: composition.timeSignature })
  midi.name = composition.title

  for (const track of composition.tracks) {
    if (track.notes.length === 0) continue
    const midiTrack = midi.addTrack()
    midiTrack.name = track.name
    midiTrack.channel = track.channel
    midiTrack.instrument.number = track.instrument

    const secondsPerBeat = 60 / composition.bpm

    for (const note of track.notes) {
      midiTrack.addNote({
        midi: note.pitch,
        time: note.time * secondsPerBeat,
        duration: note.duration * secondsPerBeat,
        velocity: note.velocity / 127,
      })
    }
  }

  return midi
}

export function exportFullSong(composition: Composition): Uint8Array {
  const midi = compositionToMidi(composition)
  return new Uint8Array(midi.toArray())
}

export function exportTrackStem(track: Track, composition: Composition): Uint8Array {
  const midi = new Midi()
  midi.header.setTempo(composition.bpm)
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: composition.timeSignature })
  midi.name = `${composition.title} - ${track.name}`

  const midiTrack = midi.addTrack()
  midiTrack.name = track.name
  midiTrack.channel = track.channel
  midiTrack.instrument.number = track.instrument

  const secondsPerBeat = 60 / composition.bpm

  for (const note of track.notes) {
    midiTrack.addNote({
      midi: note.pitch,
      time: note.time * secondsPerBeat,
      duration: note.duration * secondsPerBeat,
      velocity: note.velocity / 127,
    })
  }

  return new Uint8Array(midi.toArray())
}

export async function exportStemsZip(composition: Composition): Promise<Uint8Array> {
  const zip = new JSZip()
  const safeName = composition.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_')

  zip.file(`${safeName}_full.mid`, exportFullSong(composition))

  composition.tracks.forEach((track, index) => {
    if (track.notes.length === 0) return
    const stemName = `${String(index + 1).padStart(2, '0')}_${track.name.replace(/\s+/g, '_')}.mid`
    zip.file(stemName, exportTrackStem(track, composition))
  })

  const blob = await zip.generateAsync({ type: 'uint8array' })
  return blob
}

export function downloadBlob(data: Uint8Array, filename: string): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
