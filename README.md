# MIDI Maker Studio v1.3

Professional standalone MIDI song generator for **Windows** and **macOS**. Generate multitrack compositions powered by **Google Magenta AI** with offline model caching, live playback, and DAW-ready export.

## What's New in v1.3

- **Offline Magenta models** — Download and cache all checkpoints for offline generation
- **Model modes** — Auto, online-only, or offline-only
- **Connection health** — Latency check against Magenta CDN with status badge
- **Download & generation progress** — IPC progress for model downloads and AI composition
- **Procedural fallback** — Reliable output if Magenta models fail to load
- **App icon** — Custom branding for window, installer, and taskbar

## Features

- **20 genres** — Pop, Rock, Hip-Hop, R&B, House, Techno, Trance, Dubstep, DnB, Industrial, Metal, Jazz, Classical, Country, Ambient, Reggae, Latin, Funk, Soul, Cinematic
- **Google Magenta AI** — MusicVAE trio, ImprovRNN, DrumsRNN with section-aware song assembly
- **Music theory engine** — Diatonic harmony, 12 scale modes, Roman numeral progressions, voice leading
- **Dynamic song structure** — Intro, verse, chorus, bridge, breakdown, build-up, drop, outro
- **Multi-track stems** — Drums, bass, chords, melody, arpeggio, pad, strings, brass, lead
- **Piano roll** — Visual note editor with section markers and playhead
- **Transport controls** — Play, pause, stop with progress bar
- **Export** — Full multitrack `.mid` or numbered stem `.zip` for Ableton, FL Studio, Logic Pro

## Quick Start

```bash
npm install
npm run dev
```

## Build Installers

```bash
# Windows (portable + installer) — run on Windows
npm run electron:build:win

# macOS (DMG) — must run on a Mac
npm run electron:build:mac
```

Installers are written to `release-v130/`. See [docs/BUILD-STATUS.md](docs/BUILD-STATUS.md) for current platform status.

### Windows — built

| File | Use |
|------|-----|
| `MIDI Maker Studio v1.3.0 Portable.exe` | Double-click to run — no install |
| `MIDI Maker Studio Setup 1.3.0.exe` | Full installer with shortcuts |

### macOS — incomplete

**No macOS `.dmg` is included in this repository yet.** Development and Windows builds were done on Windows; macOS packaging requires a Mac or GitHub Actions.

To build on GitHub: **Actions → Build Executables → Run workflow**, then download the **MIDI-Maker-Studio-macOS** artifact when the job succeeds.

Exports are saved to `Documents/MIDI Maker Studio/exports/`.

## Tech Stack

- Electron 41 + React 19 + TypeScript + Vite
- @magenta/music — AI composition (MusicVAE, RNN models)
- Tone.js — audio playback
- @tonejs/midi — MIDI file generation
- JSZip — stem archive export

## Studio Layout

Mirrors [midimaker.io/studio](https://midimaker.io/studio):

1. **Generate** — Key, scale, tempo, genre, complexity, energy, length
2. **Models** — Online/offline mode, download cache, connection status
3. **Structure** — Section timeline with energy/density meters
4. **Piano Roll** — Track notes with zoom and playhead
5. **Export** — Full song or individual stems

## License

MIT
