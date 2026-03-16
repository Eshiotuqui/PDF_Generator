import jsPDF from 'jspdf'
import { parseHtml, renderHtmlBlocks } from './htmlToPdf'

// Tamanho do quadrado padrão para imagens (mm)
const IMG_BOX = 80

function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 1, h: 1 })
    img.src = dataUrl
  })
}

// Calcula largura e altura para caber proporcionalmente dentro de um quadrado
function fitInBox(natW, natH, box) {
  const ratio = natW / natH
  if (ratio >= 1) {
    // Paisagem ou quadrado: limitar pela largura
    return { w: box, h: box / ratio }
  } else {
    // Retrato: limitar pela altura
    return { w: box * ratio, h: box }
  }
}

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


  function skipLines(n = 1) {
    y += lineHeightMm() * n
  }

  const centerX = PAGE_W / 2

  // ── COVER PAGE ───────────────────────────────────────────────────────────
  if (info.includeCover) {
    pdf.setFont(FONT, 'bold')
    pdf.setFontSize(12)

    if (info.institution) {
      const instLines = pdf.splitTextToSize(info.institution.toUpperCase(), CONTENT_W)
      instLines.forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(12) * LINE_HEIGHT
      })
      skipLines(0.5)
    }

    if (info.course) {
      pdf.setFont(FONT, 'normal')
      pdf.splitTextToSize(info.course, CONTENT_W).forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(12) * LINE_HEIGHT
      })
    }

    const titleY = PAGE_H / 2 - 20
    y = Math.max(y + 30, titleY)

    if (info.title) {
      pdf.setFont(FONT, 'bold')
      pdf.setFontSize(14)
      pdf.splitTextToSize(info.title.toUpperCase(), CONTENT_W).forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(14) * LINE_HEIGHT
      })
    }

    if (info.subtitle) {
      skipLines(0.5)
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(12)
      pdf.splitTextToSize(info.subtitle, CONTENT_W).forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(12) * LINE_HEIGHT
      })
    }

    y = PAGE_H - MARGIN_BOTTOM - 50
    if (info.author) {
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(12)
      pdf.splitTextToSize(info.author, CONTENT_W).forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(12) * LINE_HEIGHT
      })
    }

    if (info.professor) {
      skipLines(0.5)
      pdf.setFont(FONT, 'normal')
      pdf.splitTextToSize(info.professor, CONTENT_W).forEach(line => {
        pdf.text(line, centerX, y, { align: 'center' })
        y += ptToMm(12) * LINE_HEIGHT
      })
    }

    y = PAGE_H - MARGIN_BOTTOM - 10
    const cityYear = [info.city, info.year].filter(Boolean).join(', ')
    if (cityYear) {
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(12)
      pdf.text(cityYear, centerX, y, { align: 'center' })
    }

    newPage()
  }

  // ── CONTENT PAGES ────────────────────────────────────────────────────────
  if (!info.includeCover) {
    // First page already exists, just add page number
    addPageNumber()
  }

  const sectionNumbers = buildSectionNumbers(sections)

  // Track total figure count for numbering
  let figureCounter = 0

  for (const section of sections) {
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

    // Render blocks in order (text and image blocks interleaved)
    for (const block of section.blocks) {
      if (block.type === 'text') {
        const htmlBlocks = parseHtml(block.content)
        if (htmlBlocks.length > 0) {
          y = renderHtmlBlocks(pdf, htmlBlocks, {
            x: MARGIN_LEFT,
            y,
            maxWidth: CONTENT_W,
            fontSize: FONT_SIZE_BODY,
            font: FONT,
            lineHeightFactor: LINE_HEIGHT,
            paraIndent: PARA_INDENT,
            checkPageBreak: (needed) => checkPageBreak(needed),
          })
          skipLines(0.3)
        }
      }

      if (block.type === 'image' && block.dataUrl) {
        figureCounter++
        const figNum = figureCounter

        const { w: natW, h: natH } = await getImageDimensions(block.dataUrl)
        const { w: imgW, h: imgH } = fitInBox(natW, natH, IMG_BOX)
        const imgX = MARGIN_LEFT + (CONTENT_W - imgW) / 2

        checkPageBreak(imgH + 20)
        skipLines(0.5)

        try {
          const format = block.dataUrl.includes('image/png') ? 'PNG'
            : block.dataUrl.includes('image/webp') ? 'WEBP'
            : 'JPEG'
          pdf.addImage(block.dataUrl, format, imgX, y, imgW, imgH, undefined, 'FAST')
          y += imgH + 4
        } catch (e) {
          console.warn('Could not add image:', e)
        }

        // Caption (ABNT: abaixo da figura, centralizada, fonte 10)
        const captionText = block.caption
          ? `Figura ${figNum} – ${block.caption}`
          : `Figura ${figNum}`

        pdf.setFont(FONT, 'normal')
        pdf.setFontSize(10)
        pdf.splitTextToSize(captionText, CONTENT_W).forEach(line => {
          pdf.text(line, centerX, y, { align: 'center' })
          y += ptToMm(10) * LINE_HEIGHT
        })

        if (block.source) {
          pdf.splitTextToSize(`Fonte: ${block.source}`, CONTENT_W).forEach(line => {
            pdf.text(line, centerX, y, { align: 'center' })
            y += ptToMm(10) * LINE_HEIGHT
          })
        }

        skipLines(0.5)
      }
    }
  }

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
