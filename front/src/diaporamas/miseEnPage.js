// Mise en page des diaporamas, en fonctions pures : le contenu structuré (docs/PLAN_DIAPORAMAS.md § 4)
// devient une liste d'éléments positionnés (formes, textes, images), sans PptxGenJS ni Vue.
// La même mise en page servira au .pptx et à la vue d'impression (PDF).
import { estModeleConnu } from './modeles'
import { COULEURS, ESPACE_PARAGRAPHE, LICENCE, TAILLES, ZONES, couleursPublic } from './theme'

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '')
const liste = (valeur) => (Array.isArray(valeur) ? valeur.map(texte).filter(Boolean) : [])
const lienSur = (url) => (/^https?:\/\//i.test(texte(url)) ? texte(url) : null)

// Moins de points, texte plus grand ; jamais sous 24 points (DIA-05)
const tailleCorps = (nombre) => (nombre <= 3 ? TAILLES.corps : TAILLES.corpsDense)

// Hauteur approchée d'une liste, en pouces : un caractère d'Arial mesure en moyenne une demi-taille
// de police, une ligne 1,2 fois la taille. Sert à ajuster les cartes à leur contenu.
export const hauteurTexte = (paragraphes, largeur, taille) => {
  const ligne = (taille * 1.2) / 72
  const caracteresParLigne = Math.max(1, Math.floor(largeur / ((taille * 0.5) / 72)))
  const lignes = paragraphes.reduce((total, p) => total + Math.max(1, Math.ceil((p.texte.length + 3) / caracteresParLigne)), 0)
  return lignes * ligne + Math.max(0, paragraphes.length - 1) * (ESPACE_PARAGRAPHE / 72)
}

// Carte ajustée à son contenu, entre 2 pouces et toute la zone de contenu
const hauteurCarte = (paragraphes, largeur, taille, marges) => Math.min(C.h, Math.max(2, hauteurTexte(paragraphes, largeur, taille) + marges))

const forme = (type, zone, fond, bordure = null) => ({ type: 'forme', forme: type, ...zone, fond, bordure })

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

const paragraphe = (contenu, puce = null, lien = null) => ({ texte: contenu, puce, lien })

const puces = (points, puce) => points.map((point) => paragraphe(point, puce))

const C = ZONES.corps

const PUBLICS = {
  apprendre: 'Pour apprendre à utiliser l\'IA',
  former: 'Pour former à l\'IA',
}

const duree = (valeur) => {
  if (typeof valeur === 'number' && valeur > 0) return `${valeur} min`
  return texte(valeur)
}

const titre = (diapo, ctx) => [
  forme('ellipse', { x: 9.9, y: -1.4, w: 4.8, h: 4.8 }, ctx.couleurs.accent),
  forme('ellipse', { x: 11.7, y: 4.9, w: 2.4, h: 2.4 }, ctx.couleurs.trait),
  ...(texte(diapo.sousTitre) || texte(ctx.diaporama.sousTitre)
    ? [bloc({ x: 0.9, y: 3.85, w: 9.6, h: 0.9 }, [paragraphe(texte(diapo.sousTitre) || texte(ctx.diaporama.sousTitre))], {
        taille: TAILLES.sousTitreCouverture, couleur: ctx.couleurs.fonce,
      })]
    : []),
  bloc({ x: 0.9, y: 4.85, w: 9.6, h: 0.6 }, [paragraphe(
    [texte(diapo.public) || PUBLICS[ctx.audience], duree(diapo.duree)].filter(Boolean).join(' · '),
  )], { taille: TAILLES.corpsDense, couleur: COULEURS.texteDoux }),
]

const objectifs = (diapo) => {
  const points = liste(diapo.points)
  return [bloc(C, puces(points, 'coche'), { taille: tailleCorps(points.length) })]
}

const notion = (diapo, ctx) => {
  const points = liste(diapo.points)
  const taille = tailleCorps(points.length)
  const paragraphes = puces(points, 'point')
  const h = hauteurCarte(paragraphes, C.w - 0.8, taille, 0.9)
  return [
    forme('rect', { ...C, h }, COULEURS.carte, COULEURS.bordure),
    forme('rect', { x: C.x, y: C.y, w: 0.12, h }, ctx.couleurs.trait),
    bloc({ x: C.x + 0.45, y: C.y + 0.35, w: C.w - 0.8, h: h - 0.7 }, paragraphes, { taille, valign: 'middle' }),
  ]
}

const etapes = (diapo, ctx) => {
  const points = liste(diapo.points)
  const ligne = Math.min(1.15, C.h / Math.max(points.length, 1))
  const rond = Math.min(0.75, ligne - 0.15)
  return points.flatMap((point, index) => {
    const y = C.y + index * ligne
    const zoneRond = { x: C.x, y: y + (ligne - rond) / 2, w: rond, h: rond }
    return [
      forme('ellipse', zoneRond, ctx.couleurs.accent),
      bloc(zoneRond, [paragraphe(String(index + 1))], {
        taille: TAILLES.corpsDense, gras: true, couleur: ctx.couleurs.fonce, align: 'center', valign: 'middle',
      }),
      bloc({ x: C.x + rond + 0.35, y, w: C.w - rond - 0.35, h: ligne }, [paragraphe(point)], {
        taille: tailleCorps(points.length), valign: 'middle',
      }),
    ]
  })
}

const comparaison = (diapo) => {
  const colonnes = (Array.isArray(diapo.colonnes) ? diapo.colonnes : []).slice(0, 2)
  const ecart = 0.5
  const largeur = (C.w - ecart) / 2
  const listes = colonnes.map((colonne) => puces(liste(colonne?.points), 'point'))
  // Les deux cartes ont la même hauteur : celle de la plus remplie
  const h = Math.max(...listes.map((paragraphes) => hauteurCarte(paragraphes, largeur - 0.7, TAILLES.corpsDense, 1.4)), 2)
  return colonnes.flatMap((colonne, index) => {
    const style = index === 0 ? COULEURS.aFaire : COULEURS.aEviter
    const x = C.x + index * (largeur + ecart)
    return [
      forme('rect', { x, y: C.y, w: largeur, h }, style.fond, style.bordure),
      bloc({ x: x + 0.35, y: C.y + 0.25, w: largeur - 0.7, h: 0.7 }, [paragraphe(texte(colonne?.titre))], {
        taille: TAILLES.intertitre, gras: true, couleur: style.titre, role: 'intertitre',
      }),
      bloc({ x: x + 0.35, y: C.y + 1.05, w: largeur - 0.7, h: h - 1.3 }, listes[index], {
        taille: TAILLES.corpsDense,
      }),
    ]
  })
}

// Image contenue dans sa zone, centrée, sans déformation
const contenir = (zone, image) => {
  if (!(image?.largeur > 0 && image?.hauteur > 0)) return zone
  const echelle = Math.min(zone.w / image.largeur, zone.h / image.hauteur)
  const w = image.largeur * echelle
  const h = image.hauteur * echelle
  return { x: zone.x + (zone.w - w) / 2, y: zone.y + (zone.h - h) / 2, w, h }
}

const capture = (diapo, ctx) => {
  const points = liste(diapo.points)
  const image = ctx.images?.[diapo.capture]
  const zoneImage = points.length > 0
    ? { x: C.x, y: C.y, w: 7.9, h: 4.3 }
    : { x: C.x, y: C.y, w: C.w, h: 4.3 }
  const elements = image?.data
    ? [{ type: 'image', ...contenir(zoneImage, image), data: image.data, alt: texte(image.alt) || texte(diapo.titre) }]
    : [
        forme('rect', zoneImage, COULEURS.carte, COULEURS.bordure),
        bloc(zoneImage, [paragraphe(`Capture à ajouter (n° ${diapo.capture ?? '?'})`)], {
          taille: TAILLES.corpsDense, couleur: COULEURS.texteDoux, align: 'center', valign: 'middle',
        }),
      ]
  const source = [texte(image?.legende), [texte(image?.source), texte(image?.date)].filter(Boolean).join(', ')]
    .filter(Boolean).join(' — ')
  if (source) {
    elements.push(bloc({ x: zoneImage.x, y: C.y + 4.4, w: zoneImage.w, h: 0.35 }, [paragraphe(source)], {
      taille: TAILLES.repere, couleur: COULEURS.texteDoux, role: 'repere',
    }))
  }
  if (points.length > 0) {
    elements.push(bloc({ x: C.x + 8.3, y: C.y, w: C.w - 8.3, h: 4.3 }, puces(points, 'point'), {
      taille: TAILLES.corpsDense, valign: 'middle',
    }))
  }
  return elements
}

const exercice = (diapo, ctx) => {
  const points = liste(diapo.points)
  const elements = [
    forme('roundRect', { x: C.x, y: C.y, w: 3.6, h: 0.65 }, ctx.couleurs.accent),
    bloc({ x: C.x, y: C.y, w: 3.6, h: 0.65 }, [paragraphe('À vous de jouer')], {
      taille: TAILLES.corpsDense, gras: true, couleur: ctx.couleurs.fonce, align: 'center', valign: 'middle',
    }),
  ]
  if (duree(diapo.duree)) {
    elements.push(
      forme('roundRect', { x: C.x + 3.9, y: C.y, w: 2.2, h: 0.65 }, COULEURS.carte, COULEURS.bordure),
      bloc({ x: C.x + 3.9, y: C.y, w: 2.2, h: 0.65 }, [paragraphe(duree(diapo.duree))], {
        taille: TAILLES.corpsDense, couleur: COULEURS.texte, align: 'center', valign: 'middle',
      }),
    )
  }
  elements.push(bloc({ x: C.x, y: C.y + 0.95, w: C.w, h: 1.5 }, [paragraphe(texte(diapo.consigne))], {
    taille: TAILLES.intertitre, gras: true,
  }))
  if (points.length > 0) {
    elements.push(bloc({ x: C.x, y: C.y + 2.55, w: C.w, h: C.h - 2.55 }, puces(points, 'point'), {
      taille: TAILLES.corpsDense,
    }))
  }
  return elements
}

const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F']

const question = (diapo, ctx) => {
  const reponses = liste(diapo.reponses).slice(0, LETTRES.length)
  const debut = C.y + 1.7
  const ligne = Math.min(0.8, (C.y + C.h - debut) / Math.max(reponses.length, 1))
  return [
    forme('rect', { x: C.x, y: C.y, w: C.w, h: 1.4 }, COULEURS.carte, COULEURS.bordure),
    bloc({ x: C.x + 0.35, y: C.y, w: C.w - 0.7, h: 1.4 }, [paragraphe(texte(diapo.question))], {
      taille: TAILLES.intertitre, gras: true, valign: 'middle',
    }),
    ...reponses.flatMap((reponse, index) => {
      const y = debut + index * ligne
      const pastille = { x: C.x, y: y + (ligne - 0.6) / 2, w: 0.6, h: 0.6 }
      return [
        forme('roundRect', pastille, ctx.couleurs.accent),
        bloc(pastille, [paragraphe(LETTRES[index])], {
          taille: TAILLES.corpsDense, gras: true, couleur: ctx.couleurs.fonce, align: 'center', valign: 'middle',
        }),
        bloc({ x: C.x + 0.9, y, w: C.w - 0.9, h: ligne }, [paragraphe(reponse)], {
          taille: TAILLES.corpsDense, valign: 'middle',
        }),
      ]
    }),
  ]
}

const aRetenir = (diapo, ctx) => {
  const points = liste(diapo.points)
  const taille = tailleCorps(points.length)
  const paragraphes = puces(points, 'coche')
  const h = hauteurCarte(paragraphes, C.w - 0.9, taille, 0.9)
  return [
    forme('rect', { ...C, h }, ctx.couleurs.pastel),
    bloc({ x: C.x + 0.45, y: C.y + 0.35, w: C.w - 0.9, h: h - 0.7 }, paragraphes, {
      taille, couleur: COULEURS.texte, valign: 'middle',
    }),
  ]
}

const fin = (diapo, ctx) => {
  const elements = []
  const lien = lienSur(diapo.lien)
  if (lien) {
    elements.push(bloc({ x: C.x, y: C.y, w: C.w, h: 0.8 }, [paragraphe(`Cours complet : ${lien}`, null, lien)], {
      taille: TAILLES.corpsDense,
    }))
  }
  const sources = (Array.isArray(diapo.sources) ? diapo.sources : [])
    .map((source) => ({ libelle: texte(source?.libelle), url: lienSur(source?.url) }))
    .filter((source) => source.libelle)
    .slice(0, 4)
  if (sources.length > 0) {
    elements.push(
      bloc({ x: C.x, y: C.y + 0.9, w: C.w, h: 0.55 }, [paragraphe('Sources')], {
        taille: TAILLES.intertitre, gras: true, couleur: ctx.couleurs.fonce, role: 'intertitre',
      }),
      bloc({ x: C.x, y: C.y + 1.45, w: C.w, h: 1.75 }, sources.map((source) => paragraphe(source.libelle, 'point', source.url)), {
        taille: TAILLES.corpsDense,
      }),
    )
  }
  if (texte(diapo.date)) {
    elements.push(bloc({ x: C.x, y: C.y + 3.2, w: C.w, h: 0.5 }, [paragraphe(`Diaporama du ${texte(diapo.date)}`)], {
      taille: TAILLES.corpsDense, couleur: COULEURS.texteDoux,
    }))
  }
  elements.push(
    forme('rect', { x: C.x, y: C.y + 3.75, w: C.w, h: 1.0 }, ctx.couleurs.pastel),
    bloc({ x: C.x + 0.3, y: C.y + 3.75, w: C.w - 0.6, h: 1.0 }, [paragraphe(LICENCE)], {
      taille: TAILLES.corpsDense, valign: 'middle',
    }),
  )
  return elements
}

const DISPOSITIONS = {
  titre,
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

// Décor commun des deux masques : la couverture et les diapositives de contenu.
// `titre` est l'emplacement du titre (lu par les lecteurs d'écran dans PowerPoint).
export const maitres = (plan, site) => {
  const couleurs = couleursPublic(plan.audience)
  const repere = { taille: TAILLES.repere, couleur: COULEURS.texteDoux, role: 'repere', valign: 'middle' }
  return {
    COUVERTURE: {
      fond: couleurs.pastel,
      titre: { x: 0.9, y: 1.6, w: 9.6, h: 2.1, taille: TAILLES.titreCouverture, valign: 'bottom', couleur: couleurs.fonce },
      elements: [bloc({ x: 0.9, y: 6.7, w: 8, h: 0.4 }, [paragraphe(site)], repere)],
      numero: null,
    },
    CONTENU: {
      fond: COULEURS.fond,
      titre: { ...ZONES.titre, taille: TAILLES.titre, valign: 'middle', couleur: couleurs.fonce },
      elements: [
        forme('rect', ZONES.bandeau, couleurs.accent),
        forme('rect', ZONES.trait, couleurs.trait),
        forme('rect', ZONES.filet, COULEURS.bordure),
        bloc(ZONES.pied, [paragraphe(plan.titre)], repere),
      ],
      numero: { ...ZONES.numero, taille: TAILLES.repere, couleur: COULEURS.texteDoux },
    },
  }
}

const TITRES_PAR_DEFAUT = { fin: 'Pour aller plus loin', a_retenir: 'À retenir', objectifs: 'Ce que vous saurez faire' }

/**
 * @param {object} diaporama contenu structuré : { titre, sousTitre, audience, diapositives: [...] }
 * @param {{ images?: Record<string, { data: string, largeur?: number, hauteur?: number, alt?: string, legende?: string, source?: string, date?: string }> }} options
 */
export const planDiaporama = (diaporama, { images = {} } = {}) => {
  const audience = diaporama?.audience === 'former' ? 'former' : 'apprendre'
  const ctx = { diaporama: diaporama ?? {}, audience, couleurs: couleursPublic(audience), images }
  const titreDiaporama = texte(diaporama?.titre) || 'Diaporama'
  const diapositives = (Array.isArray(diaporama?.diapositives) ? diaporama.diapositives : [])
    .filter((diapo) => diapo && typeof diapo === 'object')
    .map((diapo) => {
      // Un modèle inconnu (contenu plus récent que le site, par exemple) s'affiche comme une notion
      const modele = estModeleConnu(diapo.modele) ? diapo.modele : 'notion'
      return {
        modele,
        maitre: modele === 'titre' ? 'COUVERTURE' : 'CONTENU',
        // DIA-05 : chaque diapositive a un titre
        titre: texte(diapo.titre) || TITRES_PAR_DEFAUT[modele] || titreDiaporama,
        notes: texte(diapo.notes),
        elements: DISPOSITIONS[modele](diapo, ctx),
      }
    })
  return { titre: titreDiaporama, audience, diapositives }
}

export const nomFichier = (titre, extension = 'pptx') => {
  const base = texte(titre).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  return `${base || 'diaporama'}.${extension}`
}
