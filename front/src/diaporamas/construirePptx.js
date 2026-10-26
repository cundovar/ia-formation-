// Construction du fichier .pptx dans le navigateur (docs/PLAN_DIAPORAMAS.md § 7).
// PptxGenJS n'est chargé qu'au moment de la construction, pour garder les pages légères.
import { nomFichier, planDiaporama } from './miseEnPage'
import { COULEURS, ESPACE_PARAGRAPHE, LICENCE, POLICE, TAILLES, ZONES, couleursPublic } from './theme'

const PUCES = {
  point: { indent: 24 },
  coche: { characterCode: '2713', indent: 30 },
}

const SANS_TRAIT = { type: 'none' }

const definirMaitres = (pptx, plan, site) => {
  const couleurs = couleursPublic(plan.audience)
  const titre = {
    name: 'titre',
    type: 'title',
    fontFace: POLICE,
    bold: true,
    color: couleurs.fonce,
    align: 'left',
    margin: 0,
  }

  pptx.defineSlideMaster({
    title: 'COUVERTURE',
    background: { color: couleurs.pastel },
    objects: [
      { placeholder: { options: { ...titre, x: 0.9, y: 1.6, w: 9.6, h: 2.1, fontSize: TAILLES.titreCouverture, valign: 'bottom' }, text: '' } },
      { text: { text: site, options: { x: 0.9, y: 6.7, w: 8, h: 0.4, fontFace: POLICE, fontSize: TAILLES.repere, color: COULEURS.texteDoux, margin: 0 } } },
    ],
  })

  pptx.defineSlideMaster({
    title: 'CONTENU',
    background: { color: COULEURS.fond },
    objects: [
      { rect: { ...ZONES.bandeau, fill: { color: couleurs.accent }, line: SANS_TRAIT } },
      { rect: { ...ZONES.trait, fill: { color: couleurs.trait }, line: SANS_TRAIT } },
      { rect: { ...ZONES.filet, fill: { color: COULEURS.bordure }, line: SANS_TRAIT } },
      { text: { text: plan.titre, options: { ...ZONES.pied, fontFace: POLICE, fontSize: TAILLES.repere, color: COULEURS.texteDoux, margin: 0, valign: 'middle' } } },
      { placeholder: { options: { ...titre, ...ZONES.titre, fontSize: TAILLES.titre, valign: 'middle' }, text: '' } },
    ],
    slideNumber: { ...ZONES.numero, fontFace: POLICE, fontSize: TAILLES.repere, color: COULEURS.texteDoux, align: 'right' },
  })
}

const ajouterElement = (slide, element) => {
  const position = { x: element.x, y: element.y, w: element.w, h: element.h }
  if (element.type === 'forme') {
    slide.addShape(element.forme, {
      ...position,
      fill: { color: element.fond },
      line: element.bordure ? { color: element.bordure, width: 1 } : SANS_TRAIT,
      ...(element.forme === 'roundRect' ? { rectRadius: 0.3 } : {}),
    })
  } else if (element.type === 'image') {
    slide.addImage({ ...position, data: element.data, altText: element.alt })
  } else if (element.type === 'texte') {
    const dernier = element.paragraphes.length - 1
    slide.addText(element.paragraphes.map((p, index) => ({
      text: p.texte,
      options: {
        breakLine: index < dernier,
        ...(p.puce ? { bullet: PUCES[p.puce] } : {}),
        ...(p.lien ? { hyperlink: { url: p.lien } } : {}),
      },
    })), {
      ...position,
      fontFace: POLICE,
      fontSize: element.taille,
      bold: element.gras,
      color: element.couleur,
      align: element.align,
      valign: element.valign,
      margin: 0,
      paraSpaceAfter: element.paragraphes.length > 1 ? ESPACE_PARAGRAPHE : 0,
    })
  }
}

/**
 * Construit la présentation ; l'appelant l'enregistre (writeFile) ou la lit (write).
 * @param {object} diaporama contenu structuré
 * @param {{ images?: object, site?: string, PptxGenJS?: Function }} options `PptxGenJS` sert aux tests
 */
export const construirePptx = async (diaporama, { images = {}, site = 'Formation IA', PptxGenJS } = {}) => {
  const Presentation = PptxGenJS ?? (await import('pptxgenjs')).default
  const plan = planDiaporama(diaporama, { images })
  const pptx = new Presentation()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = plan.titre
  pptx.subject = LICENCE
  pptx.author = site
  pptx.company = site
  pptx.theme = { headFontFace: POLICE, bodyFontFace: POLICE }
  definirMaitres(pptx, plan, site)

  for (const diapositive of plan.diapositives) {
    const slide = pptx.addSlide({ masterName: diapositive.maitre })
    slide.addText(diapositive.titre, { placeholder: 'titre' })
    diapositive.elements.forEach((element) => ajouterElement(slide, element))
    if (diapositive.notes) slide.addNotes(diapositive.notes)
  }
  return pptx
}

export const telechargerPptx = async (diaporama, options = {}) => {
  const pptx = await construirePptx(diaporama, options)
  await pptx.writeFile({ fileName: nomFichier(pptx.title) })
}
