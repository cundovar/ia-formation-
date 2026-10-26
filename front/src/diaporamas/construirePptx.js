// Construction du fichier .pptx dans le navigateur (docs/PLAN_DIAPORAMAS.md § 7).
// PptxGenJS n'est chargé qu'au moment de la construction, pour garder les pages légères.
import { maitres, nomFichier, planDiaporama } from './miseEnPage'
import { ESPACE_PARAGRAPHE, LICENCE, POLICE } from './theme'

const PUCES = {
  point: { indent: 24 },
  coche: { characterCode: '2713', indent: 30 },
}

const SANS_TRAIT = { type: 'none' }

const position = (element) => ({ x: element.x, y: element.y, w: element.w, h: element.h })

const optionsForme = (element) => ({
  ...position(element),
  fill: { color: element.fond },
  line: element.bordure ? { color: element.bordure, width: 1 } : SANS_TRAIT,
  ...(element.forme === 'roundRect' ? { rectRadius: 0.3 } : {}),
})

const optionsTexte = (element) => ({
  ...position(element),
  fontFace: POLICE,
  fontSize: element.taille,
  bold: element.gras,
  color: element.couleur,
  align: element.align,
  valign: element.valign,
  margin: 0,
  paraSpaceAfter: element.paragraphes.length > 1 ? ESPACE_PARAGRAPHE : 0,
})

const paragraphes = (element) => {
  const dernier = element.paragraphes.length - 1
  return element.paragraphes.map((p, index) => ({
    text: p.texte,
    options: {
      breakLine: index < dernier,
      ...(p.puce ? { bullet: PUCES[p.puce] } : {}),
      ...(p.lien ? { hyperlink: { url: p.lien } } : {}),
    },
  }))
}

const definirMaitres = (pptx, plan, site) => {
  for (const [nom, maitre] of Object.entries(maitres(plan, site))) {
    const { taille, couleur, ...zone } = maitre.titre
    pptx.defineSlideMaster({
      title: nom,
      background: { color: maitre.fond },
      objects: [
        ...maitre.elements.map((element) => (element.type === 'forme'
          ? { [element.forme]: optionsForme(element) }
          : { text: { text: element.paragraphes.map((p) => p.texte).join('\n'), options: optionsTexte(element) } })),
        {
          placeholder: {
            options: { name: 'titre', type: 'title', ...zone, fontFace: POLICE, fontSize: taille, bold: true, color: couleur, align: 'left', margin: 0 },
            text: '',
          },
        },
      ],
      ...(maitre.numero
        ? { slideNumber: { ...position(maitre.numero), fontFace: POLICE, fontSize: maitre.numero.taille, color: maitre.numero.couleur, align: 'right' } }
        : {}),
    })
  }
}

const ajouterElement = (slide, element) => {
  if (element.type === 'forme') slide.addShape(element.forme, optionsForme(element))
  else if (element.type === 'image') slide.addImage({ ...position(element), data: element.data, altText: element.alt })
  else if (element.type === 'texte') slide.addText(paragraphes(element), optionsTexte(element))
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
