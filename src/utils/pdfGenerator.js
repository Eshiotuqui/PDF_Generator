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
    return { w: box, h: box / ratio }
  } else {
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

const FONT_SIZE_BODY = 12
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
    if (s.numbered === false) {
      numbers[s.id] = null
      return
    }
    const lvl = s.level - 1
    counters[lvl]++
    for (let i = lvl + 1; i < 3; i++) counters[i] = 0
    numbers[s.id] = counters.slice(0, s.level).join('.')
  })
  return numbers
}

export async function generatePDF(doc, { preview = false } = {}) {
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
      const authors = info.author.split('\n').map(a => a.trim()).filter(Boolean)
      authors.forEach(author => {
        pdf.text(author, centerX, y, { align: 'center' })
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

    pageNum = 0  // Reset so first content page starts at 1
    newPage()
  }

  // ── TABLE OF CONTENTS (SUMÁRIO) ─────────────────────────────────────────
  const sectionNumbers = buildSectionNumbers(sections)
  const numberedSections = sections.filter(s => s.numbered !== false)
  const includeTOC = info.includeTOC && numberedSections.length > 0

  // PDF page indices where TOC placeholder pages were created
  const tocPdfPages = []
  let tocPageCount = 0

  if (includeTOC) {
    // Estimate how many pages the TOC needs
    const lh = lineHeightMm()
    const tocTitleSpace = lh * 3 // title + spacing
    const tocAvailableH = (PAGE_H - MARGIN_TOP - MARGIN_BOTTOM) - tocTitleSpace
    const entriesPerPage = Math.floor(tocAvailableH / lh)
    tocPageCount = Math.ceil(numberedSections.length / entriesPerPage) || 1

    // If no cover, the first PDF page is the TOC page — add page number
    if (!info.includeCover) {
      pageNum = 1
      addPageNumber()
    }

    // Record current page as first TOC placeholder
    tocPdfPages.push(pdf.internal.getNumberOfPages())

    // Add extra TOC pages if needed
    for (let i = 1; i < tocPageCount; i++) {
      newPage()
      tocPdfPages.push(pdf.internal.getNumberOfPages())
    }

    // Move to next page for content
    newPage()
  }

  // ── CONTENT PAGES ────────────────────────────────────────────────────────
  if (!info.includeCover && !includeTOC) {
    // First page already exists, just add page number
    pageNum = 1
    addPageNumber()
  }

  // Track which display page each numbered section starts on
  const sectionPageMap = {}

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

    // Record page number for TOC (only numbered sections)
    if (num != null) {
      sectionPageMap[section.id] = pageNum
    }

    // Section title formatting per ABNT
    let titleText = num ? `${num} ${section.title || 'Sem título'}` : (section.title || 'Sem título')
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
            checkPageBreak: (needed, currentY) => {
              y = currentY // sync outer y with inner y
              checkPageBreak(needed)
              return y // return updated y (may have been reset by newPage)
            },
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
  let referencesPage = null
  if (references.length > 0) {
    checkPageBreak(30)
    skipLines(1)

    referencesPage = pageNum

    writeLine('REFERÊNCIAS', { fontStyle: 'bold', fontSize: 12, align: 'left', indent: 0 })
    skipLines(1)

    references.forEach((ref) => {
      if (!ref.text.trim()) return
      pdf.setFont(FONT, 'normal')
      pdf.setFontSize(12)

      const lines = pdf.splitTextToSize(ref.text.trim(), CONTENT_W)
      const lh = ptToMm(12) * LINE_HEIGHT

      lines.forEach((line) => {
        checkPageBreak(lh)
        pdf.text(line, MARGIN_LEFT, y)
        y += lh
      })

      skipLines(1)
    })
  }

  // ── FILL TOC PAGES ───────────────────────────────────────────────────────
  if (includeTOC && tocPdfPages.length > 0) {
    const lh = lineHeightMm()
    let tocY = MARGIN_TOP
    let tocPageIdx = 0

    pdf.setPage(tocPdfPages[tocPageIdx])

    // Title: SUMÁRIO (centered, bold, uppercase — ABNT)
    pdf.setFont(FONT, 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(0, 0, 0)
    pdf.text('SUMÁRIO', centerX, tocY, { align: 'center' })
    tocY += lh * 2

    for (const section of numberedSections) {
      // Check if we need to go to next TOC page
      if (tocY + lh > PAGE_H - MARGIN_BOTTOM) {
        tocPageIdx++
        if (tocPageIdx < tocPdfPages.length) {
          pdf.setPage(tocPdfPages[tocPageIdx])
          tocY = MARGIN_TOP
        }
      }

      const num = sectionNumbers[section.id]
      const title = section.title || 'Sem título'
      const pg = sectionPageMap[section.id] || '?'
      const indent = (section.level - 1) * 10

      // Style per level
      if (section.level === 1) {
        pdf.setFont(FONT, 'bold')
      } else {
        pdf.setFont(FONT, 'normal')
      }
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)

      let entryText = `${num} ${title}`
      if (section.level === 1) entryText = entryText.toUpperCase()

      const textX = MARGIN_LEFT + indent
      const pageNumStr = String(pg)

      // Measure widths
      const entryW = pdf.getStringUnitWidth(entryText) * 12 * ptToMm(1)
      const pageNumW = pdf.getStringUnitWidth(pageNumStr) * 12 * ptToMm(1)
      const dotsStart = textX + entryW + 2
      const dotsEnd = PAGE_W - MARGIN_RIGHT - pageNumW - 2

      // Draw entry text
      pdf.text(entryText, textX, tocY)

      // Draw leader dots
      if (dotsEnd > dotsStart + 4) {
        pdf.setFont(FONT, 'normal')
        const dotChar = '.'
        const dotW = pdf.getStringUnitWidth(dotChar + ' ') * 12 * ptToMm(1)
        let dx = dotsStart
        while (dx < dotsEnd) {
          pdf.text('.', dx, tocY)
          dx += dotW
        }
      }

      // Draw page number (right-aligned)
      pdf.setFont(FONT, 'normal')
      pdf.text(pageNumStr, PAGE_W - MARGIN_RIGHT, tocY, { align: 'right' })

      tocY += lh
    }

    // Also add REFERÊNCIAS to TOC if references exist
    if (referencesPage != null) {
      if (tocY + lh > PAGE_H - MARGIN_BOTTOM) {
        tocPageIdx++
        if (tocPageIdx < tocPdfPages.length) {
          pdf.setPage(tocPdfPages[tocPageIdx])
          tocY = MARGIN_TOP
        }
      }

      pdf.setFont(FONT, 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)

      const refText = 'REFERÊNCIAS'
      const refPage = String(referencesPage)
      const entryW = pdf.getStringUnitWidth(refText) * 12 * ptToMm(1)
      const pageNumW = pdf.getStringUnitWidth(refPage) * 12 * ptToMm(1)
      const dotsStart = MARGIN_LEFT + entryW + 2
      const dotsEnd = PAGE_W - MARGIN_RIGHT - pageNumW - 2

      pdf.text(refText, MARGIN_LEFT, tocY)

      if (dotsEnd > dotsStart + 4) {
        pdf.setFont(FONT, 'normal')
        const dotW = pdf.getStringUnitWidth('. ') * 12 * ptToMm(1)
        let dx = dotsStart
        while (dx < dotsEnd) {
          pdf.text('.', dx, tocY)
          dx += dotW
        }
      }

      pdf.setFont(FONT, 'normal')
      pdf.text(refPage, PAGE_W - MARGIN_RIGHT, tocY, { align: 'right' })
    }
  }

  // Save or preview
  if (preview) {
    const blob = pdf.output('blob')
    return URL.createObjectURL(blob)
  }

  const fileName = (info.title || 'documento').replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().replace(/\s+/g, '_')
  pdf.save(`${fileName}_ABNT.pdf`)
  return null
}
