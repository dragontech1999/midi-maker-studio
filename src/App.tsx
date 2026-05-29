import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Sidebar, type StudioView } from './components/Sidebar'
import { TransportControls } from './components/TransportControls'
import { GeneratePanel } from './components/GeneratePanel'
import { ExportPanel } from './components/ExportPanel'
import { StructurePanel } from './components/StructurePanel'
import { PianoRoll } from './components/PianoRoll'
import { TrackList } from './components/TrackList'
import { useStudio } from './hooks/useStudio'

export default function App() {
  const [view, setView] = useState<StudioView>('generate')
  const studio = useStudio()

  const selectedTrack = useMemo(
    () => studio.composition?.tracks.find((t) => t.id === studio.selectedTrackId) ?? null,
    [studio.composition, studio.selectedTrackId],
  )

  const handleGenerate = (options: Parameters<typeof studio.generate>[0]) => {
    studio.generate(options)
    setView('structure')
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        onViewChange={setView}
        hasComposition={!!studio.composition}
      />

      <div className="studio-main">
        <Header
          title={studio.composition?.title}
          zoom={studio.zoom}
          onZoomChange={studio.setZoom}
        />

        <TransportControls
          transport={studio.transport}
          currentBar={studio.currentBar}
          totalBars={studio.composition?.totalBars ?? 0}
          bpm={studio.composition?.bpm ?? 120}
          onPlay={studio.play}
          onPause={studio.pause}
          onStop={studio.stop}
          disabled={!studio.composition}
        />

        <div className="studio-workspace">
          <div className="studio-left">
            {view === 'generate' && (
              <GeneratePanel
                onGenerate={handleGenerate}
                isGenerating={studio.isGenerating}
                generationStatus={studio.generationStatus}
                generationProgress={studio.generationProgress}
              />
            )}
            {view === 'export' && studio.composition && (
              <ExportPanel composition={studio.composition} />
            )}
            {view === 'structure' && studio.composition && (
              <StructurePanel composition={studio.composition} />
            )}
            {!studio.composition && view !== 'generate' && (
              <div className="empty-state">
                <p>Generate a song first to view {view}.</p>
              </div>
            )}
          </div>

          <div className="studio-center">
            {studio.composition ? (
              <>
                <PianoRoll
                  composition={studio.composition}
                  selectedTrack={selectedTrack}
                  currentBar={studio.currentBar}
                  zoom={studio.zoom}
                />
                <TrackList
                  composition={studio.composition}
                  selectedTrackId={studio.selectedTrackId}
                  onSelectTrack={studio.setSelectedTrackId}
                  onToggleMute={studio.toggleTrackMute}
                  onToggleSolo={studio.toggleTrackSolo}
                  onVolumeChange={studio.setTrackVolume}
                />
              </>
            ) : (
              <div className="welcome-state">
                <div className="welcome-content">
                  <span className="welcome-icon">🎼</span>
                  <h2>Welcome to MIDI Maker Studio</h2>
                  <p>
                    Generate professional multitrack MIDI compositions using Google Magenta AI —
                    MusicVAE, ImprovRNN, and DrumsRNN — with full song structure and stem export.
                  </p>
                  <ul>
                    <li>20 genres — Pop, Rock, Hip-Hop, House, Techno, Industrial, Jazz, and more</li>
                    <li>Multi-track stems — Drums, Bass, Chords, Melody, Pads, Arpeggios</li>
                    <li>Play &amp; pause with live piano roll preview</li>
                    <li>Export full song or individual stems for your DAW</li>
                  </ul>
                  <p className="welcome-hint">Select <strong>Generate</strong> in the sidebar to begin.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
