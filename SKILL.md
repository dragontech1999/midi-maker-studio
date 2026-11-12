---
name: midi-maker-studio
description: >-
  Builds and extends MIDI Maker Studio, a desktop app that writes multitrack
  MIDI in a chosen genre and plays it with sampled drums, bass, guitar, keys,
  strings, brass, and synths. Use when working on MIDI Maker Studio, genre
  arrangements, drum or bass patterns, GM instrument playback, or Electron
  packaging for this app.
---

# MIDI Maker Studio

MIDI Maker Studio writes a full song for the selected genre, then plays it with bundled General MIDI samples. Note times are quarter-note beats. Drums are MIDI channel 10 (channel index 9).

## Run and package

From the repo root, with Node 22:

```bash
npm ci
npm run dev
```

Apple Silicon app, unsigned:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run electron:build:mac -- --arm64
```

The `.app` is `release-v130/mac-arm64/MIDI Maker Studio.app`. Sample mp3s live in `public/samples/` and are copied to `Contents/Resources/samples` for the packaged app. Playback loads them through `mms-sample://` when the page is a file URL.

## Where the music is written

- `src/engine/composer.ts` writes every track from the genre profile.
- `src/engine/genres.ts` holds tempo, progressions, drum/bass/melody style names, GM program numbers, and which tracks exist.
- `src/engine/drumPatterns.ts` places kit hits in quarter-note beats. Styles include four-on-the-floor, rock backbeat, boom-bap, swing ride, one-drop, tumbao clave, half-time, and breakbeat.
- `src/engine/playback.ts` and `src/engine/sampleLibrary.ts` map GM programs to sampled instruments. Do not send every part to one synth.

Keep a new genre on its own drum, bass, and chord patterns. House kicks every beat and stabs offbeats. Reggae is a one-drop with offbeat guitar. Rock and metal use power chords. Jazz walks a bass under a ride pattern.

## Check

```bash
npx vite-node scripts/check-styles.ts
```

That script fails if a genre's drums, bass, and chords collapse into one pattern or leave the beat grid.

## References

- Genre and instrument map: [references/genres.md](references/genres.md)
- Playback and export timing: [references/playback.md](references/playback.md)
