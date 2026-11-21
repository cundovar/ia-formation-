// @vitest-environment node
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { construirePptx } from '@/diaporamas/construirePptx'
import { LICENCE } from '@/diaporamas/theme'
import demo from './demo.json'
import pilote from '@/diaporamas/pilote/automatiser.json'
import galerie from '@/diaporamas/pilote/scenes.json'
import { CATALOGUE } from '@/diaporamas/scenes/valider'
import { planDiaporama } from '@/diaporamas/miseEnPage'

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

describe('construirePptx : scènes animées', () => {
  const mode = (type) => CATALOGUE.scenes.find((sc) => sc.id === type).rendus.pptx
  // Nombre de diapositives attendu : une par entrée, ou une par étape quand le catalogue prévoit « etapes »
  const attendues = (diaporama) => planDiaporama(diaporama).diapositives
    .reduce((n, d) => n + (d.scene && mode(d.scene.type) === 'etapes' ? d.scene.etapes.length : 1), 0)

  it('donne la vue fixe ou une diapositive par étape selon le catalogue', async () => {
    const pptx = await construirePptx(galerie, { PptxGenJS: PresentationFactice })
    expect(pptx.diapositives).toHaveLength(attendues(galerie))
    expect(pptx.diapositives.length).toBeGreaterThan(galerie.diapositives.length)

    // Chaîne de traitement (étapes) : « Étape n/N » en tête des notes, notes d'origine gardées
    const chaine = pptx.diapositives.filter((slide) => slide.textes[0].contenu === 'Une fiche traverse trois nœuds')
    expect(chaine.length).toBeGreaterThan(1)
    chaine.forEach((slide, i) => {
      expect(slide.notes).toMatch(new RegExp(`^Étape ${i + 1}/${chaine.length} : `))
      expect(slide.notes).toContain('Source : cours publié 2')
    })
    // Escalier (fixe) : une diapositive, description et légendes numérotées dans les notes
    const escalier = pptx.diapositives.filter((slide) => slide.textes[0].contenu === 'Une progression en cinq modules')
    expect(escalier).toHaveLength(1)
    expect(escalier[0].notes).toContain('Scène « escalier »')
    expect(escalier[0].notes).toContain('1. Marche 1 sur 5')
  })

  it('dessine des formes modifiables : arrondis, trapèze, flèches, pointillés, atténuation', async () => {
    const pptx = await construirePptx(galerie, { PptxGenJS: PresentationFactice })
    const formes = pptx.diapositives.flatMap((slide) => slide.formes)
    const lignes = formes.filter((f) => f.forme === 'line')
    expect(lignes.length).toBeGreaterThan(0)
    expect(lignes.some((l) => l.opts.line.endArrowType === 'triangle')).toBe(true)
    expect(lignes.some((l) => l.opts.line.dashType === 'dash')).toBe(true)
    lignes.forEach((l) => {
      expect(l.opts.w).toBeGreaterThan(0)
      expect(l.opts.h).toBeGreaterThan(0)
    })
    expect(formes.find((f) => f.forme === 'trapezoid')?.opts.flipV).toBe(true)
    expect(formes.filter((f) => f.forme === 'roundRect').every((f) => f.opts.rectRadius > 0)).toBe(true)
    expect(formes.some((f) => f.opts.fill?.transparency > 0)).toBe(true)
    // Les textes atténués restent lisibles (gris foncé, pas de transparence sur le texte)
    const textes = pptx.diapositives.flatMap((slide) => slide.textes.slice(1))
    expect(textes.some((t) => t.opts.color === '5A6170')).toBe(true)
    // Légende projetée courte sous chaque schéma
    expect(textes.some((t) => t.contenu[0]?.text?.startsWith('Vue d\'ensemble : '))).toBe(true)
    expect(textes.some((t) => /^1\/\d+ · /.test(t.contenu[0]?.text ?? ''))).toBe(true)
  })

  it('garde des fonds clairs sur les scènes et le thème Atelier visuel', async () => {
    const pptx = await construirePptx(galerie, { PptxGenJS: PresentationFactice })
    const luminance = (hex) => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const fonds = pptx.diapositives.flatMap((slide) => slide.formes.filter((f) => f.opts.fill).map((f) => f.opts.fill.color))
    for (const fond of fonds) expect(luminance(fond), fond).toBeGreaterThan(0.55)
  })

  it('produit un vrai fichier PowerPoint pour le pilote et la galerie', async () => {
    for (const diaporama of [pilote, galerie]) {
      const pptx = await construirePptx(diaporama)
      const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }))
      const diapos = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      expect(diapos).toHaveLength(attendues(diaporama))
      const xml = (await Promise.all(diapos.map((f) => zip.file(f).async('string')))).join('')
      expect(xml).toContain('prst="line"')
      expect(xml).toContain('<a:tailEnd type="triangle"')
      if (diaporama === galerie) {
        expect(xml).toContain('prst="trapezoid"')
        expect(xml).toContain('prstDash val="dash"')
      }
    }
  })
})
