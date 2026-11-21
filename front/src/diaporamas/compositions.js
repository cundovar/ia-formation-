// Compositions de formation (regles/diaporamas/modeles.json : exemple_commente, avant_apres, demonstration,
// etude_de_cas, separateur), en fonctions pures. Une seule géométrie pour les deux thèmes : chaque thème
// fournit ses jetons (couleurs, tailles, zones, forme des encadrés). L'agent ne fournit que le contenu.
// Les limites du catalogue sont choisies pour que les textes tiennent (tests aux longueurs maximales).
import { MODELES } from './modeles'

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '')
const liste = (valeur) => (Array.isArray(valeur) ? valeur.map(texte).filter(Boolean) : [])
const paragraphe = (contenu, puce = null, lien = null) => ({ texte: contenu, puce, lien })

// Éléments communs, avec les jetons du thème
const outils = (j) => {
  const forme = (zone, fond, options = {}) => ({
    type: 'forme',
    forme: j.formeEncadre,
    ...zone,
    fond,
    bordure: options.bordure ?? j.bordureEncadre ?? null,
    epaisseur: options.epaisseur ?? 1,
    rayon: j.formeEncadre === 'roundRect' ? j.rayon : 0,
    rotation: 0,
    pointille: false,
    ...(options.id ? { id: options.id } : {}),
  })
  const bloc = (zone, paragraphes, style = {}) => ({
    type: 'texte',
    role: style.role ?? 'corps',
    ...zone,
    paragraphes,
    taille: style.taille ?? j.tailles.corps,
    gras: Boolean(style.gras),
    couleur: style.couleur ?? j.couleurs.texte,
    align: style.align ?? 'left',
    valign: style.valign ?? 'top',
    ...(style.id ? { id: style.id } : {}),
  })
  // Pastille numérotée (le numéro est écrit : l'ordre ne dépend pas de la couleur)
  const pastille = (zone, numero, id = null) => [
    forme(zone, j.couleurs.pastille, { id: id ? `${id}-fond` : null }),
    bloc(zone, [paragraphe(String(numero))], { taille: j.tailles.corps, gras: true, align: 'center', valign: 'middle', id: id ? `${id}-num` : null }),
  ]
  // Encadré avec intitulé en gras et texte dessous
  const encadre = (zone, intitule, contenu, fond, options = {}) => {
    const hIntitule = options.hIntitule ?? 0.62
    return [
      forme(zone, fond, options),
      bloc({ x: zone.x + 0.25, y: zone.y + 0.12, w: zone.w - 0.5, h: hIntitule }, [paragraphe(intitule)], {
        taille: j.tailles.intertitre, gras: true, role: 'intertitre', valign: 'middle',
      }),
      bloc({ x: zone.x + 0.25, y: zone.y + 0.18 + hIntitule, w: zone.w - 0.5, h: zone.h - hIntitule - 0.35 }, [paragraphe(contenu)], {
        taille: j.tailles.corps,
      }),
    ]
  }
  return { forme, bloc, pastille, encadre }
}

// Liste numérotée de cartes empilées dans une zone (commentaires, questions, étapes)
const listeNumerotee = (o, j, zone, contenus, { actif = -1, prefixeId = null, hMax = 1.6 } = {}) => {
  const n = contenus.length
  if (n === 0) return []
  const ecart = 0.18
  const h = Math.min(hMax, (zone.h - ecart * (n - 1)) / n)
  const cote = Math.min(0.7, h)
  return contenus.flatMap((contenu, i) => {
    const y = zone.y + i * (h + ecart)
    const id = prefixeId ? `${prefixeId}-${i}` : null
    return [
      ...o.pastille({ x: zone.x, y: y + (h - cote) / 2, w: cote, h: cote }, i + 1, id),
      o.forme({ x: zone.x + cote + 0.18, y, w: zone.w - cote - 0.18, h }, i === actif ? j.couleurs.actif : j.couleurs.fondB, {
        id: id ? `${id}-carte` : null,
        ...(i === actif ? { bordure: j.couleurs.actifBordure, epaisseur: 1.5 } : {}),
      }),
      o.bloc({ x: zone.x + cote + 0.38, y: y + 0.04, w: zone.w - cote - 0.58, h: h - 0.08 }, [paragraphe(contenu)], {
        taille: j.tailles.corps, valign: 'middle', gras: i === actif, id: id ? `${id}-texte` : null,
      }),
    ]
  })
}

