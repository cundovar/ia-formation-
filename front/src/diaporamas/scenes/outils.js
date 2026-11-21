// Primitives des scènes : les mêmes éléments que la mise en page (formes, textes) plus des liaisons.
// Chaque primitive porte un identifiant stable : d'une étape à l'autre, le rendu web anime l'élément
// qui garde le même identifiant (déplacement, apparition, mise en évidence).
// Fonctions pures, sans Vue ni réseau (règle ESLint de front/src/diaporamas/scenes).

export const TAILLE = 24 // texte projeté : 24 points au moins (DIA-05)
export const TAILLE_REPERE = 14

export const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '')

export const boite = (id, zone, { fond, bordure = null, epaisseur = 1, pointille = false, rayon = 0.16, forme = 'roundRect', attenue = false } = {}) => ({
  type: 'forme', id, forme, ...zone, fond, bordure, epaisseur, pointille, rayon, attenue,
})

export const etiquette = (id, zone, contenu, { taille = TAILLE, gras = false, couleur, align = 'center', valign = 'middle', attenue = false, role = 'scene' } = {}) => ({
  type: 'texte',
  id,
  role,
  ...zone,
  paragraphes: (Array.isArray(contenu) ? contenu : [contenu]).filter((t) => t !== '').map((t) => ({ texte: t, puce: null, lien: null })),
  taille,
  gras,
  couleur,
  align,
  valign,
  attenue,
})

export const liaison = (id, x1, y1, x2, y2, { couleur, epaisseur = 2, pointille = false, fleche = true, attenue = false } = {}) => ({
  type: 'ligne', id, x1, y1, x2, y2, couleur, epaisseur, pointille, fleche, attenue,
})

// Découpe une zone en `n` cellules le long d'un axe, avec un écart entre elles
export const repartir = (zone, n, axe = 'horizontal', ecart = 0.3) => {
  const nombre = Math.max(1, n)
  if (axe === 'horizontal') {
    const w = (zone.w - ecart * (nombre - 1)) / nombre
    return Array.from({ length: nombre }, (_, i) => ({ x: zone.x + i * (w + ecart), y: zone.y, w, h: zone.h }))
  }
  const h = (zone.h - ecart * (nombre - 1)) / nombre
  return Array.from({ length: nombre }, (_, i) => ({ x: zone.x, y: zone.y + i * (h + ecart), w: zone.w, h }))
}

export const marge = (zone, m) => ({ x: zone.x + m, y: zone.y + m, w: Math.max(0, zone.w - 2 * m), h: Math.max(0, zone.h - 2 * m) })

export const centre = (zone) => ({ x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 })

// Une zone horizontale (projection) ou verticale (lecture étroite, mobile)
export const axeDe = (zone) => (zone.w >= zone.h * 1.15 ? 'horizontal' : 'vertical')

// Carte « fiche » (la donnée qui circule). Avec une valeur : libellé en repère (petit, en haut) et valeur
// en grand ; sans valeur : le libellé en grand.
export const fiche = (id, zone, libelle, valeur, couleurs, { attenue = false } = {}) => {
  const avecValeur = texte(valeur) !== ''
  return [
    boite(`${id}`, zone, { fond: couleurs.fiche, bordure: couleurs.ficheBordure, epaisseur: 1.5, rayon: 0.12, attenue }),
    ...(avecValeur
      ? [
          etiquette(`${id}-libelle`, { x: zone.x + 0.08, y: zone.y + 0.04, w: zone.w - 0.16, h: 0.28 }, [texte(libelle)], {
            taille: TAILLE_REPERE, couleur: couleurs.texteDoux, role: 'repere', attenue,
          }),
          etiquette(`${id}-texte`, { x: zone.x + 0.08, y: zone.y + 0.32, w: zone.w - 0.16, h: zone.h - 0.38 }, [texte(valeur)], {
            couleur: couleurs.texte, gras: true, attenue,
          }),
        ]
      : [etiquette(`${id}-texte`, marge(zone, 0.06), [texte(libelle)], { couleur: couleurs.texte, attenue })]),
  ]
}

// Les états se décrivent par la liste des éléments visibles : un élément absent est masqué.
// `legende` : phrase complète (liste des étapes, lecteur d'écran, notes) ; `court` : légende projetée,
// sur une ligne (45 caractères environ).
export const etat = (legende, elements, court = legende) => ({ legende, court, elements: elements.flat().filter(Boolean) })

export const indice = (valeur, longueur, parDefaut = 0) => (Number.isInteger(valeur) && valeur >= 0 && valeur < longueur ? valeur : parDefaut)
