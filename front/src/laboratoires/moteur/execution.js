/**
 * Exécution pas à pas d'un workflow : fonctions pures, sans interface, sans réseau, sans stockage.
 *
 * `creerExecution` prépare l'état ; `etapeSuivante` exécute un bloc et renvoie un nouvel état
 * (l'ancien n'est jamais modifié). Les blocs peuvent renvoyer une promesse : un futur bloc
 * relié à un vrai service s'y branchera sans changer ce moteur.
 *
 * Statuts : 'pret' → 'en_cours' → 'termine' | 'erreur'. 'invalide' si le workflow a des erreurs.
 * 'attente_humaine' : un bloc de validation attend une décision (`repondreValidation`).
 * État d'un bloc : 'attente', 'decision' (attend une personne), 'ok', 'ignore' (branche non prise), 'erreur'.
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
    // Validation humaine : bloc en attente et décisions déjà prises
    attente: null,
    decisions: {},
    // Ce qu'ont fait les simulateurs (outils appelés, messages MCP…), dans l'ordre
    evenements: [],
    // État partagé par les blocs pendant une exécution (session MCP…) ; il disparaît ensuite
    etatSimulateurs: {},
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

export const DECISIONS_HUMAINES = ['approuver', 'refuser']

/**
 * Enregistre la décision d'une personne pour le bloc de validation en attente.
 * L'étape suivante exécute ce bloc avec la décision.
 */
export function repondreValidation(execution, noeudId, decision) {
  if (execution.statut !== 'attente_humaine' || execution.attente?.noeudId !== noeudId) return execution
  if (!DECISIONS_HUMAINES.includes(decision)) return execution
  const suivante = cloner(execution)
  suivante.decisions[noeudId] = decision
  suivante.attente = null
  suivante.statut = 'en_cours'
  return suivante
}

/**
 * `agentReel` (facultatif) : fonction async qui confie le bloc Agent à une vraie IA (LAB-08).
 * Elle vient de l'extérieur : le moteur lui-même ne fait aucun appel réseau.
 */
export async function etapeSuivante(execution, { registre = BLOCS, agentReel = null } = {}) {
  if (estTerminee(execution) || execution.statut === 'attente_humaine') return execution
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
  } else if (bloc.humain && !(noeudId in suivante.decisions)) {
    // Pause : une personne doit approuver ou refuser avant que ce bloc s'exécute
    const question = bloc.questionDe ? bloc.questionDe(noeud.config ?? {}, entree) : ''
    suivante.statut = 'attente_humaine'
    suivante.etats[noeudId] = 'decision'
    suivante.entrees[noeudId] = entree
    suivante.attente = { noeudId, nom, question, entree }
    suivante.journal.push({ ...entreeJournal, statut: 'decision', entree, explication: `${nom} attend une décision humaine${question ? ` : « ${question} »` : ''}. Approuvez ou refusez pour continuer.` })
    return suivante
  } else {
    try {
      const reponse = await bloc.executer({
        entree,
        config: cloner(noeud.config ?? {}),
        contexte: { jeu: suivante.jeu, simulateurs: suivante.simulateurs, etat: suivante.etatSimulateurs, decision: suivante.decisions[noeudId], agentReel },
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
      if (reponse.etat) suivante.etatSimulateurs = cloner(reponse.etat)
      ;(reponse.evenements ?? []).forEach((evenement) => suivante.evenements.push({ ...cloner(evenement), noeudId, etape: suivante.compteurEtapes }))
      suivante.journal.push({
        ...entreeJournal,
        statut: 'ok',
        entree: noeud.type === 'declencheur' ? null : entree,
        sortie: donnees,
        sortiesActives,
        explication: reponse.explication ?? '',
        // Étape confiée à une vraie IA (LAB-01, LAB-08) : le journal le dit
        ...(reponse.iaReelle ? { iaReelle: cloner(reponse.iaReelle) } : {}),
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

/**
 * Exécute jusqu'au bout. À une validation humaine, `decider(attente, jeu)` donne la décision ;
 * sans `decider`, l'exécution s'arrête en 'attente_humaine'.
 */
export async function executerTout(definition, jeu, options = {}) {
  return poursuivre(creerExecution(definition, jeu, options), options)
}

export async function poursuivre(execution, { decider = null, ...options } = {}) {
  let courante = execution
  while (!estTerminee(courante)) {
    if (courante.statut === 'attente_humaine') {
      if (!decider) break
      courante = repondreValidation(courante, courante.attente.noeudId, decider(courante.attente, courante.jeu))
      if (courante.statut === 'attente_humaine') break
      continue
    }
    courante = await etapeSuivante(courante, options)
  }
  return courante
}
