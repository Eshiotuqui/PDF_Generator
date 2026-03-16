import { useState } from 'react'

function getSectionNumber(sections, sectionId) {
  const counters = [0, 0, 0]
  const numbers = {}
  sections.forEach(s => {
    const lvl = s.level - 1
    counters[lvl]++
    for (let i = lvl + 1; i < 3; i++) counters[i] = 0
    numbers[s.id] = counters.slice(0, s.level).join('.')
  })
  return numbers[sectionId] || ''
}

export default function Sidebar({
  sections,
  activeView,
  onNavigate,
  onAddSection,
  onDeleteSection,
  onMoveSection,
  onGeneratePDF,
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const sectionNumbers = {}
  const counters = [0, 0, 0]
  sections.forEach(s => {
    const lvl = s.level - 1
    counters[lvl]++
    for (let i = lvl + 1; i < 3; i++) counters[i] = 0
    sectionNumbers[s.id] = counters.slice(0, s.level).join('.')
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📄</div>
          Gerador ABNT
        </div>
        <div className="sidebar-subtitle">Normas ABNT • PDF</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Documento</div>

        <button
          className={`sidebar-item ${activeView === 'info' ? 'active' : ''}`}
          onClick={() => onNavigate('info')}
        >
          <span style={{ fontSize: 14 }}>📋</span>
          <span className="sidebar-item-name">Capa / Informações</span>
        </button>

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Seções</div>

        {sections.map((section) => (
          <button
            key={section.id}
            className={`sidebar-item level-${section.level} ${activeView === `section-${section.id}` ? 'active' : ''}`}
            onClick={() => onNavigate(`section-${section.id}`)}
          >
            <span style={{ fontSize: 11, opacity: 0.6, minWidth: 24 }}>
              {sectionNumbers[section.id]}
            </span>
            <span className="sidebar-item-name">
              {section.title || 'Sem título'}
            </span>
            <span className="sidebar-item-actions" onClick={e => e.stopPropagation()}>
              <button
                className="sidebar-icon-btn"
                title="Mover para cima"
                onClick={() => onMoveSection(section.id, 'up')}
              >↑</button>
              <button
                className="sidebar-icon-btn"
                title="Mover para baixo"
                onClick={() => onMoveSection(section.id, 'down')}
              >↓</button>
              <button
                className="sidebar-icon-btn danger"
                title="Remover seção"
                onClick={() => {
                  if (confirm(`Remover "${section.title || 'esta seção'}"?`)) {
                    onDeleteSection(section.id)
                  }
                }}
              >✕</button>
            </span>
          </button>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>Extras</div>
        <button
          className={`sidebar-item ${activeView === 'references' ? 'active' : ''}`}
          onClick={() => onNavigate('references')}
        >
          <span style={{ fontSize: 14 }}>📚</span>
          <span className="sidebar-item-name">Referências</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-add-section" style={{ flex: 1 }} onClick={() => onAddSection(1)}>
            + Seção
          </button>
          <button className="btn-add-section" style={{ flex: 1 }} onClick={() => onAddSection(2)}>
            + Subseção
          </button>
        </div>
        <button className="btn-generate" onClick={onGeneratePDF}>
          ⬇ Gerar PDF (ABNT)
        </button>
      </div>
    </aside>
  )
}
