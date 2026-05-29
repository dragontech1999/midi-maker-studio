# Build Status

## Windows (v1.3.0) — complete

Built locally on Windows. After `npm run electron:build:win`, installers are written to `release-v130/`:

| Artifact | Description |
|----------|-------------|
| `MIDI Maker Studio v1.3.0 Portable.exe` | Portable, no install |
| `MIDI Maker Studio Setup 1.3.0.exe` | NSIS installer |
| `win-unpacked/MIDI Maker Studio.exe` | Unpacked app |

These binaries are **not committed to git** (see `.gitignore`). Download them from GitHub Releases after tagging, or build locally.

## macOS — incomplete

**No macOS `.dmg` has been produced yet.** Apple requires code signing and packaging on a Mac; this project was developed and built on Windows.

What is included in the repository:

- Full macOS target configuration in `package.json` (`electron-builder --mac`, universal x64 + arm64 DMG)
- GitHub Actions job `build-mac` in `.github/workflows/build.yml` (runs on `macos-latest`)

### How to produce the macOS build

1. Push this repository to GitHub.
2. Open **Actions → Build Executables → Run workflow** (or push a tag like `v1.3.0`).
3. When `build-mac` finishes, download the **MIDI-Maker-Studio-macOS** artifact (`.dmg` files).

Alternatively, on a Mac:

```bash
npm ci
npm run electron:build:mac
```

Output: `release-v130/*.dmg`

### Known gaps

- macOS build has not been verified on CI yet (first run pending after upload).
- Code signing / notarization are not configured (unsigned builds may require Gatekeeper override).
