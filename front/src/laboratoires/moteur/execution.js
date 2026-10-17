/**
 * Exécution pas à pas d'un workflow : fonctions pures, sans interface, sans réseau, sans stockage.
 *
 * `creerExecution` prépare l'état ; `etapeSuivante` exécute un bloc et renvoie un nouvel état
 * (l'ancien n'est jamais modifié). Les blocs peuvent renvoyer une promesse : un futur bloc
 * relié à un vrai service s'y branchera sans changer ce moteur.
 *
 * Statuts : 'pret' → 'en_cours' → 'termine' | 'erreur'. 'invalide' si le workflow a des erreurs.
 * État d'un bloc : 'attente', 'ok', 'ignore' (branche non prise), 'erreur'.
 */
import { BLOCS, trouverBloc } from '../blocs/index.js'
import { ErreurExecution, LIMITES } from './erreurs.js'
import { liensEntrants, liensSortants, nomDuNoeud, normaliser, ordreTopologique, valider } from './workflow.js'
import { cloner } from './cloner.js'

export const STATUTS_FINAUX = ['termine', 'erreur', 'invalide']

export function creerExecution(definition, jeu = { donnees: {} }, { registre = BLOCS, blocsDisponibles = null, simulateurs = {} } = {}) {
  const workflow = normaliser(definition)
  const erreursValidation = valider(workflow, { registre, blocsDisponibles })
  const { ordre } = ordreTopologique(workflow)
  return {
    workflow,
    jeu: cloner(jeu),
    // Services fictifs du laboratoire (API, outils…) : décrits dans sa définition, jamais appelés en vrai
    simulateurs: cloner(simulateurs ?? {}),
    statut: erreursValidation.length > 0 ? 'invalide' : 'pret',
    erreursValidation,
    ordre,
    index: 0,
    etats: Object.fromEntries(workflow.noeuds.map((noeud) => [noeud.id, 'attente'])),
    entrees: {},
    sorties: {},
    liensActifs: {},
    journal: [],
    resultat: null,
    erreur: null,
    compteurEtapes: 0,
  }
}

export const estTerminee = (execution) => STATUTS_FINAUX.includes(execution.statut)

// Données reçues par un bloc : celles des liens actifs, fusionnées dans l'ordre des liens
function entreeDuNoeud(execution, noeudId) {
  const actifs = liensEntrants(execution.workflow, noeudId).filter((lien) => execution.liensActifs[lien.id])
  if (actifs.length === 0) return null
  if (actifs.length === 1) return cloner(execution.sorties[actifs[0].source])
  return actifs.reduce((fusion, lien) => ({ ...fusion, ...cloner(execution.sorties[lien.source]) }), {})
}

const tailleJson = (donnees) => JSON.stringify(donnees ?? null).length

export async function etapeSuivante(execution, { registre = BLOCS } = {}) {
  if (estTerminee(execution)) return execution
  const suivante = cloner(execution)
  suivante.statut = 'en_cours'
  suivante.compteurEtapes += 1

  if (suivante.compteurEtapes > LIMITES.etapes) {
    suivante.statut = 'erreur'
    suivante.erreur = { code: 'ETAPES_MAX', message: `L'exécution dépasse ${LIMITES.etapes} étapes : elle a été arrêtée.` }
    return suivante
  }

  const noeudId = suivante.ordre[suivante.index]
  const noeud = suivante.workflow.noeuds.find((candidat) => candidat.id === noeudId)
  const bloc = trouverBloc(noeud.type, registre)
  const nom = nomDuNoeud(noeud, registre)
  const entree = noeud.type === 'declencheur' ? {} : entreeDuNoeud(suivante, noeudId)
  const entreeJournal = { etape: suivante.compteurEtapes, noeudId, type: noeud.type, nom }

  if (entree === null) {
    // Aucune donnée n'arrive : la branche qui mène à ce bloc n'a pas été prise
    suivante.etats[noeudId] = 'ignore'
    liensSortants(suivante.workflow, noeudId).forEach((lien) => { suivante.liensActifs[lien.id] = false })
    suivante.journal.push({ ...entreeJournal, statut: 'ignore', explication: `${nom} ne s'exécute pas : le chemin qui y mène n'a pas été pris.` })
  } else {
    try {
      const reponse = await bloc.executer({
        entree,
        config: cloner(noeud.config ?? {}),
        contexte: { jeu: suivante.jeu, simulateurs: suivante.simulateurs },
      })
      const donnees = reponse.donnees ?? {}
      if (tailleJson(donnees) > LIMITES.tailleDonnees) {
        throw new ErreurExecution('DONNEES_TROP_GROSSES', 'Les données produites par ce bloc sont trop volumineuses pour le simulateur.')
      }
      const sortiesActives = reponse.sortiesActives ?? bloc.sorties.map((sortie) => sortie.id)
      suivante.entrees[noeudId] = entree
      suivante.sorties[noeudId] = cloner(donnees)
      suivante.etats[noeudId] = 'ok'
      liensSortants(suivante.workflow, noeudId).forEach((lien) => {
        suivante.liensActifs[lien.id] = sortiesActives.includes(lien.sortie)
      })
      if (noeud.type === 'resultat') suivante.resultat = cloner(donnees)
      suivante.journal.push({
        ...entreeJournal,
        statut: 'ok',
        entree: noeud.type === 'declencheur' ? null : entree,
        sortie: donnees,
        sortiesActives,
        explication: reponse.explication ?? '',
      })
    } catch (exception) {
      const erreur = exception instanceof ErreurExecution
        ? { code: exception.code, message: exception.message }
        : { code: 'ERREUR_BLOC', message: 'Ce bloc n\'a pas pu s\'exécuter avec les données reçues.' }
      suivante.entrees[noeudId] = entree
      suivante.etats[noeudId] = 'erreur'
      suivante.statut = 'erreur'
      suivante.erreur = { ...erreur, noeudId }
      suivante.journal.push({ ...entreeJournal, statut: 'erreur', entree, explication: `${nom} s'arrête : ${erreur.message}`, code: erreur.code })
      return suivante
    }
  }

  suivante.index += 1
  if (suivante.index >= suivante.ordre.length) suivante.statut = 'termine'
  return suivante
}

export async function executerTout(definition, jeu, options = {}) {
  let execution = creerExecution(definition, jeu, options)
  while (!estTerminee(execution)) {
    execution = await etapeSuivante(execution, options)
  }
  return execution
}
