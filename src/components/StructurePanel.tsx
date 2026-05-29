import type { Composition } from '../types'

interface StructurePanelProps {
  composition: Composition
}

export function StructurePanel({ composition }: StructurePanelProps) {
  return (
    <div className="structure-panel">
      <h2 className="panel-title">Song Structure</h2>
      <p className="panel-desc">
        Dynamic arrangement with energy and density curves applied per section.
      </p>

      <div className="structure-timeline">
        {composition.sections.map((section, i) => (
          <div
            key={i}
            className="structure-section"
            style={{
              flex: section.bars,
              '--energy': section.energy,
            } as React.CSSProperties}
          >
            <span className="section-type">{section.name}</span>
            <span className="section-bars">{section.bars} bars</span>
            <div className="section-meters">
              <div className="meter">
                <span>Energy</span>
                <div className="meter-bar">
                  <div className="meter-fill energy" style={{ width: `${section.energy * 100}%` }} />
                </div>
              </div>
              <div className="meter">
                <span>Density</span>
                <div className="meter-bar">
                  <div className="meter-fill density" style={{ width: `${section.density * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="structure-meta">
        <div className="meta-item">
          <span className="meta-label">Genre</span>
          <span className="meta-value">{composition.genre}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Key</span>
          <span className="meta-value">{composition.key} {composition.scale}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Total Bars</span>
          <span className="meta-value">{composition.totalBars}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Seed</span>
          <span className="meta-value">{composition.seed}</span>
        </div>
      </div>
    </div>
  )
}
