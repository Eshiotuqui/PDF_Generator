import { useRef, useState } from 'react'
import RichTextEditor from './RichTextEditor'

const LEVEL_HINTS = {
  1: 'Seção Principal — ex: 1 INTRODUÇÃO',
  2: 'Subseção — ex: 1.1 Contexto histórico',
  3: 'Sub-subseção — ex: 1.1.1 Período colonial',
}

function createBlock(type = 'text') {
  return {
    id: Date.now() + Math.random(),
    type,
    content: '',
    dataUrl: '',
    caption: '',
    source: '',
    fileName: '',
  }
}

function getSectionNumber(sections, sectionId) {
  const counters = [0, 0, 0]
  for (const s of sections) {
    if (s.numbered === false) {
      if (s.id === sectionId) return null
      continue
    }
    const lvl = s.level - 1
    counters[lvl]++
    for (let i = lvl + 1; i < 3; i++) counters[i] = 0
    if (s.id === sectionId) return counters.slice(0, s.level).join('.')
  }
  return ''
}

// Count images in all sections before this one (for figure numbering)
function getPrecedingImageCount(sections, sectionId) {
  let count = 0
  for (const s of sections) {
    if (s.id === sectionId) break
    count += s.blocks.filter(b => b.type === 'image').length
  }
  return count
}

