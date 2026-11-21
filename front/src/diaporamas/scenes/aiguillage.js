// Scène « aiguillage » : une décision selon une condition, avec deux branches.
// La condition s'affiche, puis la fiche emprunte la branche choisie. La branche suivie est en trait
// plein, mise en évidence et précédée de ✓ ; l'autre est en pointillé,
// atténuée et précédée de ✗. La légende de l'étape nomme la branche suivie.
import { axeDe, boite, centre, etat, etiquette, fiche, liaison, texte } from './outils'

export const type = 'aiguillage'

const FICHE = { w: 2.0, h: 1.0 }

const geometrie = (zone) => {
  if (axeDe(zone) === 'horizontal') {
    const depart = { x: zone.x, y: zone.y + zone.h / 2 - FICHE.h / 2, ...FICHE }
    const hCondition = Math.min(zone.h, 2.0)
    const condition = { x: zone.x + 2.4, y: zone.y + (zone.h - hCondition) / 2, w: 3.0, h: hCondition }
    const x = condition.x + condition.w + 0.7
    const w = zone.x + zone.w - x
    const h = (zone.h - 0.25) / 2
    const branches = [0, 1].map((i) => ({ x, y: zone.y + i * (h + 0.25), w, h }))
    const textes = branches.map((b) => ({ x: b.x + 0.15, y: b.y + 0.05, w: b.w - FICHE.w - 0.45, h: b.h - 0.1 }))
    const places = branches.map((b) => ({ x: b.x + b.w - FICHE.w - 0.15, y: b.y + (b.h - FICHE.h) / 2, ...FICHE }))
    const liens = branches.map((b) => [condition.x + condition.w, centre(condition).y, b.x - 0.04, centre(b).y])
    return { depart, condition, branches, textes, places, liens }
  }
  const depart = { x: zone.x + (zone.w - 3.0) / 2, y: zone.y, w: 3.0, h: 0.95 }
  const condition = { x: zone.x, y: zone.y + 1.25, w: zone.w, h: 1.1 }
  const y = condition.y + condition.h + 0.4
  const h = zone.y + zone.h - y
  const w = (zone.w - 0.2) / 2
  const branches = [0, 1].map((i) => ({ x: zone.x + i * (w + 0.2), y, w, h }))
  const textes = branches.map((b) => ({ x: b.x + 0.08, y: b.y + 0.05, w: b.w - 0.16, h: b.h - FICHE.h - 0.2 }))
  const places = branches.map((b) => ({ x: b.x + 0.1, y: b.y + b.h - FICHE.h - 0.1, w: b.w - 0.2, h: FICHE.h }))
  const liens = branches.map((b) => [centre(condition).x, condition.y + condition.h, centre(b).x, b.y - 0.04])
  return { depart, condition, branches, textes, places, liens }
}

export const etats = (donnees, { zone, couleurs, variante = {} }) => {
  const branches = (donnees.branches ?? []).slice(0, 2).map((b) => ({ id: texte(b?.id), libelle: texte(b?.libelle) }))
  const g = geometrie(zone)
  const choix = variante.brancheSuivie ?? donnees.brancheSuivie
  const suivie = Math.max(0, branches.findIndex((b) => b.id === choix))
  const condition = texte(donnees.condition)
  const libelleFiche = texte(donnees.fiche) || 'Demande'

  const dessiner = (etape) => {
    const decide = etape >= 2
    return [
      boite('condition', g.condition, {
        fond: etape === 1 ? couleurs.actif : couleurs.bloc,
        bordure: etape === 1 ? couleurs.actifBordure : couleurs.blocBordure,
        epaisseur: etape === 1 ? 3 : 1,
      }),
      etiquette('condition-texte', { x: g.condition.x + 0.1, y: g.condition.y + 0.05, w: g.condition.w - 0.2, h: g.condition.h - 0.1 },
        [etape === 0 ? 'Condition ?' : condition], { couleur: couleurs.texte, gras: etape >= 1 }),
      ...branches.flatMap((b, i) => {
        const estSuivie = decide && i === suivie
        const nonSuivie = decide && i !== suivie
        let libelle = b.libelle
        if (estSuivie) libelle = `✓ ${b.libelle}`
        if (nonSuivie) libelle = `✗ ${b.libelle}`
        return [
          liaison(`lien-${i}`, ...g.liens[i], {
            couleur: couleurs.trait, epaisseur: estSuivie ? 3.5 : 1.5, pointille: !estSuivie, attenue: nonSuivie,
          }),
          boite(`branche-${i}`, g.branches[i], {
            fond: estSuivie ? couleurs.actif : couleurs.bloc,
            bordure: estSuivie ? couleurs.actifBordure : couleurs.blocBordure,
            epaisseur: estSuivie ? 3 : 1,
            pointille: nonSuivie,
            attenue: nonSuivie,
          }),
          etiquette(`branche-${i}-texte`, g.textes[i], [libelle], {
            couleur: couleurs.texte, gras: estSuivie, attenue: nonSuivie, align: 'left',
          }),
        ]
      }),
      fiche('fiche', decide ? g.places[suivie] : g.depart, libelleFiche, '', couleurs),
    ]
  }

  return [
    etat(`Une fiche arrive : ${libelleFiche}`, dessiner(0), 'Une fiche arrive'),
    etat(`La condition s'affiche : ${condition}`, dessiner(1), 'La condition s\'affiche'),
    etat(`Branche suivie : ${branches[suivie]?.libelle ?? ''}`, dessiner(2), `Branche suivie : ${branches[suivie]?.libelle ?? ''}`),
  ]
}
