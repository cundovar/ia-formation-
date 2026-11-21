// Scène « sas de validation » : un accord humain avant une action.
// La fiche arrive et s'arrête au sas. Avec l'accord (simulé), elle passe et l'action se fait ;
// avec le refus, elle reste au sas, l'action est barrée (✗, pointillé) et la légende dit « bloquée ».
import { axeDe, boite, etat, etiquette, fiche, liaison, marge, repartir, texte } from './outils'

export const type = 'sas_validation'

const geometrie = (zone) => {
  if (axeDe(zone) === 'horizontal') {
    const hHaut = Math.min(1.8, zone.h - 0.75)
    const colonnes = repartir({ x: zone.x, y: zone.y, w: zone.w, h: hHaut }, 4, 'horizontal', 0.35)
    const voies = colonnes.map((c) => ({ x: c.x + 0.1, y: zone.y + zone.h - 0.6, w: c.w - 0.2, h: 0.6 }))
    return { depart: colonnes[0], sas: colonnes[1], action: colonnes[2], issue: colonnes[3], voies, axe: 'horizontal' }
  }
  const lignes = repartir(zone, 4, 'vertical', 0.25)
  const boites = lignes.map((l) => ({ x: l.x, y: l.y, w: l.w * 0.58, h: l.h }))
  const voies = lignes.map((l) => ({ x: l.x + l.w * 0.63, y: l.y + (l.h - Math.min(l.h, 0.6)) / 2, w: l.w * 0.37, h: Math.min(l.h, 0.6) }))
  return { depart: boites[0], sas: boites[1], action: boites[2], issue: boites[3], voies, axe: 'vertical' }
}

export const etats = (donnees, { zone, couleurs, variante = {} }) => {
  const g = geometrie(zone)
  const decision = (variante.decision ?? donnees.decision) === 'refus' ? 'refus' : 'accord'
  const libelleFiche = texte(donnees.fiche) || 'Fiche'
  const action = texte(donnees.action)
  const question = texte(donnees.question)
  const suite = decision === 'accord' ? texte(donnees.suiteAccord) : texte(donnees.suiteRefus)

  const liens = g.axe === 'horizontal'
    ? [[g.depart, g.sas], [g.sas, g.action], [g.action, g.issue]].map(([a, b]) => [a.x + a.w + 0.04, a.y + a.h / 2, b.x - 0.04, b.y + b.h / 2])
    : [[g.depart, g.sas], [g.sas, g.action], [g.action, g.issue]].map(([a, b]) => [a.x + a.w / 2, a.y + a.h + 0.03, b.x + b.w / 2, b.y - 0.03])

  const dessiner = (etape) => {
    const decide = etape >= 2
    const bloque = decide && decision === 'refus'
    const passe = decide && decision === 'accord'
    const position = passe ? 2 : (etape >= 1 ? 1 : 0)
    return [
      boite('depart', g.depart, { fond: couleurs.bloc, bordure: couleurs.blocBordure }),
      etiquette('depart-texte', marge(g.depart, 0.08), ['Préparation'], { couleur: couleurs.texte }),
      boite('sas', g.sas, {
        fond: etape === 1 ? couleurs.actif : couleurs.bloc,
        bordure: etape === 1 ? couleurs.actifBordure : couleurs.blocBordure,
        epaisseur: etape >= 1 ? 3.5 : 1,
      }),
      etiquette('sas-texte', marge(g.sas, 0.08), [etape >= 1 ? question : 'Sas de validation'], { couleur: couleurs.texte, gras: etape >= 1 }),
      boite('action', g.action, {
        fond: passe ? couleurs.actif : couleurs.bloc,
        bordure: passe ? couleurs.actifBordure : couleurs.blocBordure,
        epaisseur: passe ? 3 : 1,
        pointille: bloque,
        attenue: bloque,
      }),
      etiquette('action-texte', marge(g.action, 0.08), [bloque ? `✗ ${action}` : (passe ? `✓ ${action}` : action)], {
        couleur: couleurs.texte, gras: passe, attenue: bloque,
      }),
      liaison('lien-0', ...liens[0], { couleur: couleurs.trait, epaisseur: 2 }),
      liaison('lien-1', ...liens[1], { couleur: couleurs.trait, epaisseur: passe ? 3.5 : 1.5, pointille: !passe, attenue: bloque }),
      ...(decide
        ? [
            liaison('lien-2', ...liens[2], { couleur: couleurs.trait, epaisseur: passe ? 3 : 1.5, pointille: bloque }),
            boite('issue', g.issue, {
              fond: passe ? couleurs.actif : couleurs.attenue,
              bordure: passe ? couleurs.actifBordure : couleurs.blocBordure,
              epaisseur: 2,
              pointille: bloque,
            }),
            etiquette('issue-texte', marge(g.issue, 0.08), [suite], { couleur: couleurs.texte }),
          ]
        : []),
      fiche('fiche', g.voies[position], libelleFiche, '', couleurs),
    ]
  }

  return [
    etat(`La fiche arrive : ${libelleFiche}`, dessiner(0), 'La fiche arrive'),
    etat(`La fiche s'arrête au sas : ${question}`, dessiner(1), 'Arrêt au sas : accord attendu'),
    decision === 'accord'
      ? etat(`Accord donné (simulé) : ${action}. ${suite}`, dessiner(2), 'Accord (simulé) : l\'action se fait')
      : etat(`Refus (simulé) : l'action reste bloquée. ${suite}`, dessiner(2), 'Refus (simulé) : action bloquée'),
  ]
}
