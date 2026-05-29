export type StudioView = 'generate' | 'export' | 'structure'

interface SidebarProps {
  view: StudioView
  onViewChange: (view: StudioView) => void
  hasComposition: boolean
}

export function Sidebar({ view, onViewChange, hasComposition }: SidebarProps) {
  const items: { id: StudioView; label: string; icon: string; requiresSong?: boolean }[] = [
    { id: 'generate', label: 'Generate', icon: '♪' },
    { id: 'structure', label: 'Structure', icon: '▤', requiresSong: true },
    { id: 'export', label: 'Export', icon: '↓', requiresSong: true },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">🎹</span>
        <div>
          <span className="brand-name">MIDI Maker</span>
          <span className="brand-sub">Studio</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'active' : ''} ${item.requiresSong && !hasComposition ? 'disabled' : ''}`}
            onClick={() => {
              if (item.requiresSong && !hasComposition) return
              onViewChange(item.id)
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Professional MIDI generation with music theory, genre templates, and stem export.</p>
      </div>
    </aside>
  )
}
