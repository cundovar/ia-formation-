/**
 * Modèle d'un workflow et contrôle de sa cohérence, avant toute exécution.
 *
 * Workflow : { noeuds: [{ id, type, libelle?, config, position? }], liens: [{ id, source, sortie, cible }] }
 * `position` ne sert qu'à l'affichage : le moteur l'ignore.
 */
import { BLOCS, trouverBloc } from '../blocs/index.js'
import { creerErreur, LIMITES } from './erreurs.js'
import { cloner } from './cloner.js'

export function normaliser(definition = {}) {
  return {
    noeuds: (definition.noeuds ?? []).map((noeud) => ({
      id: String(noeud.id),
      type: noeud.type,
      libelle: noeud.libelle ?? '',
      config: cloner(noeud.config ?? {}),
      ...(noeud.position ? { position: { ...noeud.position } } : {}),
    })),
    liens: (definition.liens ?? []).map((lien) => ({
      id: String(lien.id ?? `${lien.source}:${lien.sortie ?? 'sortie'}->${lien.cible}`),
      source: String(lien.source),
      sortie: lien.sortie ?? 'sortie',
      cible: String(lien.cible),
    })),
  }
}

export const liensEntrants = (workflow, noeudId) => workflow.liens.filter((lien) => lien.cible === noeudId)
export const liensSortants = (workflow, noeudId) => workflow.liens.filter((lien) => lien.source === noeudId)

export const nomDuNoeud = (noeud, registre = BLOCS) => noeud.libelle || trouverBloc(noeud.type, registre)?.libelle || noeud.type

/**
 * Ordre d'exécution (tri topologique de Kahn), stable selon l'ordre des nœuds.
 * Renvoie { ordre, cycle } : `cycle` liste les nœuds pris dans une boucle.
 */
export function ordreTopologique(workflow) {
  const ids = workflow.noeuds.map((noeud) => noeud.id)
  const degre = Object.fromEntries(ids.map((id) => [id, 0]))
  workflow.liens.forEach((lien) => {
    if (lien.cible in degre && lien.source in degre) degre[lien.cible] += 1
  })
  const ordre = []
  const restants = new Set(ids)
  let prets = ids.filter((id) => degre[id] === 0)
  while (prets.length > 0) {
    const id = prets.shift()
    ordre.push(id)
    restants.delete(id)
    liensSortants(workflow, id).forEach((lien) => {
      if (!(lien.cible in degre)) return
      degre[lien.cible] -= 1
      if (degre[lien.cible] === 0) prets.push(lien.cible)
    })
    // Garder l'ordre des nœuds du workflow pour un journal prévisible
    prets = ids.filter((candidat) => prets.includes(candidat))
  }
  return { ordre, cycle: [...restants] }
}

// Nœuds accessibles depuis un nœud de départ, en suivant les liens
export function accessiblesDepuis(workflow, depart) {
  const vus = new Set([depart])
  const file = [depart]
  while (file.length > 0) {
    const id = file.shift()
    liensSortants(workflow, id).forEach((lien) => {
      if (!vus.has(lien.cible)) {
        vus.add(lien.cible)
        file.push(lien.cible)
      }
    })
  }
  return vus
}

/**
 * Contrôle un workflow. Renvoie une liste d'erreurs { code, message, noeudId?, lienId? } (vide si tout va bien).
 * `blocsDisponibles` limite les types autorisés dans un laboratoire.
 */
