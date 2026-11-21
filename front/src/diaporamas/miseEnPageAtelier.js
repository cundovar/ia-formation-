// Mise en page du thème « Atelier visuel », en fonctions pures (mêmes éléments que miseEnPage.js).
// Compositions : ouverture, cours avec schéma (titre en haut, scène au centre, points clés en encadrés
// en bas), cours sans schéma (contenu élargi), activité. Deux formats : `large` (16:9, .pptx) et
// `etroit` (lecture sur mobile, éléments empilés).
import { hauteurTexte } from './mesure'
import { LICENCE } from './theme'
import { COULEURS, COULEURS_SCENE, ESPACE_PARAGRAPHE, FORMATS, RAYONS, TAILLES, ZONES } from './themes/atelierVisuel'
import { planifierScene } from './scenes'
import { COMPOSITIONS_PAR_MODELE, composer } from './compositions'

export const MODELES_AVEC_SCENE = ['notion', 'etapes', 'exercice']

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '')
const liste = (valeur) => (Array.isArray(valeur) ? valeur.map(texte).filter(Boolean) : [])
const lienSur = (url) => (/^https?:\/\//i.test(texte(url)) ? texte(url) : null)

const forme = (type, zone, fond, options = {}) => ({
  type: 'forme', forme: type, ...zone, fond, bordure: options.bordure ?? null, epaisseur: options.epaisseur ?? 1,
  rayon: options.rayon ?? (type === 'roundRect' ? RAYONS.bloc : 0), rotation: options.rotation ?? 0, pointille: false,
})

const paragraphe = (contenu, puce = null, lien = null) => ({ texte: contenu, puce, lien })

const bloc = (zone, paragraphes, style = {}) => ({
  type: 'texte',
  role: style.role ?? 'corps',
  ...zone,
  paragraphes,
  taille: style.taille ?? TAILLES.corps,
  gras: Boolean(style.gras),
  couleur: style.couleur ?? COULEURS.texte,
  align: style.align ?? 'left',
  valign: style.valign ?? 'top',
})

const tailleCorps = (nombre) => (nombre <= 3 ? TAILLES.corps : TAILLES.corpsDense)

const duree = (valeur) => {
  if (typeof valeur === 'number' && valeur > 0) return `${valeur} min`
  return texte(valeur)
}

const PUBLICS = { apprendre: 'Pour apprendre à utiliser l\'IA', former: 'Pour former à l\'IA' }

// Encadrés beiges : côte à côte en projection, empilés en lecture étroite
const encadres = (zone, contenus, ctx, { premierActif = false } = {}) => {
  const n = contenus.length
  if (n === 0) return []
  const horizontal = ctx.format === 'large'
  const ecart = 0.25
  const w = horizontal ? (zone.w - ecart * (n - 1)) / n : zone.w
  const h = horizontal ? zone.h : Math.min(1.36, (zone.h - ecart * (n - 1)) / n)
  return contenus.flatMap((contenu, i) => {
    const z = horizontal
      ? { x: zone.x + i * (w + ecart), y: zone.y, w, h }
      : { x: zone.x, y: zone.y + i * (h + ecart), w, h }
    const actif = premierActif && i === 0
    return [
      forme('roundRect', z, actif ? COULEURS.actif : COULEURS.synthese, { rayon: RAYONS.encadre }),
      bloc({ x: z.x + 0.18, y: z.y + 0.05, w: z.w - 0.36, h: z.h - 0.1 }, [paragraphe(contenu)], {
        taille: TAILLES.corpsDense, valign: 'middle', gras: actif,
      }),
    ]
  })
}

const surtitre = (diapo, ctx) => {
  const valeur = (texte(diapo.partie) || ctx.titreDiaporama).toLocaleUpperCase('fr-FR')
  return bloc(ctx.zones.surtitre, [paragraphe(valeur)], { taille: TAILLES.surtitre, couleur: COULEURS.texteDoux, role: 'repere', valign: 'middle' })
}

// Zone de schéma : fond bleu pastel ; la scène occupe l'intérieur, la légende de l'étape le bas
const avecScene = (diapo, ctx, points, options = {}) => {
  const Z = ctx.zones
  const r = Z.retrait
  const dessin = {
    x: Z.schema.x + r.x,
    y: Z.schema.y + r.y,
    w: Z.schema.w - 2 * r.x,
    h: Z.schema.h - 2 * r.y - Z.legende,
  }
  const legende = { x: Z.schema.x + r.x, y: Z.schema.y + Z.schema.h - Z.legende - r.y / 2, w: Z.schema.w - 2 * r.x, h: Z.legende }
  const scene = planifierScene(diapo.scene, { zone: dessin, couleurs: COULEURS_SCENE, variante: ctx.variantes?.[ctx.index] })
  return {
    elements: [
      surtitre(diapo, ctx),
      forme('roundRect', Z.schema, COULEURS.schema, { rayon: RAYONS.bloc }),
      ...encadres(Z.encadres, points, ctx, options),
    ],
    scene: scene ? { ...scene, zone: Z.schema, dessin, legende } : null,
  }
}

const ouverture = (diapo, ctx) => {
  const large = ctx.format === 'large'
  const elements = [
    bloc(ctx.zones.surtitre, [paragraphe((texte(diapo.partie) || 'Présentation').toLocaleUpperCase('fr-FR'))], {
      taille: TAILLES.surtitre, couleur: COULEURS.texteDoux, role: 'repere', valign: 'middle',
    }),
  ]
  const x = ctx.zones.titre.x
  const sousTitre = texte(diapo.sousTitre) || texte(ctx.diaporama.sousTitre)
  const infos = [texte(diapo.public) || PUBLICS[ctx.audience], duree(diapo.duree)].filter(Boolean).join(' · ')
  const objectif = texte(ctx.diaporama.objectif)
  // Bas utile : au-dessus du pied de page
  const bas = ctx.zones.pied.y - 0.1
  // Place le sous-titre, les informations et l'objectif sur une largeur donnée ; renvoie les éléments et le bas atteint
  const placer = (largeur) => {
    const sortie = []
    let y = large ? 3.95 : 5.1
    // Hauteurs ajustées au texte : sur mobile, une ligne de projection en fait souvent deux
    const ajuste = (contenu, taille) => hauteurTexte([paragraphe(contenu)], largeur, taille, ESPACE_PARAGRAPHE) + 0.1
    if (sousTitre) {
      const h = ajuste(sousTitre, TAILLES.sousTitreOuverture)
      sortie.push(bloc({ x, y, w: largeur, h }, [paragraphe(sousTitre)], { taille: TAILLES.sousTitreOuverture, couleur: COULEURS.texte }))
      y += h + 0.1
    }
    const hInfos = ajuste(infos, TAILLES.corpsDense)
    sortie.push(bloc({ x, y, w: largeur, h: hInfos }, [paragraphe(infos)], { taille: TAILLES.corpsDense, couleur: COULEURS.texteDoux }))
    y += hInfos
    if (objectif) {
      y += 0.2
      const paragraphes = [paragraphe(`Objectif : ${objectif}`)]
      const h = Math.min(large ? 1.4 : 3.2, hauteurTexte(paragraphes, largeur - 0.4, TAILLES.corpsDense, ESPACE_PARAGRAPHE) + 0.3)
      sortie.push(
        forme('roundRect', { x, y, w: largeur, h }, COULEURS.synthese, { rayon: RAYONS.encadre }),
        bloc({ x: x + 0.2, y: y + 0.15, w: largeur - 0.4, h: h - 0.3 }, paragraphes, { taille: TAILLES.corpsDense, valign: 'middle' }),
      )
      y += h
    }
    return { sortie, y }
  }
  let place = placer(large ? 8.4 : ctx.dims.largeur - 2 * FORMATS.etroit.marge)
  // En 16:9, si le texte touche le pied de page, il prend toute la largeur et les blocs décoratifs s'effacent
  const pleineLargeur = large && place.y > bas
  if (pleineLargeur) place = placer(ctx.zones.titre.w)
  // Blocs décoratifs légèrement inclinés (comme les pictogrammes du prototype)
  if (large && !pleineLargeur) {
    elements.push(
      forme('roundRect', { x: 9.75, y: 1.35, w: 2.2, h: 2.2 }, COULEURS.picto, { rotation: -4 }),
      forme('roundRect', { x: 10.75, y: 3.15, w: 1.8, h: 1.8 }, COULEURS.actif, { rotation: 5 }),
      forme('roundRect', { x: 9.35, y: 4.15, w: 1.35, h: 1.35 }, COULEURS.synthese, { rotation: -3 }),
    )
  }
  elements.push(...place.sortie)
  return { elements }
}

// Cartes empilées (notion, objectifs, à retenir sans schéma) : le contenu prend toute la place
const cartes = (zone, points, puce, fond, taille) => {
  const n = points.length
  if (n === 0) return []
  const ecart = 0.22
  const h = Math.min(1.25, (zone.h - ecart * (n - 1)) / n)
  return points.flatMap((point, i) => {
    const z = { x: zone.x, y: zone.y + i * (h + ecart), w: zone.w, h }
    return [
      forme('roundRect', z, fond, { rayon: RAYONS.encadre }),
      bloc({ x: z.x + 0.3, y: z.y + 0.06, w: z.w - 0.6, h: z.h - 0.12 }, [paragraphe(point, puce)], { taille, valign: 'middle' }),
    ]
  })
}

const notion = (diapo, ctx) => {
  const points = liste(diapo.points)
  if (diapo.scene) return avecScene(diapo, ctx, points.slice(0, 3))
  return { elements: [surtitre(diapo, ctx), ...cartes(ctx.zones.contenu, points, 'point', COULEURS.synthese, tailleCorps(points.length))] }
}

const objectifs = (diapo, ctx) => {
  const points = liste(diapo.points)
  return { elements: [surtitre(diapo, ctx), ...cartes(ctx.zones.contenu, points, 'coche', COULEURS.synthese, tailleCorps(points.length))] }
}

const etapes = (diapo, ctx) => {
  const points = liste(diapo.points)
  if (diapo.scene) return avecScene(diapo, ctx, points.slice(0, 3))
  const C = ctx.zones.contenu
  const ecart = 0.2
  const h = Math.min(1.0, (C.h - ecart * (points.length - 1)) / Math.max(points.length, 1))
  return {
    elements: [surtitre(diapo, ctx), ...points.flatMap((point, i) => {
      const y = C.y + i * (h + ecart)
      const pastille = { x: C.x, y: y + (h - Math.min(h, 0.8)) / 2, w: Math.min(h, 0.8), h: Math.min(h, 0.8) }
      return [
        forme('roundRect', pastille, COULEURS.picto, { rayon: RAYONS.encadre }),
        bloc(pastille, [paragraphe(String(i + 1))], { taille: TAILLES.corpsDense, gras: true, align: 'center', valign: 'middle' }),
        forme('roundRect', { x: C.x + pastille.w + 0.25, y, w: C.w - pastille.w - 0.25, h }, COULEURS.synthese, { rayon: RAYONS.encadre }),
        bloc({ x: C.x + pastille.w + 0.5, y, w: C.w - pastille.w - 0.75, h }, [paragraphe(point)], {
          taille: tailleCorps(points.length), valign: 'middle',
        }),
      ]
    })],
  }
}

// Composition d'activité : bandeau vert sauge « Activité » et durée, consigne en grand, étapes à cocher
const exercice = (diapo, ctx) => {
  const points = liste(diapo.points)
  const consigne = texte(diapo.consigne)
  const etiquette = ['Activité', duree(diapo.duree)].filter(Boolean).join(' · ')
  if (diapo.scene) {
    const resultat = avecScene(diapo, ctx, [consigne, ...points].filter(Boolean).slice(0, 3), { premierActif: true })
    resultat.elements[0] = bloc(ctx.zones.surtitre, [paragraphe(etiquette.toLocaleUpperCase('fr-FR'))], {
      taille: TAILLES.surtitre, couleur: COULEURS.texteDoux, role: 'repere', valign: 'middle', gras: true,
    })
    return resultat
  }
  const C = ctx.zones.contenu
  const large = ctx.format === 'large'
  const bandeau = { x: C.x, y: C.y, w: large ? 3.4 : C.w, h: 0.7 }
  const consigneZone = { x: C.x, y: C.y + 0.95, w: C.w, h: large ? 1.55 : 3.0 }
  const elements = [
    surtitre(diapo, ctx),
    forme('roundRect', bandeau, COULEURS.actif, { rayon: RAYONS.encadre, bordure: COULEURS.actifBordure, epaisseur: 1.5 }),
    bloc(bandeau, [paragraphe(etiquette)], { taille: TAILLES.corpsDense, gras: true, align: 'center', valign: 'middle' }),
    forme('roundRect', consigneZone, COULEURS.synthese, { rayon: RAYONS.encadre }),
    bloc({ x: consigneZone.x + 0.3, y: consigneZone.y + 0.1, w: consigneZone.w - 0.6, h: consigneZone.h - 0.2 }, [paragraphe(consigne)], {
      taille: TAILLES.intertitre, gras: true, valign: 'middle',
    }),
  ]
  if (points.length > 0) {
    const y = consigneZone.y + consigneZone.h + 0.25
    elements.push(...cartes({ x: C.x, y, w: C.w, h: C.y + C.h - y }, points, 'coche', COULEURS.schema, TAILLES.corpsDense))
  }
  return { elements }
}

const LETTRES = ['A', 'B', 'C', 'D']

const question = (diapo, ctx) => {
  const C = ctx.zones.contenu
  const reponses = liste(diapo.reponses).slice(0, LETTRES.length)
  const hQuestion = ctx.format === 'large' ? 1.4 : 2.6
  const debut = C.y + hQuestion + 0.3
  const ecart = 0.18
  const h = Math.min(0.85, (C.y + C.h - debut - ecart * (reponses.length - 1)) / Math.max(reponses.length, 1))
  return {
    elements: [
      surtitre(diapo, ctx),
      forme('roundRect', { x: C.x, y: C.y, w: C.w, h: hQuestion }, COULEURS.schema, { rayon: RAYONS.encadre }),
      bloc({ x: C.x + 0.3, y: C.y, w: C.w - 0.6, h: hQuestion }, [paragraphe(texte(diapo.question))], {
        taille: TAILLES.intertitre, gras: true, valign: 'middle',
      }),
      ...reponses.flatMap((reponse, i) => {
        const y = debut + i * (h + ecart)
        const pastille = { x: C.x, y, w: h, h }
        return [
          forme('roundRect', pastille, COULEURS.picto, { rayon: RAYONS.encadre }),
          bloc(pastille, [paragraphe(LETTRES[i])], { taille: TAILLES.corpsDense, gras: true, align: 'center', valign: 'middle' }),
          bloc({ x: C.x + h + 0.3, y, w: C.w - h - 0.3, h }, [paragraphe(reponse)], { taille: TAILLES.corpsDense, valign: 'middle' }),
        ]
      }),
    ],
  }
}

const comparaison = (diapo, ctx) => {
  const C = ctx.zones.contenu
  const colonnes = (Array.isArray(diapo.colonnes) ? diapo.colonnes : []).slice(0, 2)
  const large = ctx.format === 'large'
  const ecart = 0.35
  const fonds = [COULEURS.schema, COULEURS.synthese]
  return {
    elements: [surtitre(diapo, ctx), ...colonnes.flatMap((colonne, i) => {
      const z = large
        ? { x: C.x + i * ((C.w - ecart) / 2 + ecart), y: C.y, w: (C.w - ecart) / 2, h: C.h }
        : { x: C.x, y: C.y + i * ((C.h - ecart) / 2 + ecart), w: C.w, h: (C.h - ecart) / 2 }
      return [
        forme('roundRect', z, fonds[i], { rayon: RAYONS.bloc }),
        bloc({ x: z.x + 0.3, y: z.y + 0.2, w: z.w - 0.6, h: 0.7 }, [paragraphe(texte(colonne?.titre))], {
          taille: TAILLES.intertitre, gras: true, role: 'intertitre',
        }),
        bloc({ x: z.x + 0.3, y: z.y + 1.0, w: z.w - 0.6, h: z.h - 1.2 }, liste(colonne?.points).map((p) => paragraphe(p, 'point')), {
          taille: TAILLES.corpsDense,
        }),
      ]
    })],
  }
}

const contenir = (zone, image) => {
  if (!(image?.largeur > 0 && image?.hauteur > 0)) return zone
  const echelle = Math.min(zone.w / image.largeur, zone.h / image.hauteur)
  const w = image.largeur * echelle
  const h = image.hauteur * echelle
  return { x: zone.x + (zone.w - w) / 2, y: zone.y + (zone.h - h) / 2, w, h }
}

const capture = (diapo, ctx) => {
  const C = ctx.zones.contenu
  const large = ctx.format === 'large'
  const points = liste(diapo.points)
  const image = ctx.images?.[diapo.capture]
  const zoneImage = large
    ? { x: C.x, y: C.y, w: points.length > 0 ? 7.9 : C.w, h: 4.2 }
    : { x: C.x, y: C.y, w: C.w, h: 4.6 }
  const elements = [surtitre(diapo, ctx)]
  if (image?.data) {
    elements.push({ type: 'image', ...contenir(zoneImage, image), data: image.data, alt: texte(image.alt) || texte(diapo.titre) })
  } else {
    elements.push(
      forme('roundRect', zoneImage, COULEURS.schema, { rayon: RAYONS.encadre }),
      bloc(zoneImage, [paragraphe(`Capture à ajouter (n° ${diapo.capture ?? '?'})`)], {
        taille: TAILLES.corpsDense, couleur: COULEURS.texteDoux, align: 'center', valign: 'middle',
      }),
    )
  }
  const source = [texte(image?.legende), [texte(image?.source), texte(image?.date)].filter(Boolean).join(', ')].filter(Boolean).join(' — ')
  if (source) {
    elements.push(bloc({ x: zoneImage.x, y: zoneImage.y + zoneImage.h + 0.08, w: zoneImage.w, h: 0.4 }, [paragraphe(source)], {
      taille: TAILLES.repere, couleur: COULEURS.texteDoux, role: 'repere',
    }))
  }
  if (points.length > 0) {
    const zonePoints = large
      ? { x: C.x + 8.25, y: C.y, w: C.w - 8.25, h: 4.2 }
      : { x: C.x, y: zoneImage.y + zoneImage.h + 0.6, w: C.w, h: C.y + C.h - zoneImage.y - zoneImage.h - 0.6 }
    elements.push(...cartes(zonePoints, points, null, COULEURS.synthese, TAILLES.corpsDense))
  }
  return { elements }
}

const aRetenir = (diapo, ctx) => {
  const C = ctx.zones.contenu
  const points = liste(diapo.points)
  const taille = tailleCorps(points.length)
  const paragraphes = points.map((p) => paragraphe(p, 'coche'))
  // 0,2 pouce de marge : le rendu web (polices, interlignage) dépasse parfois l’estimation de quelques pixels
  const h = Math.min(C.h, Math.max(2, hauteurTexte(paragraphes, C.w - 0.9, taille, ESPACE_PARAGRAPHE) + 1.0))
  return {
    elements: [
      surtitre(diapo, ctx),
      forme('roundRect', { ...C, h }, COULEURS.synthese, { rayon: RAYONS.bloc }),
      forme('roundRect', { x: C.x, y: C.y, w: 0.16, h }, COULEURS.actifBordure, { rayon: 0.06 }),
      bloc({ x: C.x + 0.5, y: C.y + 0.4, w: C.w - 0.9, h: h - 0.8 }, paragraphes, { taille, valign: 'middle' }),
    ],
  }
}

const fin = (diapo, ctx) => {
  const C = ctx.zones.contenu
  const elements = [surtitre(diapo, ctx)]
  let y = C.y
  const lien = lienSur(diapo.lien)
  if (lien) {
    // Une adresse longue se coupe sur deux lignes : la hauteur suit le texte
    const paragraphes = [paragraphe(`Cours complet : ${lien}`, null, lien)]
    const h = Math.min(1.3, Math.max(0.8, hauteurTexte(paragraphes, C.w, TAILLES.corpsDense, ESPACE_PARAGRAPHE) + 0.05))
    elements.push(bloc({ x: C.x, y, w: C.w, h }, paragraphes, { taille: TAILLES.corpsDense }))
    y += h + 0.1
  }
  const sources = (Array.isArray(diapo.sources) ? diapo.sources : [])
    .map((source) => ({ libelle: texte(source?.libelle), url: lienSur(source?.url) }))
    .filter((source) => source.libelle)
    .slice(0, 4)
  if (sources.length > 0) {
    const paragraphesSources = sources.map((s) => paragraphe(s.libelle, 'point', s.url))
    const hSources = hauteurTexte(paragraphesSources, C.w, TAILLES.corpsDense, ESPACE_PARAGRAPHE) + 0.1
    elements.push(
      bloc({ x: C.x, y, w: C.w, h: 0.55 }, [paragraphe('Sources')], { taille: TAILLES.intertitre, gras: true, role: 'intertitre' }),
      bloc({ x: C.x, y: y + 0.6, w: C.w, h: hSources }, paragraphesSources, { taille: TAILLES.corpsDense }),
    )
    y += 0.7 + hSources
  }
  if (texte(diapo.date)) {
    elements.push(bloc({ x: C.x, y, w: C.w, h: 0.5 }, [paragraphe(`Diaporama du ${texte(diapo.date)}`)], {
      taille: TAILLES.corpsDense, couleur: COULEURS.texteDoux,
    }))
  }
  // Trois lignes de 24 points en projection
  const hLicence = ctx.format === 'large' ? 1.3 : 2.4
  elements.push(
    forme('roundRect', { x: C.x, y: C.y + C.h - hLicence, w: C.w, h: hLicence }, COULEURS.synthese, { rayon: RAYONS.encadre }),
    bloc({ x: C.x + 0.3, y: C.y + C.h - hLicence, w: C.w - 0.6, h: hLicence }, [paragraphe(LICENCE)], { taille: TAILLES.corpsDense, valign: 'middle' }),
  )
  return { elements }
}

// Jetons du thème pour les compositions de formation (compositions.js)
export const jetonsAtelier = (ctx) => ({
  format: ctx.format,
  contenu: ctx.zones.contenu,
  zones: ctx.zones,
  dims: ctx.dims,
  couleurs: {
    texte: COULEURS.texte,
    texteDoux: COULEURS.texteDoux,
    fondA: COULEURS.schema,
    fondB: COULEURS.synthese,
    actif: COULEURS.actif,
    actifBordure: COULEURS.actifBordure,
    pastille: COULEURS.picto,
  },
  tailles: { corps: TAILLES.corpsDense, intertitre: TAILLES.intertitre, repere: TAILLES.repere, grandNumero: 72, sousTitre: TAILLES.sousTitreOuverture },
  formeEncadre: 'roundRect',
  rayon: RAYONS.encadre,
  bordureEncadre: null,
})

// Le séparateur a sa propre ouverture ; les autres compositions gardent le repère de partie en haut
const composition = (modele) => (diapo, ctx) => {
  const resultat = composer(modele, diapo, ctx, jetonsAtelier(ctx))
  return modele === 'separateur' ? resultat : { ...resultat, elements: [surtitre(diapo, ctx), ...resultat.elements] }
}

export const DISPOSITIONS_ATELIER = {
  ...Object.fromEntries(Object.keys(COMPOSITIONS_PAR_MODELE).map((modele) => [modele, composition(modele)])),
  titre: ouverture,
  objectifs,
  notion,
  etapes,
  comparaison,
  capture,
  exercice,
  question,
  a_retenir: aRetenir,
  fin,
}

export const contexteAtelier = (format) => {
  const nom = format === 'etroit' ? 'etroit' : 'large'
  return { format: nom, dims: FORMATS[nom], zones: ZONES[nom] }
}

// Masques : l'ouverture et les diapositives de contenu. `titre` est l'emplacement du titre.
export const maitresAtelier = (plan, site) => {
  const nom = plan.formatNom === 'etroit' ? 'etroit' : 'large'
  const Z = ZONES[nom]
  const dims = FORMATS[nom]
  const repere = { taille: TAILLES.repere, couleur: COULEURS.texteDoux, role: 'repere', valign: 'middle' }
  const large = nom === 'large'
  return {
    COUVERTURE: {
      fond: COULEURS.fond,
      titre: large
        ? { x: Z.titre.x, y: 1.25, w: 8.4, h: 2.55, taille: TAILLES.titreOuverture, valign: 'bottom', couleur: COULEURS.texte }
        : { x: Z.titre.x, y: 1.0, w: dims.largeur - 2 * dims.marge, h: 3.9, taille: TAILLES.titreOuverture, valign: 'bottom', couleur: COULEURS.texte },
      elements: [bloc(Z.pied, [paragraphe(site)], repere)],
      numero: null,
    },
    CONTENU: {
      fond: COULEURS.fond,
      titre: { ...Z.titre, taille: TAILLES.titre, valign: 'middle', couleur: COULEURS.texte },
      elements: [bloc(Z.pied, [paragraphe(`${site} · ${plan.titre}`)], repere)],
      numero: { ...Z.numero, taille: TAILLES.repere, couleur: COULEURS.texteDoux },
    },
  }
}
