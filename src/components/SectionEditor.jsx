import { useRef, useState } from 'react'

const LEVEL_LABELS = {
  1: 'Seção Principal',
  2: 'Subseção',
  3: 'Sub-subseção',
}

const LEVEL_HINTS = {
  1: 'Ex: 1 INTRODUÇÃO — maiúsculas, negrito',
  2: 'Ex: 1.1 Contexto histórico — minúsculas, negrito',
  3: 'Ex: 1.1.1 Período colonial — minúsculas, itálico',
}

function getSectionNumber(sections, sectionId) {
  const counters = [0, 0, 0]
  let result = ''
  for (const s of sections) {
    const lvl = s.level - 1
    counters[lvl]++
    for (let i = lvl + 1; i < 3; i++) counters[i] = 0
    if (s.id === sectionId) {
      result = counters.slice(0, s.level).join('.')
      break
    }
  }
  return result
}

export default function SectionEditor({ section, sections, onChange, onAddSubsection }) {
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const sectionNumber = getSectionNumber(sections, section.id)

  const handleImageFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImage = {
          id: Date.now() + Math.random(),
          dataUrl: e.target.result,
          caption: '',
          source: '',
          fileName: file.name,
        }
        onChange(section.id, 'images', [...section.images, newImage])
      }
      reader.readAsDataURL(file)
    })
  }

  const updateImage = (imgId, field, value) => {
    onChange(section.id, 'images', section.images.map(img =>
      img.id === imgId ? { ...img, [field]: value } : img
    ))
  }

  const removeImage = (imgId) => {
    onChange(section.id, 'images', section.images.filter(img => img.id !== imgId))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleImageFiles(e.dataTransfer.files)
  }

  // Count images across all sections for sequential numbering
  let imageCount = 0
  for (const s of sections) {
    if (s.id === section.id) break
    imageCount += s.images.length
  }

  return (
    <div className="editor-card">
      <div className="editor-header">
        <div className="editor-header-text">
          <h1 className="editor-title">
            {sectionNumber && (
              <span className="section-number-badge">{sectionNumber}</span>
            )}{' '}
            {section.title || 'Sem título'}
          </h1>
          <p className="editor-subtitle">{LEVEL_LABELS[section.level]} — {LEVEL_HINTS[section.level]}</p>
        </div>
        {section.level < 3 && (
          <button className="btn btn-secondary" onClick={() => onAddSubsection(section.id)}>
            + Subseção
          </button>
        )}
      </div>

      {/* Title + Level */}
      <div className="section-meta">
        <div className="form-group">
          <label className="form-label">Título da Seção</label>
          <input
            className="form-input"
            type="text"
            placeholder="Digite o título..."
            value={section.title}
            onChange={e => onChange(section.id, 'title', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ minWidth: 220 }}>
          <label className="form-label">Nível</label>
          <div className="level-selector">
            {[1, 2, 3].map(lvl => (
              <button
                key={lvl}
                className={`level-btn ${section.level === lvl ? 'active' : ''}`}
                onClick={() => onChange(section.id, 'level', lvl)}
              >
                {lvl === 1 ? '1 Principal' : lvl === 2 ? '1.1 Sub' : '1.1.1 Sub²'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="section-divider" />

      {/* Content */}
      <div className="form-group full">
        <label className="form-label">Conteúdo / Texto</label>
        <textarea
          className="form-textarea"
          placeholder="Digite o texto desta seção aqui...

Use parágrafos separados por linha em branco. O PDF será gerado com recuo de 1,25cm no início de cada parágrafo, conforme ABNT."
          value={section.content}
          onChange={e => onChange(section.id, 'content', e.target.value)}
          style={{ minHeight: 240 }}
        />
        <span className="form-hint">
          {section.content.trim().split(/\s+/).filter(Boolean).length} palavras •
          Parágrafos separados por linha em branco serão recuados automaticamente (ABNT)
        </span>
      </div>

      {/* Images */}
      <div className="images-section">
        <div className="images-section-header">
          <span className="images-section-title">Figuras / Imagens</span>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: 12 }}
          >
            + Adicionar Imagem
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleImageFiles(e.target.files)}
        />

        <div
          className={`drop-zone ${dragging ? 'drag-over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
          <div className="drop-zone-text">
            <strong>Clique aqui</strong> ou arraste imagens para adicionar
          </div>
          <div className="drop-zone-text" style={{ fontSize: 11, marginTop: 4 }}>
            PNG, JPG, WEBP suportados
          </div>
        </div>

        {section.images.length > 0 && (
          <div className="image-list">
            {section.images.map((img, idx) => {
              const figureNum = imageCount + idx + 1
              return (
                <div key={img.id} className="image-card">
                  <img
                    src={img.dataUrl}
                    alt={img.caption || `Figura ${figureNum}`}
                    className="image-preview"
                  />
                  <div className="image-fields">
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      Figura {figureNum}
                    </div>
                    <div className="form-group" style={{ gap: 4 }}>
                      <label className="form-label">Legenda</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={`Ex: Figura ${figureNum} – Diagrama de fluxo do sistema`}
                        value={img.caption}
                        onChange={e => updateImage(img.id, 'caption', e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gap: 4 }}>
                      <label className="form-label">Fonte <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Ex: Elaborado pelo autor, 2025 / IBGE, 2023"
                        value={img.source}
                        onChange={e => updateImage(img.id, 'source', e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="image-remove-btn"
                    title="Remover imagem"
                    onClick={() => removeImage(img.id)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
