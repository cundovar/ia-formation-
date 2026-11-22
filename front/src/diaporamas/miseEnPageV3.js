// Mise en page du thème « Atelier visuel v3 », en fonctions pures (mêmes éléments que miseEnPage.js).
// L'agent fournit le contenu et sa structure ; le site choisit la composition, les couleurs, les positions,
// calcule le fil de progression et les numéros. Deux compositions validées le 22 novembre 2026 :
//  - « convergence » : quatre blocs reliés à une bulle centrale (la demande se construit) ;
//  - « circuit » : trois étapes fléchées, la dernière étant un contrôle humain avant envoi.
// Chaque composition est une scène sans catalogue : le web révèle un bloc à la fois (clavier ou clic),
// le PDF et le .pptx montrent la vue fixe, dont les formes et textes restent modifiables.
// Les autres modèles sont dessinés par le thème Atelier visuel en attendant leur passage en v3.
import { estIconeConnue } from './icones'
import { COULEURS, OMBRE, RAYONS, TAILLES, ZONES, px } from './themes/atelierVisuelV3'

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '')

const forme = (id, zone, fond, options = {}) => ({
  type: 'forme',
  id,
  forme: options.forme ?? 'roundRect',
  ...zone,
  fond,
  bordure: options.bordure ?? null,
  epaisseur: options.epaisseur ?? 1,
  pointille: Boolean(options.pointille),
  rayon: options.rayon ?? RAYONS.carte,
  rotation: 0,
  ...(options.ombre ? { ombre: OMBRE } : {}),
})

const bloc = (id, zone, contenu, options = {}) => ({
  type: 'texte',
  id,
  role: options.role ?? 'corps',
  ...zone,
  paragraphes: (Array.isArray(contenu) ? contenu : [contenu]).filter(Boolean).map((t) => ({ texte: t, puce: null, lien: null })),
  taille: options.taille ?? TAILLES.corps,
  gras: Boolean(options.gras),
  couleur: options.couleur ?? COULEURS.texte,
  align: options.align ?? 'left',
  valign: options.valign ?? 'top',
})

const icone = (id, nom, zone, couleur = COULEURS.accent, epaisseur = 2) => ({ type: 'icone', id, nom, ...zone, couleur, epaisseur })

const ligne = (id, x1, y1, x2, y2) => ({ type: 'ligne', id, x1, y1, x2, y2, couleur: COULEURS.accent, epaisseur: 2.25, pointille: false, fleche: false })

const pastilleIcone = (id, nom, x, y, d, fond) => [
  forme(`${id}-fond`, { x, y, w: d, h: d }, fond, { forme: 'ellipse' }),
  ...(estIconeConnue(nom) ? [icone(`${id}-icone`, nom, { x: x + d / 4, y: y + d / 4, w: d / 2, h: d / 2 })] : []),
]

// Points structurés {titre, texte, icone, aVerifier, liste, action} ; une phrase seule donne un point sans titre
export const normaliserPoints = (points) => (Array.isArray(points) ? points : [])
  .map((p) => (typeof p === 'string'
    ? { titre: '', texte: texte(p), icone: null, aVerifier: '', liste: [], action: '' }
    : {
        titre: texte(p?.titre),
        texte: texte(p?.texte),
        icone: estIconeConnue(p?.icone) ? p.icone : null,
        aVerifier: texte(p?.aVerifier),
        liste: (Array.isArray(p?.liste) ? p.liste : []).map(texte).filter(Boolean).slice(0, 3),
        action: texte(p?.action),
      }))
  .filter((p) => p.titre || p.texte)

const indiceMiseEnAvant = (valeur, nombre) => (Number.isInteger(valeur) && valeur >= 0 && valeur < nombre ? valeur : 0)

// Fil de progression : les parties du scénario, la partie de la diapositive mise en avant
const progression = (ctx, partieId) => {
  const parties = ctx.parties.slice(0, 4)
  if (parties.length < 2) return []
  const elements = []
  let x = ZONES.progression.x
  const { y, h } = ZONES.progression
  parties.forEach((partie, k) => {
    const active = partie.id === partieId
    const w = px(34) + partie.titre.length * px(9.6)
    if (active) elements.push(forme(`progression-${k}-fond`, { x, y, w, h }, COULEURS.sauge, { rayon: RAYONS.pilule }))
    elements.push(bloc(`progression-${k}`, { x, y, w, h }, partie.titre, {
      taille: TAILLES.repere, gras: active, couleur: active ? COULEURS.texte : COULEURS.texteDoux, align: 'center', valign: 'middle', role: 'repere',
    }))
    x += w + px(8)
    if (k < parties.length - 1) {
      elements.push(forme(`progression-${k}-liaison`, { x, y: y + h / 2 - px(1), w: px(14), h: px(2) }, COULEURS.filet, { forme: 'rect', rayon: 0 }))
      x += px(22)
    }
  })
  return elements
}

