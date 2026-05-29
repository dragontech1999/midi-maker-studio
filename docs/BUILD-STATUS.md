# Build Status

## Windows (v1.3.0) — complete

Built locally on Windows. After `npm run electron:build:win`, installers are written to `release-v130/`:

| Artifact | Description |
|----------|-------------|
| `MIDI Maker Studio v1.3.0 Portable.exe` | Portable, no install |
| `MIDI Maker Studio Setup 1.3.0.exe` | NSIS installer |
| `win-unpacked/MIDI Maker Studio.exe` | Unpacked app |

These binaries are **not committed to git** (see `.gitignore`). Download them from GitHub Releases after tagging, or build locally.

## macOS — built via GitHub Actions (unsigned)

**No macOS `.dmg` is committed to git.** CI on `macos-latest` produces unsigned DMG artifacts after each push to `main` or manual workflow run.

Latest successful build: [Actions run](https://github.com/dragontech1999/midi-maker-studio/actions) → download **MIDI-Maker-Studio-macOS** artifact.

| Artifact | Description |
|----------|-------------|
| `MIDI Maker Studio-1.3.0.dmg` | Intel (x64) |
| `MIDI Maker Studio-1.3.0-arm64.dmg` | Apple Silicon |

Local build on a Mac:

```bash
npm ci
npm run electron:build:mac
```
