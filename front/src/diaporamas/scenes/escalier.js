// Scène « escalier » : une progression réelle en plusieurs étapes.
// Les marches apparaissent une à une ; un repère (cadre vert sauge) avance sur la marche en cours.
import { TAILLE, axeDe, boite, etat, etiquette, indice, marge, repartir, texte } from './outils'

export const type = 'escalier'

const geometrie = (zone, n) => {
  const axe = axeDe(zone)
  if (axe === 'horizontal') {
    // Marches posées sur une même ligne de base, de plus en plus hautes
    const cellules = repartir(zone, n, 'horizontal', 0.22)
    const hMin = Math.min(zone.h, 1.45)
    return cellules.map((c, i) => {
      const h = n === 1 ? zone.h : hMin + ((zone.h - hMin) * i) / (n - 1)
      return { ...c, y: zone.y + zone.h - h, h }
    })
  }
  // Lecture étroite : barres empilées du bas vers le haut, de plus en plus larges
  const cellules = repartir(zone, n, 'vertical', 0.16).reverse()
  const wMin = Math.min(zone.w, zone.w * 0.62)
  return cellules.map((c, i) => {
    const w = n === 1 ? zone.w : wMin + ((zone.w - wMin) * i) / (n - 1)
    return { ...c, w }
  })
}

export const etats = (donnees, { zone, couleurs }) => {
  const marches = (donnees.marches ?? []).map((m) => texte(m?.libelle))
  const n = marches.length
  const cellules = geometrie(zone, n)
  const repereFinal = indice(donnees.repere, n, n - 1)

  const dessiner = (visibles, repere) => cellules.slice(0, visibles).flatMap((c, i) => {
    const active = i === repere
    return [
      boite(`marche-${i}`, c, {
        fond: active ? couleurs.actif : couleurs.bloc,
        bordure: active ? couleurs.actifBordure : couleurs.blocBordure,
        epaisseur: active ? 3 : 1,
      }),
      etiquette(`marche-${i}-texte`, marge(c, 0.1), [marches[i]], {
        taille: TAILLE, couleur: couleurs.texte, gras: active, valign: 'top',
      }),
    ]
  })

  const liste = marches.map((libelle, i) => etat(`Marche ${i + 1} sur ${n} : ${libelle}`, dessiner(i + 1, i), `Marche ${i + 1} : ${libelle}`))
  if (repereFinal !== n - 1) {
    liste.push(etat(`Vous êtes ici : marche ${repereFinal + 1}, ${marches[repereFinal]}`, dessiner(n, repereFinal), `Vous êtes ici : ${marches[repereFinal]}`))
  }
  return liste
}
