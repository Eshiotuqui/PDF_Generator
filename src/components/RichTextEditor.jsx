import { useRef, useEffect, useCallback } from 'react'

const PRESET_COLORS = [
  '#000000', '#4b5563', '#dc2626', '#ea580c',
  '#ca8a04', '#16a34a', '#2563eb', '#7c3aed',
]

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null)

  // Initialize content on mount (or when block changes via key)
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || ''
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  // Use onMouseDown + preventDefault to avoid losing focus before execCommand
  const exec = (cmd, arg = null) => (e) => {
    e.preventDefault()
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    triggerChange()
  }

  return (
    <div className="rich-editor-wrapper">
      <div className="rich-toolbar">
        <button type="button" className="toolbar-btn" title="Negrito (Ctrl+B)" onMouseDown={exec('bold')}>
          <b>N</b>
        </button>
        <button type="button" className="toolbar-btn" title="Itálico (Ctrl+I)" onMouseDown={exec('italic')}>
          <i>I</i>
        </button>
        <button type="button" className="toolbar-btn" title="Sublinhado (Ctrl+U)" onMouseDown={exec('underline')}>
          <u>S</u>
        </button>

        <div className="toolbar-sep" />

        <button type="button" className="toolbar-btn" title="Lista com marcadores" onMouseDown={exec('insertUnorderedList')}>
          ≡•
        </button>
        <button type="button" className="toolbar-btn" title="Lista numerada" onMouseDown={exec('insertOrderedList')}>
          ≡1
        </button>

        <div className="toolbar-sep" />

        <div className="toolbar-colors">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              className="color-dot"
              style={{ background: color }}
              title={`Cor: ${color}`}
              onMouseDown={exec('foreColor', color)}
            />
          ))}
          <label className="color-dot color-picker-label" title="Cor personalizada">
            <span>⚙</span>
            <input
              type="color"
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              onInput={e => {
                editorRef.current?.focus()
                document.execCommand('foreColor', false, e.target.value)
                triggerChange()
              }}
            />
          </label>
        </div>

      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="rich-editor-content"
        data-placeholder={placeholder || 'Digite o texto aqui...'}
        onInput={triggerChange}
        onBlur={triggerChange}
      />
    </div>
  )
}
