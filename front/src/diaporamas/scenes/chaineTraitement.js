// Scène « chaîne de traitement » : une fiche de données traverse des opérations.
// La fiche passe sous chaque bloc ; sa valeur change au bloc de transformation.
import { axeDe, boite, etat, etiquette, fiche, indice, liaison, marge, repartir, texte } from './outils'

export const type = 'chaine_traitement'

const geometrie = (zone, n) => {
  if (axeDe(zone) === 'horizontal') {
    const hBloc = 0.96
    const blocs = repartir({ x: zone.x, y: zone.y, w: zone.w, h: hBloc }, n, 'horizontal', 0.55)
    const hFiche = Math.min(1.4, zone.h - hBloc - 0.15)
    const fiches = blocs.map((b) => ({ x: b.x + 0.1, y: zone.y + zone.h - hFiche, w: b.w - 0.2, h: hFiche }))
    const fleches = blocs.slice(1).map((b, i) => {
      const a = blocs[i]
      return [a.x + a.w + 0.05, a.y + a.h / 2, b.x - 0.05, b.y + b.h / 2]
    })
    return { blocs, fiches, fleches }
  }
  // Lecture étroite : blocs en colonne à gauche, fiche à droite du bloc en cours
  const colonne = { x: zone.x, y: zone.y, w: zone.w * 0.46, h: zone.h }
  const blocs = repartir(colonne, n, 'vertical', 0.45)
  const fiches = blocs.map((b) => ({ x: zone.x + zone.w * 0.5, y: b.y, w: zone.w * 0.5, h: b.h }))
  const fleches = blocs.slice(1).map((b, i) => {
    const a = blocs[i]
    return [a.x + a.w / 2, a.y + a.h + 0.04, b.x + b.w / 2, b.y - 0.04]
  })
  return { blocs, fiches, fleches }
}

export const etats = (donnees, { zone, couleurs }) => {
  const blocs = (donnees.blocs ?? []).map((b) => texte(b?.libelle))
  const n = blocs.length
  const g = geometrie(zone, n)
  const transformation = indice(donnees.transformation?.bloc, n, n - 1)
  const libelleFiche = texte(donnees.fiche?.libelle)
  const avant = texte(donnees.fiche?.valeur)
  const apres = texte(donnees.transformation?.valeur)

  const dessiner = (position) => [
    ...g.blocs.flatMap((b, i) => {
      const actif = i === position
      return [
        boite(`bloc-${i}`, b, {
          fond: actif ? couleurs.actif : couleurs.bloc,
          bordure: actif ? couleurs.actifBordure : couleurs.blocBordure,
          epaisseur: actif ? 3 : 1,
        }),
        etiquette(`bloc-${i}-texte`, marge(b, 0.08), [blocs[i]], { couleur: couleurs.texte, gras: actif }),
      ]
    }),
    ...g.fleches.map(([x1, y1, x2, y2], i) => liaison(`fleche-${i}`, x1, y1, x2, y2, {
      couleur: couleurs.trait, epaisseur: i < position ? 3 : 1.5, pointille: i >= position,
    })),
    // La fiche garde le même identifiant : le rendu web la fait glisser d'un bloc à l'autre
    fiche('fiche', g.fiches[position], libelleFiche, position >= transformation ? apres : avant, couleurs),
  ]

  return blocs.map((libelle, i) => {
    let legende = `La fiche passe par « ${libelle} » : ${i >= transformation ? apres : avant}`
    let court = `La fiche passe par « ${libelle} »`
    if (i === 0) {
      legende = `La fiche entre dans « ${libelle} » : ${i >= transformation ? apres : avant}`
      court = `La fiche entre dans « ${libelle} »`
    }
    if (i === transformation) {
      legende = `« ${libelle} » transforme la valeur : ${avant} devient ${apres}`
      court = `« ${libelle} » transforme la valeur`
    }
    return etat(legende, dessiner(i), court)
  })
}
