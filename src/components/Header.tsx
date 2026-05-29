interface HeaderProps {
  title?: string
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function Header({ title, zoom, onZoomChange }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{title ?? 'MIDI Maker Studio'}</h1>
      </div>
      <div className="header-right">
        <label className="zoom-control">
          Zoom
          <input
            type="range"
            min={24}
            max={96}
            value={zoom}
            onChange={(e) => onZoomChange(parseInt(e.target.value))}
          />
        </label>
      </div>
    </header>
  )
}