const contenir = (zone, image) => {
  if (!(image?.largeur > 0 && image?.hauteur > 0)) return zone
  const echelle = Math.min(zone.w / image.largeur, zone.h / image.hauteur)
  const w = image.largeur * echelle
  const h = image.hauteur * echelle
  return { x: zone.x + (zone.w - w) / 2, y: zone.y + (zone.h - h) / 2, w, h }
}

// Visuel du back-office, ou emplacement signalé s'il n'est pas chargé ; jamais d'image inventée
const visuel = (o, j, zone, captureId, images, id = null) => {
  const image = images?.[captureId]
  if (image?.data) {
    return [{ type: 'image', ...contenir(zone, image), data: image.data, alt: texte(image.alt) || 'Capture', ...(id ? { id } : {}) }]
  }
  return [
    o.forme(zone, j.couleurs.fondA, { id: id ? `${id}-fond` : null }),
    o.bloc(zone, [paragraphe(`Capture à ajouter (n° ${captureId ?? '?'})`)], {
      taille: j.tailles.corps, couleur: j.couleurs.texteDoux, align: 'center', valign: 'middle', id: id ? `${id}-texte` : null,
    }),
  ]
}

const sourceVisuel = (o, j, zone, captureId, images) => {
  const image = images?.[captureId]
  const source = [texte(image?.legende), [texte(image?.source), texte(image?.date)].filter(Boolean).join(', ')].filter(Boolean).join(' — ')
  return source ? [o.bloc(zone, [paragraphe(source)], { taille: j.tailles.repere, couleur: j.couleurs.texteDoux, role: 'repere' })] : []
}

const exempleCommente = (diapo, ctx, j) => {
  const o = outils(j)
  const C = j.contenu
  const large = j.format === 'large'
  const exemple = texte(diapo.exemple)
  const commentaires = liste(diapo.commentaires).slice(0, 3)
  const avecCapture = diapo.capture !== undefined && diapo.capture !== null
  const ecart = 0.3
  const gauche = large ? { x: C.x, y: C.y, w: 6.2, h: C.h } : { x: C.x, y: C.y, w: C.w, h: avecCapture ? 7.2 : 4.6 }
  const droite = large
    ? { x: C.x + 6.2 + ecart, y: C.y, w: C.w - 6.2 - ecart, h: C.h }
    : { x: C.x, y: gauche.y + gauche.h + ecart, w: C.w, h: C.y + C.h - gauche.y - gauche.h - ecart }
  const elements = []
  if (avecCapture) {
    const hTexte = large ? 1.85 : 2.2
    const zoneImage = { x: gauche.x, y: gauche.y, w: gauche.w, h: gauche.h - hTexte - 0.45 }
    elements.push(
      ...visuel(o, j, zoneImage, diapo.capture, ctx.images),
      ...sourceVisuel(o, j, { x: zoneImage.x, y: zoneImage.y + zoneImage.h + 0.04, w: zoneImage.w, h: 0.36 }, diapo.capture, ctx.images),
      o.forme({ x: gauche.x, y: gauche.y + gauche.h - hTexte, w: gauche.w, h: hTexte }, j.couleurs.fondA),
      o.bloc({ x: gauche.x + 0.25, y: gauche.y + gauche.h - hTexte + 0.08, w: gauche.w - 0.5, h: hTexte - 0.16 }, [paragraphe(`Exemple : ${exemple}`)], {
        taille: j.tailles.corps, valign: 'middle',
      }),
    )
  } else {
    elements.push(...o.encadre(gauche, 'Exemple', exemple, j.couleurs.fondA))
  }
  elements.push(...listeNumerotee(o, j, droite, commentaires))
  return { elements }
}

