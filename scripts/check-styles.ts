import { generateComposition } from '../src/engine/composer'
import { GENRES } from '../src/engine/genres'
import type { GenreId } from '../src/types'

function beatsInBar(times: number[], bar: number): number[] {
  return times.filter((t) => t >= bar * 4 && t < (bar + 1) * 4).map((t) => Math.round((t - bar * 4) * 4) / 4)
}

let failed = 0
function expect(cond: boolean, message: string) {
  if (!cond) {
    failed++
    console.error('FAIL', message)
  }
}

for (const genre of GENRES) {
  const song = generateComposition({
    genre: genre.id as GenreId,
    key: 'C',
    scale: genre.defaultScale as 'major',
    bpm: Math.round((genre.defaultBpm[0] + genre.defaultBpm[1]) / 2),
    timeSignature: [4, 4],
    complexity: 0.8,
    energy: 0.85,
    length: 'medium',
    seed: 7,
  })
  const limit = song.totalBars * 4 + 0.2
  for (const track of song.tracks) {
    for (const note of track.notes) {
      expect(note.time >= -0.01 && note.time < limit, `${genre.id} ${track.role} time ${note.time} outside 0..${limit}`)
      expect(note.pitch >= 12 && note.pitch <= 108, `${genre.id} ${track.role} pitch ${note.pitch}`)
    }
  }
  const maxTime = Math.max(...song.tracks.flatMap((t) => t.notes.map((n) => n.time)))
  expect(maxTime > song.totalBars * 3, `${genre.id} arrangement ends too early (${maxTime} vs ${song.totalBars} bars)`)

  const drums = song.tracks.find((t) => t.role === 'drums')
  const bass = song.tracks.find((t) => t.role === 'bass')
  if (drums && bass && drums.notes.length && bass.notes.length) {
    const drumBar = Math.floor(Math.min(...drums.notes.map((n) => n.time)) / 4)
    const bassThere = bass.notes.some((n) => n.time >= drumBar * 4 && n.time < (drumBar + 1) * 4)
    expect(bassThere, `${genre.id} bass is not on the same grid as the first drum bar ${drumBar}`)
  }
}

function song(genre: GenreId, scale: 'major' | 'minor' | 'mixolydian' | 'dorian' | 'phrygian' = 'major') {
  const profile = GENRES.find((g) => g.id === genre)!
  return generateComposition({
    genre,
    key: 'C',
    scale: profile.defaultScale as typeof scale,
    bpm: 120,
    timeSignature: [4, 4],
    complexity: 0.85,
    energy: 0.9,
    length: 'short',
    seed: 3,
  })
}

const rock = song('rock')
const rockChords = rock.tracks.find((t) => t.role === 'chords')!
const rockIntervals = new Set<number>()
const byTime = new Map<number, number[]>()
for (const note of rockChords.notes) {
  const key = Math.round(note.time * 8) / 8
  const list = byTime.get(key) ?? []
  list.push(note.pitch)
  byTime.set(key, list)
}
for (const pitches of byTime.values()) {
  const low = Math.min(...pitches)
  for (const pitch of pitches) rockIntervals.add(pitch - low)
}
expect(rockIntervals.has(7) || rockIntervals.has(12), `rock chords are not power chords: ${[...rockIntervals].join(',')}`)
expect(!rockIntervals.has(3) && !rockIntervals.has(4), `rock chords include thirds: ${[...rockIntervals].join(',')}`)

const reggae = song('reggae')
const reggaeDrums = reggae.tracks.find((t) => t.role === 'drums')!
const kickBeats = beatsInBar(reggaeDrums.notes.filter((n) => n.pitch === 36).map((n) => n.time), 2)
expect(kickBeats.includes(2) && !kickBeats.includes(0), `reggae kick is not one-drop: ${kickBeats.join(',')}`)
const reggaeChords = reggae.tracks.find((t) => t.role === 'chords')!
const chordBeats = beatsInBar(reggaeChords.notes.map((n) => n.time), 2)
expect(chordBeats.every((b) => Math.abs((b % 1) - 0.5) < 0.2), `reggae chords are not offbeat skanks: ${chordBeats.join(',')}`)

const house = song('house')
const houseKicks = beatsInBar(house.tracks.find((t) => t.role === 'drums')!.notes.filter((n) => n.pitch === 36).map((n) => n.time), 1)
expect([0, 1, 2, 3].every((b) => houseKicks.includes(b)), `house is not four-on-the-floor: ${houseKicks.join(',')}`)

const jazz = song('jazz')
const jazzBass = jazz.tracks.find((t) => t.role === 'bass')!
const jazzBassCount = jazzBass.notes.filter((n) => n.time >= 8 && n.time < 12).length
expect(jazzBassCount >= 4, `jazz bass is not walking (${jazzBassCount} notes in a bar)`)
const jazzRide = jazz.tracks.find((t) => t.role === 'drums')!.notes.filter((n) => n.pitch === 51).length
const jazzSnare = jazz.tracks.find((t) => t.role === 'drums')!.notes.filter((n) => n.pitch === 38).length
expect(jazzRide > jazzSnare, `jazz drums are not ride-led (${jazzRide} ride vs ${jazzSnare} snare)`)

const metal = song('metal')
const metalBass = metal.tracks.find((t) => t.role === 'bass')!
const metalPerBar = metalBass.notes.filter((n) => n.time >= 4 && n.time < 8).length
expect(metalPerBar >= 8, `metal bass is not chugging (${metalPerBar} notes)`)

const dnb = song('drum-and-bass')
const dnbSnare = beatsInBar(dnb.tracks.find((t) => t.role === 'drums')!.notes.filter((n) => n.pitch === 38).map((n) => n.time), 1)
expect(dnbSnare.some((b) => b >= 2.5), `dnb snare is not a break: ${dnbSnare.join(',')}`)

const pop = song('pop')
expect(pop.tracks.find((t) => t.role === 'chords')!.instrument === 25, 'pop chords should be acoustic guitar')
expect(pop.tracks.find((t) => t.role === 'bass')!.instrument === 33, 'pop bass should be finger bass')
expect(pop.tracks.find((t) => t.role === 'drums')!.channel === 9, 'drums should be GM channel 10')

if (failed) {
  console.error(`${failed} checks failed`)
  process.exit(1)
}
console.log(`style checks passed for ${GENRES.length} genres`)
