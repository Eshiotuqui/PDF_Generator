import { useState, useCallback } from 'react'
import './index.css'
import Sidebar from './components/Sidebar'
import DocumentInfo from './components/DocumentInfo'
import SectionEditor from './components/SectionEditor'
import ReferencesEditor from './components/ReferencesEditor'
import { generatePDF } from './utils/pdfGenerator'

const createBlock = (type = 'text') => ({
  id: Date.now() + Math.random(),
  type,           // 'text' | 'image'
  content: '',    // usado por type=text
  dataUrl: '',    // usado por type=image
  caption: '',
  source: '',
  fileName: '',
})

const createSection = (id, title = '', level = 1, numbered = true) => ({
  id,
  title,
  level,
  numbered,
  blocks: [createBlock('text')],
})

const initialState = {
  documentInfo: {
    institution: '',
    course: '',
    title: '',
    subtitle: '',
    author: '',
    professor: '',
    city: '',
    year: new Date().getFullYear().toString(),
    includeCover: true,
    includeTOC: false,
  },
  sections: [
    createSection(1, 'Introdução', 1),
  ],
  references: [],
  nextId: 2,
}

export default function App() {
  const [doc, setDoc] = useState(initialState)
  const [activeView, setActiveView] = useState('info') // 'info' | 'section-{id}' | 'references'
  const [toast, setToast] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Document info
  const updateDocumentInfo = useCallback((field, value) => {
    setDoc(d => ({ ...d, documentInfo: { ...d.documentInfo, [field]: value } }))
  }, [])

  // Sections
  const addSection = useCallback((level = 1, afterId = null) => {
    setDoc(d => {
      const newSection = createSection(d.nextId, 'Nova Seção', level)
      let sections
      if (afterId !== null) {
        const idx = d.sections.findIndex(s => s.id === afterId)
        sections = [...d.sections.slice(0, idx + 1), newSection, ...d.sections.slice(idx + 1)]
      } else {
        sections = [...d.sections, newSection]
      }
      return { ...d, sections, nextId: d.nextId + 1 }
    })
    setActiveView(`section-${doc.nextId}`)
  }, [doc.nextId])

  const updateSection = useCallback((id, field, value) => {
    setDoc(d => ({
      ...d,
      sections: d.sections.map(s => s.id === id ? { ...s, [field]: value } : s),
    }))
  }, [])

  const deleteSection = useCallback((id) => {
    setDoc(d => {
      const sections = d.sections.filter(s => s.id !== id)
      return { ...d, sections }
    })
    setActiveView(prev => prev === `section-${id}` ? 'info' : prev)
  }, [])

  const moveSection = useCallback((id, direction) => {
    setDoc(d => {
      const idx = d.sections.findIndex(s => s.id === id)
      if (direction === 'up' && idx === 0) return d
      if (direction === 'down' && idx === d.sections.length - 1) return d
      const sections = [...d.sections]
      const swap = direction === 'up' ? idx - 1 : idx + 1
      ;[sections[idx], sections[swap]] = [sections[swap], sections[idx]]
      return { ...d, sections }
    })
  }, [])

  const reorderSection = useCallback((fromId, toId) => {
    if (fromId === toId) return
    setDoc(d => {
      const sections = [...d.sections]
      const fromIdx = sections.findIndex(s => s.id === fromId)
      const toIdx = sections.findIndex(s => s.id === toId)
      if (fromIdx === -1 || toIdx === -1) return d
      const [moved] = sections.splice(fromIdx, 1)
      sections.splice(toIdx, 0, moved)
      return { ...d, sections }
    })
  }, [])

  // References
  const updateReferences = useCallback((refs) => {
    setDoc(d => ({ ...d, references: refs }))
  }, [])

  // PDF generation
  const handleGeneratePDF = async () => {
    try {
      showToast('Gerando PDF...', 'success')
      await generatePDF(doc)
      showToast('PDF gerado com sucesso!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Erro ao gerar o PDF.', 'error')
    }
  }

  // PDF preview
  const handlePreviewPDF = async () => {
    try {
      showToast('Gerando pré-visualização...', 'success')
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = await generatePDF(doc, { preview: true })
      setPreviewUrl(url)
    } catch (err) {
      console.error(err)
      showToast('Erro ao gerar pré-visualização.', 'error')
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  // Active section
  const activeSection = activeView.startsWith('section-')
    ? doc.sections.find(s => s.id === parseInt(activeView.replace('section-', ''), 10))
    : null

  return (
    <div className="app-layout">
      <Sidebar
        sections={doc.sections}
        activeView={activeView}
        onNavigate={setActiveView}
        onAddSection={addSection}
        onDeleteSection={deleteSection}
        onMoveSection={moveSection}
        onReorderSection={reorderSection}
        onGeneratePDF={handleGeneratePDF}
        onPreviewPDF={handlePreviewPDF}
      />

      <main className="main-content">
        {activeView === 'info' && (
          <DocumentInfo
            data={doc.documentInfo}
            onChange={updateDocumentInfo}
          />
        )}

        {activeSection && (
          <SectionEditor
            section={activeSection}
            sections={doc.sections}
            onChange={updateSection}
            onAddSubsection={(id) => addSection(activeSection.level + 1 <= 3 ? activeSection.level + 1 : 3, id)}
          />
        )}

        {activeView === 'references' && (
          <ReferencesEditor
            references={doc.references}
            onChange={updateReferences}
          />
        )}
      </main>

      {previewUrl && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-title">Pré-visualização do PDF</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleGeneratePDF}>
                  Baixar PDF
                </button>
                <button className="btn btn-secondary" onClick={closePreview}>
                  Fechar
                </button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              className="preview-iframe"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  )
}