const reperes = (diapo, ctx) => [
  ...progression(ctx, diapo.scenarioPartie),
  bloc('numero', ZONES.numero, `${String(ctx.index + 1).padStart(2, '0')} / ${String(ctx.total).padStart(2, '0')}`, {
    taille: TAILLES.repere, gras: true, couleur: COULEURS.texteDoux, align: 'right', valign: 'middle', role: 'repere',
  }),
]

const synthese = (diapo) => {
  const phrase = texte(diapo.conclusion)
  if (!phrase) return []
  const Z = ZONES.synthese
  return [
    icone('synthese-icone', 'check', { x: Z.x, y: Z.y + (Z.h - px(30)) / 2, w: px(30), h: px(30) }, COULEURS.accent, 2.5),
    bloc('synthese', { x: Z.x + px(44), y: Z.y, w: Z.w - px(44), h: Z.h }, phrase, { gras: true, valign: 'middle' }),
  ]
}

const scene = (type, description, etapes, fixe, legendes) => ({
  type,
  genre: 'composition',
  rendusPptx: 'fixe',
  description,
  justification: '',
  notion: '',
  etapes,
  fixe: { elements: fixe, legendes, court: `Vue d'ensemble : ${etapes.length} étapes` },
  zone: ZONES.contenu,
  dessin: ZONES.contenu,
  legende: null,
})

// Convergence : quatre blocs (titre, icône, exemple court) reliés à la bulle centrale
const convergence = (diapo, points) => {
  const W = px(380)
  const H = px(210)
  const xs = [px(72), px(828)]
  const ys = [px(176), px(410)]
  const bw = px(250)
  const bh = bw * 0.85
  const bx = px(640) - bw / 2
  const by = px(290)
  const corps = bh * (140 / 170)
  const actif = indiceMiseEnAvant(diapo.miseEnAvant, points.length)
  const ancres = [[bx + px(22), by + px(34)], [bx + bw - px(22), by + px(34)], [bx + px(22), by + corps - px(30)], [bx + bw - px(22), by + corps - px(30)]]
  const centre = texte(diapo.centre) || 'Votre demande'
  const bulle = [
    forme('bulle', { x: bx, y: by, w: bw, h: bh }, COULEURS.chaud, { forme: 'bulle', rayon: px(30) }),
    bloc('bulle-texte', { x: bx, y: by + px(30), w: bw, h: px(44) }, centre, { gras: true, align: 'center', valign: 'middle' }),
    forme('bulle-curseur', { x: bx + px(52), y: by + px(96), w: px(6), h: px(40) }, COULEURS.accent, { rayon: px(3) }),
    forme('bulle-ligne-1', { x: bx + px(72), y: by + px(100), w: px(120), h: px(10) }, COULEURS.carte, { rayon: 0 }),
    forme('bulle-ligne-2', { x: bx + px(72), y: by + px(122), w: px(80), h: px(10) }, COULEURS.carte, { rayon: 0 }),
  ]
  const blocDe = (p, k) => {
    const x = xs[k % 2]
    const y = ys[Math.floor(k / 2)]
    const enAvant = k === actif
    const [ax, ay] = ancres[k]
    const bord = k % 2 === 0 ? x + W : x
    const yl = y + H / 2
    return [
      ligne(`bloc-${k}-liaison`, bord, yl, ax, ay),
      forme(`bloc-${k}`, { x, y, w: W, h: H }, enAvant ? COULEURS.sauge : COULEURS.carte, { ombre: !enAvant }),
      // Point d'attache devant la carte
      forme(`bloc-${k}-point`, { x: bord - px(7), y: yl - px(7), w: px(14), h: px(14) }, COULEURS.accent, { forme: 'ellipse' }),
      ...pastilleIcone(`bloc-${k}-pastille`, p.icone, x + px(28), y + px(24), px(52), enAvant ? COULEURS.carte : COULEURS.clair),
      bloc(`bloc-${k}-titre`, { x: x + px(94), y: y + px(24), w: W - px(120), h: px(52) }, p.titre, { taille: TAILLES.motCle, gras: true, valign: 'middle', role: 'intertitre' }),
      bloc(`bloc-${k}-texte`, { x: x + px(28), y: y + px(92), w: W - px(56), h: H - px(110) }, p.texte, { couleur: COULEURS.texteDoux }),
    ]
  }
  const blocs = points.map(blocDe)
  const vue = (k) => [...blocs.slice(0, k + 1).flat(), ...bulle]
  const legendes = points.map((p, i) => `${i + 1}. ${p.titre} : ${p.texte}`)
  return scene(
    'convergence',
    `${centre} se construit avec ${points.length} éléments : ${points.map((p) => p.titre).join(', ')}.`,
    points.map((p, k) => ({ legende: `${p.titre} : ${p.texte}`, court: p.titre, elements: vue(k) })),
    vue(points.length - 1),
    legendes,
  )
}