export function valider(workflow, { registre = BLOCS, blocsDisponibles = null } = {}) {
  const erreurs = []
  const { noeuds, liens } = workflow

  if (noeuds.length > LIMITES.noeuds) erreurs.push(creerErreur('TROP_DE_NOEUDS', `Un workflow ne peut pas dépasser ${LIMITES.noeuds} blocs.`))
  if (liens.length > LIMITES.liens) erreurs.push(creerErreur('TROP_DE_LIENS', `Un workflow ne peut pas dépasser ${LIMITES.liens} liens.`))

  const parId = new Map()
  noeuds.forEach((noeud) => {
    if (parId.has(noeud.id)) {
      erreurs.push(creerErreur('DOUBLON_ID', `Deux blocs portent l'identifiant « ${noeud.id} ».`, { noeudId: noeud.id }))
      return
    }
    parId.set(noeud.id, noeud)
    const bloc = trouverBloc(noeud.type, registre)
    if (!bloc) {
      erreurs.push(creerErreur('TYPE_INCONNU', `Le type de bloc « ${noeud.type} » n'existe pas.`, { noeudId: noeud.id }))
      return
    }
    if (blocsDisponibles && !blocsDisponibles.includes(noeud.type)) {
      erreurs.push(creerErreur('BLOC_NON_DISPONIBLE', `Le bloc « ${bloc.libelle} » n'est pas disponible dans ce laboratoire.`, { noeudId: noeud.id }))
    }
    bloc.verifierConfig(noeud.config ?? {}).forEach((message) => {
      erreurs.push(creerErreur('CONFIG_INVALIDE', `${nomDuNoeud(noeud, registre)} : ${message}`, { noeudId: noeud.id }))
    })
  })

  const declencheurs = noeuds.filter((noeud) => noeud.type === 'declencheur')
  if (declencheurs.length === 0) erreurs.push(creerErreur('DECLENCHEUR_MANQUANT', 'Ajoutez un déclencheur : c\'est lui qui démarre l\'automatisation.'))
  if (declencheurs.length > 1) {
    declencheurs.slice(1).forEach((noeud) => erreurs.push(creerErreur('DECLENCHEURS_MULTIPLES', 'Un workflow a un seul déclencheur.', { noeudId: noeud.id })))
  }

  const vus = new Set()
  liens.forEach((lien) => {
    const source = parId.get(lien.source)
    const cible = parId.get(lien.cible)
    if (!source || !cible) {
      erreurs.push(creerErreur('LIEN_INVALIDE', 'Un lien relie un bloc qui n\'existe plus.', { lienId: lien.id }))
      return
    }
    if (lien.source === lien.cible) {
      erreurs.push(creerErreur('LIEN_INVALIDE', `${nomDuNoeud(source, registre)} ne peut pas être relié à lui-même.`, { lienId: lien.id, noeudId: source.id }))
      return
    }
    const blocSource = trouverBloc(source.type, registre)
    const blocCible = trouverBloc(cible.type, registre)
    if (blocSource && !blocSource.sorties.some((sortie) => sortie.id === lien.sortie)) {
      erreurs.push(creerErreur('PORT_INVALIDE', `${nomDuNoeud(source, registre)} n'a pas de sortie « ${lien.sortie} ».`, { lienId: lien.id, noeudId: source.id }))
    }
    if (blocCible && blocCible.entrees.length === 0) {
      erreurs.push(creerErreur('PORT_INVALIDE', `${nomDuNoeud(cible, registre)} ne reçoit pas de données : il ne peut pas être la cible d'un lien.`, { lienId: lien.id, noeudId: cible.id }))
    }
    const cle = `${lien.source}|${lien.sortie}|${lien.cible}`
    if (vus.has(cle)) erreurs.push(creerErreur('LIEN_DOUBLON', 'Deux liens identiques relient les mêmes blocs.', { lienId: lien.id }))
    vus.add(cle)
  })

  noeuds.forEach((noeud) => {
    const bloc = trouverBloc(noeud.type, registre)
    if (bloc && bloc.entrees.length > 0 && liensEntrants(workflow, noeud.id).length === 0) {
      erreurs.push(creerErreur('ENTREE_MANQUANTE', `${nomDuNoeud(noeud, registre)} ne reçoit aucune donnée : reliez-le à un bloc précédent.`, { noeudId: noeud.id }))
    }
  })

  const { cycle } = ordreTopologique(workflow)
  if (cycle.length > 0) {
    erreurs.push(creerErreur('CYCLE', 'Le workflow tourne en boucle : un bloc renvoie ses données vers un bloc précédent. Supprimez un des liens de la boucle.', { noeudId: cycle[0], noeuds: cycle }))
  } else if (declencheurs.length === 1) {
    const accessibles = accessiblesDepuis(workflow, declencheurs[0].id)
    noeuds
      .filter((noeud) => !accessibles.has(noeud.id) && liensEntrants(workflow, noeud.id).length > 0)
      .forEach((noeud) => erreurs.push(creerErreur('NOEUD_INACCESSIBLE', `${nomDuNoeud(noeud, registre)} n'est pas relié au déclencheur : il ne s'exécutera jamais.`, { noeudId: noeud.id })))
  }

  if (!noeuds.some((noeud) => noeud.type === 'resultat')) {
    erreurs.push(creerErreur('RESULTAT_MANQUANT', 'Ajoutez un bloc Résultat pour voir les données finales.'))
  }

  return erreurs
}
