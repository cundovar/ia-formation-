// Scène « entonnoir » : le filtrage d'un ensemble.
// Les éléments entrent, le critère apparaît, puis les éléments retenus passent à droite (✓) ;
// les écartés restent à l'entrée, atténués, en pointillé et précédés de ✗.
import { TAILLE_REPERE, axeDe, boite, etat, etiquette, liaison, marge, repartir, texte } from './outils'

export const type = 'entonnoir'

const geometrie = (zone) => {
  const titre = 0.32
  if (axeDe(zone) === 'horizontal') {
    const w = (zone.w - 1.2) / 3.2
    const entree = { x: zone.x, y: zone.y + titre, w: w * 1.1, h: zone.h - titre }
    const critere = { x: entree.x + entree.w + 0.6, y: zone.y + titre, w: w, h: zone.h - titre }
    const sortie = { x: critere.x + critere.w + 0.6, y: zone.y + titre, w: w * 1.1, h: zone.h - titre }
    return { entree, critere, sortie, titre, axe: 'horizontal' }
  }
  // Lecture étroite : ensemble de départ, critère, retenus, de haut en bas
  const ecart = 0.2
  const hListe = Math.min(2.3, (zone.h - 3 * titre - 2 * ecart) * 0.36)
  const hCritere = zone.h - 3 * titre - 2 * ecart - 2 * hListe
  const entree = { x: zone.x, y: zone.y + titre, w: zone.w, h: hListe }
  const critere = { x: zone.x + zone.w * 0.07, y: entree.y + entree.h + ecart + titre, w: zone.w * 0.86, h: hCritere }
  const sortie = { x: zone.x, y: critere.y + critere.h + ecart + titre, w: zone.w, h: hListe }
  return { entree, critere, sortie, titre, axe: 'vertical' }
}

const enTete = (id, zone, libelle, titre, couleurs) => etiquette(id, { x: zone.x, y: zone.y - titre, w: zone.w, h: titre - 0.04 }, [libelle], {
  taille: TAILLE_REPERE, couleur: couleurs.texteDoux, role: 'repere', gras: true, align: 'left', valign: 'bottom',
})

export const etats = (donnees, { zone, couleurs }) => {
  const elements = (donnees.elements ?? []).map((e) => ({ libelle: texte(e?.libelle), retenu: e?.retenu === true }))
  const n = elements.length
  const g = geometrie(zone)
  const cases = repartir(g.entree, n, 'vertical', 0.08)
  const retenus = elements.map((e, i) => ({ ...e, i })).filter((e) => e.retenu)
  const ecartes = elements.filter((e) => !e.retenu)
  const casesSortie = repartir(g.sortie, n, 'vertical', 0.08)
  const critere = texte(donnees.critere)

  const puce = (id, zoneCase, libelle, style) => [
    boite(id, zoneCase, { fond: style.fond, bordure: style.bordure, epaisseur: style.epaisseur ?? 1, pointille: style.pointille, attenue: style.attenue, rayon: 0.1 }),
    etiquette(`${id}-texte`, marge(zoneCase, 0.04), [libelle], { couleur: couleurs.texte, attenue: style.attenue, align: 'left', gras: style.gras }),
  ]

  const dessiner = (etape) => {
    const resultat = etape >= 2
    const liste = [
      enTete('titre-entree', g.entree, 'Ensemble de départ', g.titre, couleurs),
      enTete('titre-sortie', g.sortie, 'Retenus', g.titre, couleurs),
    ]
    if (etape >= 1) {
      liste.push(
        enTete('titre-critere', g.critere, 'Critère', g.titre, couleurs),
        boite('critere', g.critere, {
          forme: 'trapeze', fond: etape === 1 ? couleurs.actif : couleurs.bloc,
          bordure: etape === 1 ? couleurs.actifBordure : couleurs.blocBordure, epaisseur: etape === 1 ? 3 : 1,
        }),
        etiquette('critere-texte', { x: g.critere.x + g.critere.w * 0.16, y: g.critere.y + 0.08, w: g.critere.w * 0.68, h: g.critere.h - 0.16 }, [critere], {
          couleur: couleurs.texte, gras: true,
        }),
      )
      const [x1, y1, x2, y2] = g.axe === 'horizontal'
        ? [g.entree.x + g.entree.w + 0.05, g.entree.y + g.entree.h / 2, g.critere.x - 0.05, g.critere.y + g.critere.h / 2]
        : [g.entree.x + g.entree.w / 2, g.entree.y + g.entree.h + 0.04, g.critere.x + g.critere.w / 2, g.critere.y - g.titre]
      liste.push(liaison('fleche-entree', x1, y1, x2, y2, { couleur: couleurs.trait }))
      if (resultat) {
        const [a1, b1, a2, b2] = g.axe === 'horizontal'
          ? [g.critere.x + g.critere.w + 0.05, g.critere.y + g.critere.h / 2, g.sortie.x - 0.05, g.sortie.y + g.sortie.h / 2]
          : [g.critere.x + g.critere.w / 2, g.critere.y + g.critere.h + 0.04, g.sortie.x + g.sortie.w / 2, g.sortie.y - g.titre]
        liste.push(liaison('fleche-sortie', a1, b1, a2, b2, { couleur: couleurs.trait, epaisseur: 3 }))
      }
    }
    elements.forEach((e, i) => {
      if (resultat && e.retenu) {
        const rang = retenus.findIndex((r) => r.i === i)
        liste.push(puce(`element-${i}`, casesSortie[rang], `✓ ${e.libelle}`, {
          fond: couleurs.actif, bordure: couleurs.actifBordure, epaisseur: 2, gras: true,
        }))
      } else if (resultat) {
        liste.push(puce(`element-${i}`, cases[i], `✗ ${e.libelle}`, {
          fond: couleurs.attenue, bordure: couleurs.blocBordure, pointille: true, attenue: true,
        }))
      } else {
        liste.push(puce(`element-${i}`, cases[i], e.libelle, { fond: couleurs.fiche, bordure: couleurs.ficheBordure }))
      }
    })
    return liste
  }

  return [
    etat(`${n} éléments entrent`, dessiner(0)),
    etat(`Le critère s'applique : ${critere}`, dessiner(1), 'Le critère s\'applique'),
    etat(`Retenus : ${retenus.map((r) => r.libelle).join(', ')}. Écartés : ${ecartes.map((r) => r.libelle).join(', ')}.`, dessiner(2),
      `${retenus.length} retenu${retenus.length > 1 ? 's' : ''}, ${ecartes.length} écarté${ecartes.length > 1 ? 's' : ''}`),
  ]
}