// Circuit : trois étapes fléchées ; une information à vérifier dans la deuxième, une liste de contrôles dans
// la dernière, suivie de l'action finale (par exemple « Puis envoyer »)
const circuit = (diapo, points) => {
  const y = px(172)
  const h = px(436)
  const colonnes = [[px(72), px(270)], [px(370), px(460)], [px(858), px(350)]]
  const actif = indiceMiseEnAvant(diapo.miseEnAvant, points.length)
  const etape = (p, k) => {
    const [x, w] = colonnes[k]
    const enAvant = k === actif
    const id = `etape-${k}`
    const elements = [
      forme(id, { x, y, w, h }, enAvant ? COULEURS.sauge : COULEURS.carte, { ombre: !enAvant }),
      forme(`${id}-numero-fond`, { x: x + px(24), y: y + px(24), w: px(52), h: px(34) }, enAvant ? COULEURS.carte : COULEURS.clair, { rayon: RAYONS.pilule }),
      bloc(`${id}-numero`, { x: x + px(24), y: y + px(24), w: px(52), h: px(34) }, String(k + 1).padStart(2, '0'), {
        taille: TAILLES.numero, gras: true, couleur: COULEURS.accent, align: 'center', valign: 'middle', role: 'repere',
      }),
      ...(p.icone ? [icone(`${id}-icone`, p.icone, { x: x + w - px(54), y: y + px(27), w: px(28), h: px(28) })] : []),
      bloc(`${id}-titre`, { x: x + px(24), y: y + px(70), w: w - px(48), h: px(42) }, p.titre, { taille: TAILLES.motCle, gras: true, valign: 'middle', role: 'intertitre' }),
    ]
    if (p.liste.length > 0) {
      p.liste.forEach((item, i) => {
        const yc = y + px(132) + i * px(60)
        elements.push(
          forme(`${id}-coche-${i}`, { x: x + px(24), y: yc, w: px(40), h: px(40) }, COULEURS.carte, { forme: 'ellipse' }),
          icone(`${id}-coche-${i}-icone`, 'check', { x: x + px(33), y: yc + px(9), w: px(22), h: px(22) }, COULEURS.accent, 2.5),
          bloc(`${id}-controle-${i}`, { x: x + px(80), y: yc, w: w - px(104), h: px(40) }, item, { valign: 'middle' }),
        )
      })
    } else if (p.aVerifier) {
      const yv = y + px(248)
      elements.push(
        forme(`${id}-message`, { x: x + px(20), y: y + px(124), w: w - px(40), h: h - px(144) }, COULEURS.clair, { rayon: RAYONS.message }),
        bloc(`${id}-texte`, { x: x + px(40), y: y + px(144), w: w - px(80), h: px(84) }, p.texte),
        forme(`${id}-a-verifier`, { x: x + px(32), y: yv, w: w - px(64), h: px(96) }, COULEURS.chaud, {
          bordure: COULEURS.accent, epaisseur: 1.5, pointille: true, rayon: RAYONS.encadre,
        }),
        bloc(`${id}-engagement`, { x: x + px(52), y: yv, w: w - px(104), h: px(96) }, p.aVerifier, { gras: true, valign: 'middle' }),
        forme(`${id}-etiquette`, { x: x + w - px(186), y: yv - px(18), w: px(146), h: px(32) }, COULEURS.carte, {
          bordure: COULEURS.accent, epaisseur: 1.1, rayon: RAYONS.pilule,
        }),
        icone(`${id}-etiquette-icone`, 'alerte', { x: x + w - px(174), y: yv - px(12), w: px(20), h: px(20) }),
        bloc(`${id}-etiquette-texte`, { x: x + w - px(148), y: yv - px(18), w: px(104), h: px(32) }, 'À vérifier', {
          taille: TAILLES.repere, gras: true, valign: 'middle', role: 'repere',
        }),
      )
    } else {
      elements.push(bloc(`${id}-texte`, { x: x + px(24), y: y + px(128), w: w - px(48), h: h - px(156) }, p.texte, { couleur: COULEURS.texteDoux }))
    }
    if (p.action) {
      elements.push(
        forme(`${id}-action`, { x: x + px(24), y: y + h - px(84), w: w - px(48), h: px(60) }, COULEURS.carte, {
          bordure: COULEURS.accent, epaisseur: 1.5, rayon: RAYONS.pilule,
        }),
        icone(`${id}-action-icone`, 'envoi', { x: x + px(50), y: y + h - px(70), w: px(30), h: px(30) }),
        bloc(`${id}-action-texte`, { x: x + px(96), y: y + h - px(84), w: w - px(130), h: px(60) }, p.action, { gras: true, valign: 'middle' }),
      )
    }
    if (k > 0) {
      const xa = colonnes[k - 1][0] + colonnes[k - 1][1] + px(14)
      elements.unshift(
        forme(`${id}-fleche-fond`, { x: xa - px(20), y: y + h / 2 - px(20), w: px(40), h: px(40) }, COULEURS.carte, {
          forme: 'ellipse', bordure: COULEURS.filet, epaisseur: 1.1, ombre: true,
        }),
        icone(`${id}-fleche`, 'fleche', { x: xa - px(10), y: y + h / 2 - px(10), w: px(20), h: px(20) }, COULEURS.accent, 2.5),
      )
    }
    return elements
  }
  const etapes = points.map(etape)
  // Les flèches passent devant la carte précédente : elles sont ajoutées après toutes les cartes visibles
  const vue = (k) => {
    const visibles = etapes.slice(0, k + 1)
    const fleches = visibles.flat().filter((e) => /-fleche/.test(e.id))
    return [...visibles.flat().filter((e) => !/-fleche/.test(e.id)), ...fleches]
  }
  const resume = (p) => [p.texte.replace(/\s*:$/, ''), p.aVerifier && `à vérifier : ${p.aVerifier}`, p.liste.join(', '), p.action].filter(Boolean).join(' — ')
  return scene(
    'circuit',
    `Circuit en ${points.length} étapes : ${points.map((p) => p.titre).join(', ')}.`,
    points.map((p, k) => ({ legende: `${p.titre} : ${resume(p)}`, court: p.titre, elements: vue(k) })),
    vue(points.length - 1),
    points.map((p, i) => `${i + 1}. ${p.titre} : ${resume(p)}`),
  )
}