const avantApres = (diapo, ctx, j) => {
  const o = outils(j)
  const C = j.contenu
  const large = j.format === 'large'
  const explication = texte(diapo.explication)
  const hExplication = explication ? (large ? 0.95 : 1.7) : 0
  const ecart = 0.35
  const hautColonnes = C.h - (explication ? hExplication + 0.25 : 0)
  const colonnes = [
    { champ: diapo.avant, mot: 'Avant', fond: j.couleurs.fondA },
    { champ: diapo.apres, mot: 'Après', fond: j.couleurs.actif, bordure: j.couleurs.actifBordure },
  ]
  const elements = colonnes.flatMap((c, i) => {
    const zone = large
      ? { x: C.x + i * ((C.w - ecart) / 2 + ecart), y: C.y, w: (C.w - ecart) / 2, h: hautColonnes }
      : { x: C.x, y: C.y + i * ((hautColonnes - ecart) / 2 + ecart), w: C.w, h: (hautColonnes - ecart) / 2 }
    const libelle = texte(c.champ?.libelle)
    // Le mot « Avant » ou « Après » est toujours écrit (l'information ne repose pas sur la couleur)
    const intitule = libelle ? `${c.mot} · ${libelle}` : c.mot
    return o.encadre(zone, intitule, texte(c.champ?.texte), c.fond, { hIntitule: 0.95, ...(c.bordure ? { bordure: c.bordure, epaisseur: 1.5 } : {}) })
  })
  if (explication) {
    const zone = { x: C.x, y: C.y + C.h - hExplication, w: C.w, h: hExplication }
    elements.push(
      o.forme(zone, j.couleurs.fondB),
      o.bloc({ x: zone.x + 0.25, y: zone.y + 0.05, w: zone.w - 0.5, h: zone.h - 0.1 }, [paragraphe(`Ce qui change : ${explication}`)], {
        taille: j.tailles.corps, valign: 'middle',
      }),
    )
  }
  return { elements }
}

const etudeDeCas = (diapo, ctx, j) => {
  const o = outils(j)
  const C = j.contenu
  const large = j.format === 'large'
  const questions = liste(diapo.questions).slice(0, 3)
  const duree = typeof diapo.duree === 'number' && diapo.duree > 0 ? `${diapo.duree} min` : texte(diapo.duree)
  const ecart = 0.3
  const hDuree = duree ? 0.7 : 0
  const gauche = large ? { x: C.x, y: C.y, w: 6.4, h: C.h - (duree ? hDuree + 0.2 : 0) } : { x: C.x, y: C.y, w: C.w, h: 4.8 }
  const elements = [...o.encadre(gauche, 'Situation', texte(diapo.contexte), j.couleurs.fondA)]
  if (duree) {
    const zone = large ? { x: C.x, y: C.y + C.h - hDuree, w: 3.2, h: hDuree } : { x: C.x, y: gauche.y + gauche.h + 0.2, w: C.w, h: hDuree }
    elements.push(
      o.forme(zone, j.couleurs.actif, { bordure: j.couleurs.actifBordure, epaisseur: 1.5 }),
      o.bloc(zone, [paragraphe(`En groupe · ${duree}`)], { taille: j.tailles.corps, gras: true, align: 'center', valign: 'middle' }),
    )
  }
  const debutQuestions = large ? C.y : gauche.y + gauche.h + (duree ? hDuree + 0.4 : 0.3)
  const droite = large
    ? { x: C.x + 6.4 + ecart, y: C.y, w: C.w - 6.4 - ecart, h: C.h }
    : { x: C.x, y: debutQuestions, w: C.w, h: C.y + C.h - debutQuestions }
  elements.push(...listeNumerotee(o, j, droite, questions))
  return { elements }
}

