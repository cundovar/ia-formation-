// @vitest-environment node
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { construirePptx } from '@/diaporamas/construirePptx'
import { LICENCE } from '@/diaporamas/theme'
import demo from './demo.json'

// Petite image PNG de 1 × 1 pixel
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const IMAGES = { 42: { data: PNG, largeur: 1, hauteur: 1, alt: 'Conversation fictive' } }

// Remplace PptxGenJS et note chaque appel
class PresentationFactice {
  constructor() {
    this.maitres = []
    this.diapositives = []
  }

  defineSlideMaster(maitre) {
    this.maitres.push(maitre)
  }

  addSlide(options) {
    const slide = { options, textes: [], formes: [], images: [], notes: null }
    slide.addText = (contenu, opts) => slide.textes.push({ contenu, opts })
    slide.addShape = (forme, opts) => slide.formes.push({ forme, opts })
    slide.addImage = (opts) => slide.images.push(opts)
    slide.addNotes = (notes) => { slide.notes = notes }
    this.diapositives.push(slide)
    return slide
  }
}

describe('construirePptx', () => {
  it('construit une diapositive par entrée, titre dans l\'emplacement prévu', async () => {
    const pptx = await construirePptx(demo, { images: IMAGES, PptxGenJS: PresentationFactice })

    expect(pptx.layout).toBe('LAYOUT_WIDE')
    expect(pptx.subject).toBe(LICENCE)
    expect(pptx.maitres.map((m) => m.title)).toEqual(['COUVERTURE', 'CONTENU'])
    expect(pptx.diapositives).toHaveLength(demo.diapositives.length)
    expect(pptx.diapositives[0].options.masterName).toBe('COUVERTURE')
    for (const slide of pptx.diapositives) {
      expect(slide.textes[0].opts).toEqual({ placeholder: 'titre' })
      expect(slide.textes[0].contenu).not.toBe('')
    }
  })

  it('écrit les notes et le texte alternatif des captures', async () => {
    const pptx = await construirePptx(demo, { images: IMAGES, PptxGenJS: PresentationFactice })
    const avecNotes = pptx.diapositives.filter((slide) => slide.notes)
    expect(avecNotes).toHaveLength(demo.diapositives.filter((d) => d.notes).length)
    expect(pptx.diapositives.flatMap((slide) => slide.images)).toEqual([expect.objectContaining({ altText: 'Conversation fictive' })])
  })

  it('n\'utilise que des fonds clairs (règle des fonds d\'interface)', async () => {
    const pptx = await construirePptx(demo, { images: IMAGES, PptxGenJS: PresentationFactice })
    const fonds = pptx.diapositives.flatMap((slide) => slide.formes.map((f) => f.opts.fill.color))
    const luminance = (hex) => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    for (const fond of fonds) expect(luminance(fond), fond).toBeGreaterThan(0.55)
  })

  it('produit un vrai fichier PowerPoint', async () => {
    const pptx = await construirePptx(demo, { images: IMAGES })
    const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }))
    const fichiers = Object.keys(zip.files)

    expect(fichiers.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(demo.diapositives.length)
    expect(await zip.file('docProps/core.xml').async('string')).toContain('CC BY-SA 4.0')
    const notes = await Promise.all(fichiers.filter((f) => /^ppt\/notesSlides\/.+\.xml$/.test(f)).map((f) => zip.file(f).async('string')))
    expect(notes.join('')).toContain('La bonne réponse est la deuxième')
    const diapo2 = await zip.file('ppt/slides/slide2.xml').async('string')
    expect(diapo2).toContain('type="title"')
    expect(diapo2).toContain('Ce que vous saurez faire')
  })
})