const pointsStructures = (points) => points.length > 0 && points.every((p) => p.titre)

// Pour les dessins qui n'attendent que des phrases (Atelier visuel, lecture étroite) : « Titre : texte »
export const pointsEnPhrases = (diapo) => {
  if (!Array.isArray(diapo?.points) || diapo.points.every((p) => typeof p === 'string')) return diapo
  const phrase = (p) => {
    const corps = [p.texte, p.aVerifier && `à vérifier : ${p.aVerifier}`, p.liste.join(', '), p.action].filter(Boolean).join(' — ')
    return p.titre && corps ? `${p.titre} : ${corps}` : (p.titre || corps)
  }
  return { ...diapo, points: normaliserPoints(diapo.points).map(phrase) }
}

// Composition v3 choisie selon le modèle et la quantité de contenu ; null si aucune ne convient
export const compositionV3 = (diapo) => {
  const points = normaliserPoints(diapo.points)
  if (!pointsStructures(points)) return null
  if (points.length === 4 && ['notion', 'objectifs'].includes(diapo.modele)) return convergence(diapo, points)
  if (points.length === 3 && ['etapes', 'notion'].includes(diapo.modele)) return circuit(diapo, points)
  return null
}

/**
 * Éléments d'une diapositive v3 : repères (progression, numéro), synthèse et composition.
 * @returns {{ elements: object[], scene: object|null } | null} null : la diapositive suit le thème Atelier visuel
 */
export const disposerV3 = (diapo, ctx) => {
  const composition = compositionV3(diapo)
  if (!composition) return null
  return { elements: [...reperes(diapo, ctx), ...synthese(diapo)], scene: composition }
}

// Repères ajoutés aux diapositives qui ne sont pas encore composées en v3
export const reperesV3 = (diapo, ctx) => reperes(diapo, ctx)

export const partiesDuScenario = (diaporama) => (Array.isArray(diaporama?.scenario?.parties) ? diaporama.scenario.parties : [])
  .filter((p) => p && typeof p === 'object' && texte(p.id) && texte(p.titre))
  .map((p) => ({ id: texte(p.id), titre: texte(p.titre) }))

export const maitresV3 = (plan, site) => {
  const repere = { taille: TAILLES.repere, couleur: COULEURS.texteDoux, role: 'repere', valign: 'middle' }
  return {
    COUVERTURE: {
      fond: COULEURS.fond,
      titre: { x: ZONES.titre.x, y: 1.6, w: 8.6, h: 2.6, taille: 48, valign: 'bottom', couleur: COULEURS.texte },
      elements: [bloc('site', { x: ZONES.titre.x, y: 6.9, w: 8, h: 0.34 }, site, { ...repere, gras: true })],
      numero: null,
    },
    CONTENU: {
      fond: COULEURS.fond,
      titre: { ...ZONES.titre, taille: TAILLES.titre, valign: 'middle', couleur: COULEURS.texte },
      elements: [bloc('site', ZONES.site, site, { ...repere, gras: true, align: 'right' })],
      numero: null,
    },
  }
}