// Démonstration : une étape révélée à la fois (web), une diapositive fixe par étape (.pptx), vue d'ensemble (PDF).
// Elle prend la forme d'une « scène » sans catalogue : mêmes étapes, même vue fixe, mêmes légendes.
const demonstration = (diapo, ctx, j) => {
  const o = outils(j)
  const C = j.contenu
  const large = j.format === 'large'
  const etapes = (Array.isArray(diapo.etapes) ? diapo.etapes : [])
    .filter((e) => e && typeof e === 'object' && texte(e.action))
    .slice(0, MODELES.demonstration.etapes.max)
    .map((e) => ({ action: texte(e.action), verification: texte(e.verification), capture: e.capture ?? null }))
  const avecCaptures = etapes.some((e) => e.capture !== null)
  const hLegende = large ? 0.55 : 1.0
  const zoneEtapes = large
    ? { x: C.x, y: C.y, w: avecCaptures ? 6.5 : C.w, h: C.h - hLegende - 0.15 }
    : { x: C.x, y: C.y, w: C.w, h: avecCaptures ? 5.6 : C.h - hLegende - 0.15 }
  const zoneImage = large
    ? { x: C.x + 6.8, y: C.y, w: C.w - 6.8, h: C.h - hLegende - 0.55 }
    : { x: C.x, y: C.y + 5.9, w: C.w, h: C.h - 5.9 - hLegende - 0.55 }
  const captureJusqua = (k) => {
    for (let i = Math.min(k, etapes.length - 1); i >= 0; i -= 1) if (etapes[i].capture !== null) return etapes[i].capture
    return null
  }
  const vue = (k, actif) => {
    const elements = listeNumerotee(o, j, zoneEtapes, etapes.slice(0, k + 1).map((e) => e.action), {
      actif, prefixeId: 'demo', hMax: (zoneEtapes.h - 0.18 * (etapes.length - 1)) / Math.max(etapes.length, 1),
    })
    const capture = avecCaptures ? captureJusqua(k) : null
    if (capture !== null) {
      elements.push(
        ...visuel(o, j, zoneImage, capture, ctx.images, `demo-visuel-${capture}`),
        ...sourceVisuel(o, j, { x: zoneImage.x, y: zoneImage.y + zoneImage.h + 0.04, w: zoneImage.w, h: 0.36 }, capture, ctx.images)
          .map((e) => ({ ...e, id: `demo-source-${capture}` })),
      )
    }
    return elements
  }
  const court = (e) => (e.verification ? `À vérifier : ${e.verification}` : e.action)
  const altDe = (e) => (e.capture !== null ? texte(ctx.images?.[e.capture]?.alt) : '')
  const scene = etapes.length < 2 ? null : {
    type: 'demonstration',
    genre: 'demonstration',
    rendusPptx: 'etapes',
    titreEtapes: 'La démonstration, étape par étape',
    description: `Démonstration en ${etapes.length} étapes : ${etapes.map((e, i) => `${i + 1}. ${e.action}`).join(' ; ')}.`,
    justification: '',
    notion: '',
    etapes: etapes.map((e, k) => ({
      legende: [e.action, e.verification ? `à vérifier : ${e.verification}` : ''].filter(Boolean).join(' — '),
      court: court(e),
      alt: altDe(e),
      elements: vue(k, k),
    })),
    fixe: {
      elements: vue(etapes.length - 1, -1),
      legendes: etapes.map((e, i) => `${i + 1}. ${e.action}${e.verification ? ` — à vérifier : ${e.verification}` : ''}`),
      court: `Vue d'ensemble : ${etapes.length} étapes`,
    },
    zone: C,
    dessin: C,
    legende: { x: C.x, y: C.y + C.h - hLegende, w: C.w, h: hLegende },
  }
  // Sans au moins deux étapes, rien n'est animé : la vue fixe suffit
  return { elements: scene ? [] : vue(etapes.length - 1, -1), scene }
}

const separateur = (diapo, ctx, j) => {
  const o = outils(j)
  const large = j.format === 'large'
  const numero = Number.isInteger(diapo.numero) ? diapo.numero : 1
  const sousTitre = texte(diapo.sousTitre)
  const zoneNumero = large ? { x: 9.9, y: 1.5, w: 2.4, h: 2.4 } : { x: j.dims.marge, y: 7.8, w: 1.8, h: 1.8 }
  const elements = [
    o.bloc(j.zones.surtitre, [paragraphe(`PARTIE ${numero}`)], { taille: j.tailles.repere, couleur: j.couleurs.texteDoux, role: 'repere', valign: 'middle', gras: true }),
    o.forme(zoneNumero, j.couleurs.pastille),
    o.bloc(zoneNumero, [paragraphe(String(numero))], { taille: j.tailles.grandNumero, gras: true, align: 'center', valign: 'middle' }),
  ]
  if (sousTitre) {
    const zone = large ? { x: j.zones.titre.x, y: 3.95, w: 8.4, h: 1.5 } : { x: j.zones.titre.x, y: 5.1, w: j.dims.largeur - 2 * j.dims.marge, h: 2.4 }
    elements.push(o.bloc(zone, [paragraphe(sousTitre)], { taille: j.tailles.sousTitre, couleur: j.couleurs.texte }))
  }
  return { elements }
}

export const COMPOSITIONS_PAR_MODELE = {
  exemple_commente: exempleCommente,
  avant_apres: avantApres,
  demonstration,
  etude_de_cas: etudeDeCas,
  separateur,
}

export const estComposition = (modele) => Object.hasOwn(COMPOSITIONS_PAR_MODELE, modele)

/**
 * @param {string} modele
 * @param {object} diapo contenu de la diapositive
 * @param {object} ctx contexte de la mise en page (images…)
 * @param {object} jetons jetons du thème : format, contenu, zones, dims, couleurs, tailles, formeEncadre, rayon
 * @returns {{ elements: object[], scene?: object|null }}
 */
export const composer = (modele, diapo, ctx, jetons) => COMPOSITIONS_PAR_MODELE[modele](diapo, ctx, jetons)