export default function SectionEditor({ section, sections, onChange, onAddSubsection }) {
  const fileInputRef = useRef(null)
  const [pendingBlockId, setPendingBlockId] = useState(null) // which block triggered the file input

  const sectionNumber = getSectionNumber(sections, section.id)
  const precedingImages = getPrecedingImageCount(sections, section.id)

  // ── Block operations ──────────────────────────────────────────
  const updateBlock = (blockId, fields) => {
    onChange(section.id, 'blocks', section.blocks.map(b =>
      b.id === blockId ? { ...b, ...fields } : b
    ))
  }

  const removeBlock = (blockId) => {
    onChange(section.id, 'blocks', section.blocks.filter(b => b.id !== blockId))
  }

  const moveBlock = (blockId, dir) => {
    const blocks = [...section.blocks]
    const idx = blocks.findIndex(b => b.id === blockId)
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= blocks.length) return
    ;[blocks[idx], blocks[swap]] = [blocks[swap], blocks[idx]]
    onChange(section.id, 'blocks', blocks)
  }

  const addBlock = (type, afterId = null) => {
    const newBlock = createBlock(type)
    if (afterId === null) {
      onChange(section.id, 'blocks', [...section.blocks, newBlock])
    } else {
      const idx = section.blocks.findIndex(b => b.id === afterId)
      const blocks = [
        ...section.blocks.slice(0, idx + 1),
        newBlock,
        ...section.blocks.slice(idx + 1),
      ]
      onChange(section.id, 'blocks', blocks)
    }
  }

  // ── Image handling ────────────────────────────────────────────
  const handleFileInput = (files, blockId) => {
    const file = files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      updateBlock(blockId, {
        dataUrl: e.target.result,
        fileName: file.name,
      })
    }
    reader.readAsDataURL(file)
  }

  const openFilePicker = (blockId) => {
    setPendingBlockId(blockId)
    fileInputRef.current?.click()
  }

  // Figure numbers only for image blocks within this section
  let imgIdx = 0

  return (
    <div className="editor-card">
      {/* Header */}
      <div className="editor-header">
        <div className="editor-header-text">
          <h1 className="editor-title">
            {sectionNumber != null && sectionNumber !== '' && <span className="section-number-badge">{sectionNumber}</span>}{' '}
            {section.title || 'Sem título'}
          </h1>
          <p className="editor-subtitle">{LEVEL_HINTS[section.level]}</p>
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
        <div className="form-group" style={{ minWidth: 240 }}>
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

      <label className="switch-label" style={{ marginBottom: 16 }}>
        <span className="switch-text">Seção numerada</span>
        <div
          className={`switch ${section.numbered !== false ? 'switch-on' : ''}`}
          onClick={() => onChange(section.id, 'numbered', section.numbered === false)}
        >
          <div className="switch-thumb" />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {section.numbered !== false ? 'Aparece na numeração (1, 2, 3...)' : 'Sem numeração (ex: Sumário, Agradecimentos)'}
        </span>
      </label>

      <hr className="section-divider" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (pendingBlockId) handleFileInput(e.target.files, pendingBlockId)
          e.target.value = ''
        }}
      />

      {/* Blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {section.blocks.map((block, blockIndex) => {
          const isFirst = blockIndex === 0
          const isLast = blockIndex === section.blocks.length - 1

          if (block.type === 'text') {
            return (
              <div key={block.id} className="block-card block-text">
                <div className="block-toolbar">
                  <span className="block-type-label">✏️ Texto</span>
                  <div className="block-actions">
                    <button className="block-btn" title="Mover para cima" disabled={isFirst} onClick={() => moveBlock(block.id, 'up')}>↑</button>
                    <button className="block-btn" title="Mover para baixo" disabled={isLast} onClick={() => moveBlock(block.id, 'down')}>↓</button>
                    <button className="block-btn danger" title="Remover bloco" onClick={() => removeBlock(block.id)}>✕</button>
                  </div>
                </div>
                <RichTextEditor
                  key={block.id}
                  value={block.content}
                  onChange={(html) => updateBlock(block.id, { content: html })}
                  placeholder="Digite o texto aqui... Use a barra de ferramentas para formatar."
                />
                <AddBlockRow onAdd={(type) => addBlock(type, block.id)} />
              </div>
            )
          }

          if (block.type === 'image') {
            imgIdx++
            const figNum = precedingImages + imgIdx

            return (
              <div key={block.id} className="block-card block-image">
                <div className="block-toolbar">
                  <span className="block-type-label">🖼️ Figura {figNum}</span>
                  <div className="block-actions">
                    <button className="block-btn" title="Mover para cima" disabled={isFirst} onClick={() => moveBlock(block.id, 'up')}>↑</button>
                    <button className="block-btn" title="Mover para baixo" disabled={isLast} onClick={() => moveBlock(block.id, 'down')}>↓</button>
                    <button className="block-btn danger" title="Remover bloco" onClick={() => removeBlock(block.id)}>✕</button>
                  </div>
                </div>

                {block.dataUrl ? (
                  <div className="image-block-preview-wrap">
                    <img src={block.dataUrl} alt={block.caption} className="image-block-preview" />
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, alignSelf: 'flex-start' }}
                      onClick={() => openFilePicker(block.id)}
                    >
                      Trocar imagem
                    </button>
                  </div>
                ) : (
                  <div
                    className="drop-zone"
                    onClick={() => openFilePicker(block.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFileInput(e.dataTransfer.files, block.id) }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
                    <div className="drop-zone-text">
                      <strong>Clique</strong> ou arraste a imagem aqui
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Legenda</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder={`Ex: Figura ${figNum} – Diagrama de fluxo do sistema`}
                    value={block.caption}
                    onChange={e => updateBlock(block.id, { caption: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginTop: 6 }}>
                  <label className="form-label">Fonte <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ex: Elaborado pelo autor, 2025"
                    value={block.source}
                    onChange={e => updateBlock(block.id, { source: e.target.value })}
                  />
                </div>
                <AddBlockRow onAdd={(type) => addBlock(type, block.id)} />
              </div>
            )
          }

          return null
        })}
      </div>

      {/* Add first block if section is empty */}
      {section.blocks.length === 0 && (
        <AddBlockRow onAdd={(type) => addBlock(type)} empty />
      )}
    </div>
  )
}

function AddBlockRow({ onAdd, empty = false }) {
  return (
    <div className="add-block-row" style={{ marginTop: empty ? 0 : 6 }}>
      <button className="add-block-btn" onClick={() => onAdd('text')}>
        + Texto
      </button>
      <button className="add-block-btn" onClick={() => onAdd('image')}>
        + Imagem
      </button>
    </div>
  )
}
