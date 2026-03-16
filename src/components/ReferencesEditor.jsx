const createRef = () => ({ id: Date.now() + Math.random(), text: '' })

export default function ReferencesEditor({ references, onChange }) {
  const add = () => onChange([...references, createRef()])
  const remove = (id) => onChange(references.filter(r => r.id !== id))
  const update = (id, text) => onChange(references.map(r => r.id === id ? { ...r, text } : r))

  return (
    <div className="editor-card">
      <div className="editor-header">
        <div className="editor-header-text">
          <h1 className="editor-title">📚 Referências</h1>
          <p className="editor-subtitle">
            Liste as referências bibliográficas conforme ABNT NBR 6023. Serão inseridas no final do documento.
          </p>
        </div>
        <button className="btn btn-primary" onClick={add}>+ Adicionar</button>
      </div>

      {references.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">📖</div>
          <h3>Nenhuma referência</h3>
          <p>Adicione as referências bibliográficas do seu trabalho.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={add}>
            + Adicionar Referência
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {references.map((ref, idx) => (
            <div key={ref.id} className="reference-item">
              <div className="ref-index">{idx + 1}.</div>
              <textarea
                className="form-textarea"
                style={{ minHeight: 72, flex: 1 }}
                placeholder={`Ex: SOBRENOME, Nome. Título: subtítulo. Edição. Local: Editora, Ano.`}
                value={ref.text}
                onChange={e => update(ref.id, e.target.value)}
              />
              <button
                className="image-remove-btn"
                style={{ marginTop: 8 }}
                onClick={() => remove(ref.id)}
                title="Remover referência"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {references.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={add}>+ Adicionar Referência</button>
        </div>
      )}

      <div style={{
        marginTop: 24,
        padding: '14px 18px',
        background: 'rgba(59,91,219,0.05)',
        borderRadius: 8,
        border: '1px solid rgba(59,91,219,0.15)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
          📐 Formato ABNT NBR 6023:
        </p>
        <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 2 }}>
          <li><b>Livro:</b> SOBRENOME, Nome. <i>Título</i>. Local: Editora, Ano.</li>
          <li><b>Artigo:</b> SOBRENOME, Nome. Título do artigo. <i>Revista</i>, v. X, n. X, p. XX–XX, Ano.</li>
          <li><b>Site:</b> SOBRENOME, Nome. Título. Disponível em: &lt;URL&gt;. Acesso em: data.</li>
        </ul>
      </div>
    </div>
  )
}
