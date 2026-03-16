import jsPDF from 'jspdf'

// ABNT NBR 14724 measurements (in mm)
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_TOP = 30
const MARGIN_LEFT = 30
const MARGIN_BOTTOM = 20
const MARGIN_RIGHT = 20
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT  // 160mm
const CONTENT_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM  // 247mm

const FONT_SIZE_BODY = 12
const FONT_SIZE_TITLE1 = 12   // same size, differ by style
const LINE_HEIGHT = 1.5        // ABNT: 1.5 line spacing
const PARA_INDENT = 12.5       // ABNT: 1.25cm paragraph indent
const FONT = 'times'

// Convert pt to mm (jsPDF uses pt for font metrics internally)
const ptToMm = (pt) => pt * 0.3528

// Line height in mm for body text
const lineHeightMm = () => ptToMm(FONT_SIZE_BODY) * LINE_HEIGHT

function buildSectionNumbers(sections) {
  const counters = [0, 0, 0]
  const numbers = {}
  sections.forEach(s => {
    const lvl = s.level - 1
    counters[lvl]++
    for (let i = lvl + 1; i < 3; i++) counters[i] = 0
    numbers[s.id] = counters.slice(0, s.level).join('.')
  })
  return numbers
}

export async function generatePDF(doc) {
  const { documentInfo: info, sections, references } = doc
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })

  // Page state
  let pageNum = 1
  let y = MARGIN_TOP

  // ── Helpers ──────────────────────────────────────────────────────────────

  function newPage() {
    pdf.addPage()
    pageNum++
    y = MARGIN_TOP
    addPageNumber()
  }

  function addPageNumber() {
    pdf.setFont(FONT, 'normal')
    pdf.setFontSize(10)
    pdf.text(
      String(pageNum),
      PAGE_W - MARGIN_RIGHT,
      15,
      { align: 'right' }
    )
  }

  function checkPageBreak(needed = 0) {
    if (y + needed > PAGE_H - MARGIN_BOTTOM) {
      newPage()
    }
  }

  function writeLine(text, opts = {}) {
    const {
      fontSize = FONT_SIZE_BODY,
      fontStyle = 'normal',
      align = 'justify',
      indent = 0,
      color = [0, 0, 0],
    } = opts

    pdf.setFont(FONT, fontStyle)
    pdf.setFontSize(fontSize)
    pdf.setTextColor(...color)

    const x = MARGIN_LEFT + indent
    const maxWidth = CONTENT_W - indent

    const lines = pdf.splitTextToSize(text, maxWidth)
    const lh = ptToMm(fontSize) * LINE_HEIGHT

    lines.forEach((line, i) => {
      checkPageBreak(lh)
      const isLastLine = i === lines.length - 1
      const useAlign = (align === 'justify' && isLastLine) ? 'left' : align
      pdf.text(line, x, y, { align: useAlign, maxWidth })
      y += lh
    })
  }

  function writeWrappedText(text, opts = {}) {
    if (!text.trim()) return
    const paragraphs = text.split(/\n\n+/)
    paragraphs.forEach((para, pi) => {
      const trimmed = para.trim().replace(/\n/g, ' ')
      if (!trimmed) return
      if (pi > 0) y += lineHeightMm() * 0.3  // small gap between paragraphs
      writeLine(trimmed, { ...opts, indent: PARA_INDENT })
    })
  }

  function skipLines(n = 1) {
    y += lineHeightMm() * n
  }

  // ── COVER PAGE ───────────────────────────────────────────────────────────
  // No page number on cover

  pdf.setFont(FONT, 'bold')
  pdf.setFontSize(12)

  const centerX = PAGE_W / 2

  // Institution
  if (info.institution) {
    pdf.setFont(FONT, 'bold')
    pdf.setFontSize(12)
    const instLines = pdf.splitTextToSize(info.institution.toUpperCase(), CONTENT_W)
    instLines.forEach(line => {
      pdf.text(line, centerX, y, { align: 'center' })
      y += ptToMm(12) * LINE_HEIGHT
    })
    skipLines(0.5)
  }

  // Course
  if (info.course) {
    pdf.setFont(FONT, 'normal')
    const courseLines = pdf.splitTextToSize(info.course, CONTENT_W)
    courseLines.forEach(line => {
      pdf.text(line, centerX, y, { align: 'center' })
      y += ptToMm(12) * LINE_HEIGHT
    })
  }

  // Title (centered, middle of page)
  const titleY = PAGE_H / 2 - 20
  y = Math.max(y + 30, titleY)

  if (info.title) {
    pdf.setFont(FONT, 'bold')
    pdf.setFontSize(14)
    const titleLines = pdf.splitTextToSize(info.title.toUpperCase(), CONTENT_W)
    titleLines.forEach(line => {
      pdf.text(line, centerX, y, { align: 'center' })
      y += ptToMm(14) * LINE_HEIGHT
    })
  }

  if (info.subtitle) {
    skipLines(0.5)
    pdf.setFont(FONT, 'normal')
    pdf.setFontSize(12)
    const subLines = pdf.splitTextToSize(info.subtitle, CONTENT_W)
    subLines.forEach(line => {
      pdf.text(line, centerX, y, { align: 'center' })
      y += ptToMm(12) * LINE_HEIGHT
    })
  }

  // Author (bottom area)
  y = PAGE_H - MARGIN_BOTTOM - 50
  if (info.author) {
    pdf.setFont(FONT, 'normal')
    pdf.setFontSize(12)
    const authorLines = pdf.splitTextToSize(info.author, CONTENT_W)
    authorLines.forEach(line => {
      pdf.text(line, centerX, y, { align: 'center' })
      y += ptToMm(12) * LINE_HEIGHT
    })
  }

  if (info.professor) {
    skipLines(0.5)
    pdf.setFont(FONT, 'normal')
    const profLines = pdf.splitTextToSize(info.professor, CONTENT_W)
    profLines.forEach(line => {
      pdf.text(line, centerX, y, { align: 'center' })
      y += ptToMm(12) * LINE_HEIGHT
    })
  }

  // City and year
  y = PAGE_H - MARGIN_BOTTOM - 10
  const cityYear = [info.city, info.year].filter(Boolean).join(', ')
  if (cityYear) {
    pdf.setFont(FONT, 'normal')
    pdf.setFontSize(12)
    pdf.text(cityYear, centerX, y, { align: 'center' })
  }

  // ── CONTENT PAGES ────────────────────────────────────────────────────────
  newPage()

  const sectionNumbers = buildSectionNumbers(sections)

  // Track total figure count for numbering
  let figureCounter = 0

  sections.forEach((section) => {
    const num = sectionNumbers[section.id]

    // Title spacing before
    if (section.level === 1) {
      checkPageBreak(20)
      skipLines(1)
    } else {
      checkPageBreak(12)
      skipLines(0.5)
    }

    // Section title formatting per ABNT
    let titleText = `${num} ${section.title || 'Sem título'}`
    if (section.level === 1) {
      titleText = titleText.toUpperCase()
      writeLine(titleText, { fontStyle: 'bold', fontSize: 12, align: 'left', indent: 0 })
    } else if (section.level === 2) {
      writeLine(titleText, { fontStyle: 'bold', fontSize: 12, align: 'left', indent: 0 })
    } else {
      writeLine(titleText, { fontStyle: 'bolditalic', fontSize: 12, align: 'left', indent: 0 })
    }

    skipLines(0.5)

    // Body text
    if (section.content.trim()) {
      writeWrappedText(section.content, { fontSize: 12, fontStyle: 'normal', align: 'justify' })
      skipLines(0.5)
    }

    // Images
    section.images.forEach((img) => {
      figureCounter++
      const figNum = figureCounter

      // Estimate image display dimensions (max 120mm wide, proportional)
      const maxImgW = CONTENT_W
      const maxImgH = 100

      // Load image to get natural dimensions
      checkPageBreak(maxImgH + 20)

      // Center image
      const imgX = MARGIN_LEFT

      skipLines(0.5)

      // Add image
      try {
        // Determine format from dataUrl
        const format = img.dataUrl.includes('image/png') ? 'PNG'
          : img.dataUrl.includes('image/webp') ? 'WEBP'
          : 'JPEG'

        pdf.addImage(img.dataUrl, format, imgX, y, maxImgW, maxImgH, undefined, 'FAST')
        y += maxImgH + 4
      } catch (e) {
        console.warn('Could not add image:', e)
      }

      // Caption below image (ABNT: centered, font size 10)
      const captionText = img.caption
        ? `Figura ${figNum} – ${img.caption}`
        : `Figura ${figNum}`

      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(10)
      const capLines = pdf.splitTextToSize(captionText, CONTENT_W)
      capLines.forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(10) * LINE_HEIGHT
      })

      if (img.source) {
        pdf.setFont(FONT, 'normal')
        pdf.setFontSize(10)
        const srcLines = pdf.splitTextToSize(`Fonte: ${img.source}`, CONTENT_W)
        srcLines.forEach(line => {
          pdf.text(line, centerX, y, { align: 'center' })
          y += ptToMm(10) * LINE_HEIGHT
        })
      }

      skipLines(0.5)
    })
  })

  // ── REFERENCES ───────────────────────────────────────────────────────────
  if (references.length > 0) {
    checkPageBreak(30)
    skipLines(1)

    writeLine('REFERÊNCIAS', { fontStyle: 'bold', fontSize: 12, align: 'left', indent: 0 })
    skipLines(1)

    references.forEach((ref) => {
      if (!ref.text.trim()) return
      // ABNT: hanging indent for references (first line normal, subsequent lines indented)
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(12)

      const lines = pdf.splitTextToSize(ref.text.trim(), CONTENT_W)
      const lh = ptToMm(12) * LINE_HEIGHT

      lines.forEach((line, i) => {
        checkPageBreak(lh)
        const xLine = i === 0 ? MARGIN_LEFT : MARGIN_LEFT  // both flush left per ABNT
        pdf.text(line, xLine, y)
        y += lh
      })

      skipLines(1) // one blank line between references (ABNT: single spacing within, double between)
    })
  }

  // Save
  const fileName = (info.title || 'documento').replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().replace(/\s+/g, '_')
  pdf.save(`${fileName}_ABNT.pdf`)
}
