// HTML → jsPDF renderer
// Supports: bold, italic, underline (visual only), color, ul, ol, paragraphs

const PT_TO_MM = 0.3528 // 1pt = 0.3528mm

// ── Color parsing ─────────────────────────────────────────────────────────────

function parseCssColor(str) {
  if (!str) return null
  str = str.trim()
  const rgb = str.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  if (str.startsWith('#')) {
    let h = str.slice(1)
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
  }
  return null
}

// ── HTML → Blocks ─────────────────────────────────────────────────────────────
// Block: { type: 'p'|'ul'|'ol', olIndex?: number, runs: Run[] }
// Run:   { text: string, bold: boolean, italic: boolean, color: [r,g,b]|null }

export function parseHtml(html) {
  if (!html || !html.trim()) return []

  const dom = new DOMParser().parseFromString(html, 'text/html')
  const body = dom.body
  const blocks = []
  const BASE = { bold: false, italic: false, color: null }

  function extractRuns(node, s) {
    const runs = []
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        if (child.textContent) runs.push({ ...s, text: child.textContent })
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase()
        const ns = { ...s }
        if (tag === 'b' || tag === 'strong') ns.bold = true
        if (tag === 'i' || tag === 'em') ns.italic = true
        if (tag === 'font') {
          const c = child.getAttribute('color')
          if (c) ns.color = parseCssColor(c)
        }
        if (tag === 'span') {
          if (child.style.color) ns.color = parseCssColor(child.style.color)
          if (child.style.fontWeight === 'bold') ns.bold = true
          if (child.style.fontStyle === 'italic') ns.italic = true
        }
        if (tag === 'br') { runs.push({ ...ns, text: '\n' }); continue }
        runs.push(...extractRuns(child, ns))
      }
    }
    return runs
  }

  function pushParagraph(runs) {
    // Split runs on '\n' into separate blocks
    let cur = []
    for (const run of runs) {
      if (run.text === '\n') {
        blocks.push({ type: 'p', runs: cur })
        cur = []
      } else {
        cur.push(run)
      }
    }
    blocks.push({ type: 'p', runs: cur })
  }

  function processEl(el) {
    if (el.nodeType !== 1) return
    const tag = el.tagName.toLowerCase()

    if (tag === 'p' || tag === 'div') {
      pushParagraph(extractRuns(el, BASE))
    } else if (tag === 'ul') {
      for (const li of el.querySelectorAll(':scope > li')) {
        blocks.push({ type: 'ul', runs: extractRuns(li, BASE) })
      }
    } else if (tag === 'ol') {
      let i = 0
      for (const li of el.querySelectorAll(':scope > li')) {
        blocks.push({ type: 'ol', olIndex: ++i, runs: extractRuns(li, BASE) })
      }
    } else if (tag === 'br') {
      blocks.push({ type: 'p', runs: [] })
    } else {
      for (const child of el.childNodes) {
        if (child.nodeType === 1) processEl(child)
        else if (child.nodeType === 3 && child.textContent.trim())
          blocks.push({ type: 'p', runs: [{ ...BASE, text: child.textContent }] })
      }
    }
  }

  for (const child of body.childNodes) {
    if (child.nodeType === 1) processEl(child)
    else if (child.nodeType === 3 && child.textContent.trim())
      blocks.push({ type: 'p', runs: [{ ...BASE, text: child.textContent }] })
  }

  // Fallback for plain text without wrapper elements
  if (blocks.length === 0 && body.textContent.trim())
    blocks.push({ type: 'p', runs: [{ ...BASE, text: body.textContent }] })

  return blocks
}

// ── jsPDF Renderer ────────────────────────────────────────────────────────────

function fontStyle(run) {
  if (run.bold && run.italic) return 'bolditalic'
  if (run.bold) return 'bold'
  if (run.italic) return 'italic'
  return 'normal'
}

function wordWidth(pdf, text, fontSize) {
  return pdf.getStringUnitWidth(text) * fontSize * PT_TO_MM
}

/**
 * Render parsed HTML blocks into the PDF.
 * @param {jsPDF} pdf
 * @param {Block[]} blocks  – result of parseHtml()
 * @param {{
 *   x: number,          left margin (mm)
 *   y: number,          current y (mm)
 *   maxWidth: number,   content width (mm)
 *   fontSize?: number,
 *   font?: string,
 *   lineHeightFactor?: number,
 *   paraIndent?: number,  ABNT paragraph indent (mm)
 *   checkPageBreak: (needed: number) => void,
 * }} opts
 * @returns {number} updated y
 */
export function renderHtmlBlocks(pdf, blocks, opts) {
  const {
    x,
    maxWidth,
    fontSize = 12,
    font = 'times',
    lineHeightFactor = 1.5,
    paraIndent = 12.5,
    checkPageBreak,
  } = opts
  let y = opts.y
  const lh = fontSize * PT_TO_MM * lineHeightFactor

  for (const block of blocks) {
    const isP  = block.type === 'p'
    const isUl = block.type === 'ul'
    const isOl = block.type === 'ol'

    // Indentation: ABNT paragraph indent for 'p', list indent for ul/ol
    const blockIndent = isP ? paraIndent : 4
    const prefix = isUl ? '• ' : isOl ? `${block.olIndex}. ` : ''

    let prefixW = 0
    if (prefix) {
      pdf.setFont(font, 'normal')
      pdf.setFontSize(fontSize)
      prefixW = wordWidth(pdf, prefix, fontSize)
    }

    const textX = x + blockIndent + prefixW
    const textMaxW = maxWidth - blockIndent - prefixW

    checkPageBreak(lh)

    // Draw prefix on first line
    if (prefix) {
      pdf.setFont(font, 'normal')
      pdf.setFontSize(fontSize)
      pdf.setTextColor(0, 0, 0)
      pdf.text(prefix, x + blockIndent, y)
    }

    // Empty block (blank line)
    if (block.runs.length === 0) {
      y += lh
      checkPageBreak(lh)
      continue
    }

    // Word-wrap with mixed styles
    // lineSegs: {text, bold, italic, color, width}[]
    let lineSegs = []
    let lineW = 0
    let firstLineOfBlock = true

    const flushLine = () => {
      if (lineSegs.length === 0) { y += lh; checkPageBreak(lh); return }
      let sx = textX
      for (const seg of lineSegs) {
        pdf.setFont(font, fontStyle(seg))
        pdf.setFontSize(fontSize)
        if (seg.color) pdf.setTextColor(...seg.color)
        else pdf.setTextColor(0, 0, 0)
        pdf.text(seg.text, sx, y)
        sx += seg.width
      }
      lineSegs = []
      lineW = 0
      y += lh
      checkPageBreak(lh)
    }

    for (const run of block.runs) {
      if (!run.text) continue
      pdf.setFont(font, fontStyle(run))
      pdf.setFontSize(fontSize)

      // Split preserving spaces as separate tokens
      const tokens = run.text.split(/(\s+)/)

      for (const token of tokens) {
        if (!token) continue
        const tw = wordWidth(pdf, token, fontSize)

        if (lineW + tw > textMaxW && lineW > 0) {
          flushLine()
          firstLineOfBlock = false
          if (!token.trim()) continue // skip leading space on new line
        }

        lineSegs.push({ ...run, text: token, width: tw })
        lineW += tw
      }
    }

    flushLine()
  }

  return y
}
