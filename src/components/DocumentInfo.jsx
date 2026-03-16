export default function DocumentInfo({ data, onChange }) {
  return (
    <div className="editor-card">
      <div className="editor-header">
        <div className="editor-header-text">
          <h1 className="editor-title">📋 Informações da Capa</h1>
          <p className="editor-subtitle">
            Preencha os dados que aparecerão na capa do documento conforme as normas ABNT.
          </p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group full">
          <label className="form-label">Instituição de Ensino</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: Universidade Federal de Minas Gerais"
            value={data.institution}
            onChange={e => onChange('institution', e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label className="form-label">Curso / Departamento</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: Bacharelado em Ciência da Computação"
            value={data.course}
            onChange={e => onChange('course', e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label className="form-label">Título do Trabalho</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: Análise de Algoritmos de Ordenação"
            value={data.title}
            onChange={e => onChange('title', e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label className="form-label">Subtítulo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: Um estudo comparativo de desempenho"
            value={data.subtitle}
            onChange={e => onChange('subtitle', e.target.value)}
          />
        </div>

        <div className="form-group full">
          <label className="form-label">Autor(es)</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: João Silva, Maria Souza"
            value={data.author}
            onChange={e => onChange('author', e.target.value)}
          />
          <span className="form-hint">Para múltiplos autores, separe com vírgula.</span>
        </div>

        <div className="form-group full">
          <label className="form-label">Professor / Orientador <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: Prof. Dr. Carlos Pereira"
            value={data.professor}
            onChange={e => onChange('professor', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Cidade</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: Belo Horizonte"
            value={data.city}
            onChange={e => onChange('city', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ano</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ex: 2025"
            value={data.year}
            onChange={e => onChange('year', e.target.value)}
          />
        </div>
      </div>

      <div style={{
        marginTop: 32,
        padding: '16px 20px',
        background: 'rgba(59,91,219,0.05)',
        borderRadius: 8,
        border: '1px solid rgba(59,91,219,0.15)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
          📐 Normas ABNT aplicadas automaticamente:
        </p>
        <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 16, lineHeight: 2 }}>
          <li>Papel A4 — margens: 3cm (sup/esq) e 2cm (inf/dir)</li>
          <li>Fonte Times New Roman 12pt — espaçamento 1,5</li>
          <li>Títulos numerados e formatados por nível</li>
          <li>Figuras com legenda abaixo (ABNT NBR 14724)</li>
          <li>Numeração de páginas no canto superior direito</li>
        </ul>
      </div>
    </div>
  )
}
