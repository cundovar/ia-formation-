// Construction du fichier .pptx dans le navigateur (docs/PLAN_DIAPORAMAS.md § 7).
// PptxGenJS n'est chargé qu'au moment de la construction, pour garder les pages légères.
// Une scène animée devient des formes modifiables : sa vue fixe sur une diapositive, ou ses étapes sur des
// diapositives successives quand le catalogue le prévoit (rendus.pptx), faute d'animation native fiable.
import { maitres, nomFichier, planDiaporama } from './miseEnPage'
import { ESPACE_PARAGRAPHE, LICENCE, POLICE } from './theme'
import { elementsEtape, legendeCourte } from './scenes'
import { sceneDuCatalogue } from './scenes/valider'

const PUCES = {
  point: { indent: 24 },
  coche: { characterCode: '2713', indent: 30 },
}

const SANS_TRAIT = { type: 'none' }

const position = (element) => ({ x: element.x, y: element.y, w: element.w, h: element.h })

// Élément atténué (branche non suivie, élément écarté) : couleurs adoucies, comme sur le site
const ATTENUATION = 45
const TEXTE_ATTENUE = '5A6170'

// Rayon d'angle en pouces ; 0 donne une pastille (comme sur le site), sans rayon l'ancien arrondi standard
const rayonPptx = (element) => {
  if (element.rayon === undefined || element.rayon === null) return 0.3
  return element.rayon > 0 ? element.rayon : Math.min(element.w, element.h) / 2
}

const NOMS_FORMES = { trapeze: 'trapezoid' }

const optionsForme = (element) => ({
  ...position(element),
  fill: { color: element.fond, ...(element.attenue ? { transparency: ATTENUATION } : {}) },
  line: element.bordure
    ? {
        color: element.bordure,
        width: element.epaisseur ?? 1,
        ...(element.pointille ? { dashType: 'dash' } : {}),
        ...(element.attenue ? { transparency: ATTENUATION } : {}),
      }
    : SANS_TRAIT,
  ...(element.forme === 'roundRect' ? { rectRadius: rayonPptx(element) } : {}),
  ...(element.rotation ? { rotate: element.rotation } : {}),
  // Le trapèze de PowerPoint a son petit côté en haut : le site dessine un entonnoir, large en haut
  ...(element.forme === 'trapeze' ? { flipV: true } : {}),
})

// Liaison (flèche) : un trait dans le rectangle de ses extrémités, retourné selon la direction
const optionsLigne = (element) => ({
  x: Math.min(element.x1, element.x2),
  y: Math.min(element.y1, element.y2),
  w: Math.max(Math.abs(element.x2 - element.x1), 0.001),
  h: Math.max(Math.abs(element.y2 - element.y1), 0.001),
  ...(element.x2 < element.x1 ? { flipH: true } : {}),
  ...(element.y2 < element.y1 ? { flipV: true } : {}),
  line: {
    color: element.couleur,
    width: element.epaisseur ?? 2,
    ...(element.pointille ? { dashType: 'dash' } : {}),
    ...(element.fleche ? { endArrowType: 'triangle' } : {}),
    ...(element.attenue ? { transparency: ATTENUATION } : {}),
  },
})

const optionsTexte = (element) => ({
  ...position(element),
  fontFace: POLICE,
  fontSize: element.taille,
  bold: element.gras,
  color: element.attenue ? TEXTE_ATTENUE : element.couleur,
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
  if (element.type === 'forme') slide.addShape(NOMS_FORMES[element.forme] ?? element.forme, optionsForme(element))
  else if (element.type === 'ligne') slide.addShape('line', optionsLigne(element))
  else if (element.type === 'image') slide.addImage({ ...position(element), data: element.data, altText: element.alt })
  else if (element.type === 'texte') slide.addText(paragraphes(element), optionsTexte(element))
}

// Légende projetée sous le schéma, au même endroit et dans le même style que sur le site
const elementLegende = (scene, etape, couleur) => ({
  type: 'texte',
  ...scene.legende,
  paragraphes: [{ texte: legendeCourte(scene, etape), puce: null, lien: null }],
  taille: 24,
  gras: false,
  couleur,
  align: 'left',
  valign: 'middle',
})

const joindre = (...blocs) => blocs.filter(Boolean).join('\n\n')

/**
 * Diapositives produites par une entrée du plan : une seule sans scène ; avec une scène, la vue fixe et ses
 * légendes numérotées dans les notes, ou une diapositive par étape (« Étape n/N » en tête des notes).
 */
export const vuesDiapositive = (diapositive, couleur = '353B49') => {
  const { scene } = diapositive
  if (!scene) return [{ elements: [], notes: diapositive.notes }]
  const mode = sceneDuCatalogue(scene.type)?.rendus?.pptx ?? 'fixe'
  const scenePourNotes = joindre(`Scène « ${scene.type} » : ${scene.description}`, scene.fixe.legendes.join('\n'))
  if (mode === 'etapes') {
    return scene.etapes.map((etape, i) => ({
      elements: [...elementsEtape(scene, i), ...(scene.legende ? [elementLegende(scene, i, couleur)] : [])],
      notes: joindre(`Étape ${i + 1}/${scene.etapes.length} : ${etape.legende}`, diapositive.notes, i === 0 ? scenePourNotes : ''),
    }))
  }
  return [{
    elements: [...elementsEtape(scene, -1), ...(scene.legende ? [elementLegende(scene, -1, couleur)] : [])],
    notes: joindre(diapositive.notes, scenePourNotes),
  }]
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
    for (const vue of vuesDiapositive(diapositive)) {
      const slide = pptx.addSlide({ masterName: diapositive.maitre })
      slide.addText(diapositive.titre, { placeholder: 'titre' })
      diapositive.elements.forEach((element) => ajouterElement(slide, element))
      vue.elements.forEach((element) => ajouterElement(slide, element))
      if (vue.notes) slide.addNotes(vue.notes)
    }
  }
  return pptx
}

export const telechargerPptx = async (diaporama, options = {}) => {
  const pptx = await construirePptx(diaporama, options)
  await pptx.writeFile({ fileName: nomFichier(pptx.title) })
}
